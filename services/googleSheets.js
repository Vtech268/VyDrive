const { google } = require('googleapis');
const config = require('../config');

let sheetsAvailable = false;
let initAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

// Errors that are permanent/fatal — retrying won't help
const FATAL_ERROR_PATTERNS = [
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
  'Invalid JWT Signature',
  'invalid_jwt',
  'INVALID_ARGUMENT',
  'The caller does not have permission'
];

// Setup Google Auth
let auth, sheets;
try {
  auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: config.GOOGLE_PROJECT_ID,
      private_key_id: config.GOOGLE_PRIVATE_KEY_ID,
      private_key: config.GOOGLE_PRIVATE_KEY,
      client_email: config.GOOGLE_CLIENT_EMAIL,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  sheets = google.sheets({ version: 'v4', auth });
} catch (err) {
  console.error('❌ Failed to setup Google Auth:', err.message);
}

// Default sheets yang harus ada
const DEFAULT_SHEETS = ['users', 'data', 'chat', 'api_logs', 'vydb'];

/**
 * Inisialisasi Google Sheets - auto create sheets jika belum ada
 */
async function initGoogleSheets() {
  if (!sheets) {
    console.log('⚠️ Google Sheets client not initialized, skipping');
    sheetsAvailable = false;
    return false;
  }

  try {
    if (!config.GOOGLE_SHEET_ID) {
      console.log('⚠️ GOOGLE_SHEET_ID not configured, skipping sheets initialization');
      sheetsAvailable = false;
      return false;
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.GOOGLE_SHEET_ID
    });

    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('📊 Existing sheets:', existingSheets);

    for (const sheetName of DEFAULT_SHEETS) {
      if (!existingSheets.includes(sheetName)) {
        await createSheet(sheetName);
        await initializeSheetHeaders(sheetName);
      }
    }

    sheetsAvailable = true;
    initAttempts = 0;
    console.log('✅ Google Sheets ready');
    return true;
  } catch (error) {
    sheetsAvailable = false;
    const errMsg = error.message || '';

    const isFatal = FATAL_ERROR_PATTERNS.some(p => errMsg.includes(p));

    if (isFatal) {
      console.warn('⚠️ Google Sheets credentials invalid — using MongoDB as fallback. (Update GOOGLE_PRIVATE_KEY/GOOGLE_CLIENT_EMAIL to re-enable)');
      return false;
    }

    console.error('❌ Google Sheets initialization error:', errMsg);

    if (errMsg.includes('has not been used') || errMsg.includes('disabled')) {
      console.error('💡 Fix: Enable Google Sheets API at https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=' + config.GOOGLE_PROJECT_ID);
    }

    if (initAttempts < MAX_RETRY_ATTEMPTS) {
      initAttempts++;
      console.log(`🔄 Retrying Sheets init in ${RETRY_DELAY_MS / 1000}s... (attempt ${initAttempts}/${MAX_RETRY_ATTEMPTS})`);
      setTimeout(() => initGoogleSheets(), RETRY_DELAY_MS * initAttempts);
    } else {
      console.log('⚡ All retry attempts exhausted — using MongoDB as fallback storage.');
    }

    return false;
  }
}

/**
 * Check if sheets is available
 */
function isSheetsAvailable() {
  return sheetsAvailable;
}

/**
 * Create new sheet
 */
async function createSheet(sheetName) {
  if (!sheetsAvailable && !sheets) return false;
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: sheetName }
          }
        }]
      }
    });
    console.log(`✅ Created sheet: ${sheetName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating sheet ${sheetName}:`, error.message);
    return false;
  }
}

/**
 * Initialize sheet headers
 */
async function initializeSheetHeaders(sheetName) {
  const headers = {
    users: ['id', 'username', 'email', 'plan', 'api_key', 'created_at', 'storage_used', 'files_count'],
    data: ['id', 'db_name', 'api_key', 'data_json', 'created_at', 'updated_at'],
    chat: ['id', 'sender', 'sender_type', 'message', 'user_id', 'is_read', 'created_at'],
    api_logs: ['id', 'endpoint', 'method', 'user_id', 'api_key', 'ip', 'status', 'response_time', 'created_at'],
    vydb: ['id', 'user_id', 'db_name', 'api_key', 'sheet_id', 'request_count', 'created_at']
  };

  if (headers[sheetName]) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.GOOGLE_SHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers[sheetName]]
        }
      });
    } catch (error) {
      console.error(`❌ Error initializing headers for ${sheetName}:`, error.message);
    }
  }
}

/**
 * Append data to sheet
 */
async function appendToSheet(sheetName, data) {
  if (!sheetsAvailable || !sheets) return false;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [data] }
    });
    return true;
  } catch (error) {
    console.error(`❌ Error appending to ${sheetName}:`, error.message);
    return false;
  }
}

/**
 * Get all data from sheet
 */
async function getSheetData(sheetName) {
  if (!sheetsAvailable || !sheets) return [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:Z`
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let value = row[index] || '';
        if (header === 'data_json' && value) {
          try { value = JSON.parse(value); } catch (e) {}
        }
        obj[header] = value;
      });
      return obj;
    });
  } catch (error) {
    console.error(`❌ Error getting data from ${sheetName}:`, error.message);
    return [];
  }
}

/**
 * Update row in sheet
 */
async function updateSheetRow(sheetName, rowIndex, data) {
  if (!sheetsAvailable || !sheets) return false;
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: `${sheetName}!A${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [data] }
    });
    return true;
  } catch (error) {
    console.error(`❌ Error updating row in ${sheetName}:`, error.message);
    return false;
  }
}

/**
 * Delete row from sheet
 */
async function deleteSheetRow(sheetName, rowIndex) {
  if (!sheetsAvailable || !sheets) return false;
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetId(sheetName),
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });
    return true;
  } catch (error) {
    console.error(`❌ Error deleting row from ${sheetName}:`, error.message);
    return false;
  }
}

/**
 * Get sheet ID by name
 */
async function getSheetId(sheetName) {
  if (!sheets) return null;
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.GOOGLE_SHEET_ID
    });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
  } catch (error) {
    return null;
  }
}

/**
 * Create new VyDB database
 */
async function createVyDB(userId, dbName) {
  const apiKey = generateApiKey();
  const sheetId = config.GOOGLE_SHEET_ID;
  const id = Date.now().toString();

  if (sheetsAvailable) {
    await appendToSheet('vydb', [
      id, userId, dbName, apiKey, sheetId, '0', new Date().toISOString()
    ]);
  }

  return { id, apiKey, dbName };
}

/**
 * Get VyDB by API Key
 */
async function getVyDBByApiKey(apiKey) {
  if (!sheetsAvailable) return null;
  const data = await getSheetData('vydb');
  return data.find(db => db.api_key === apiKey) || null;
}

/**
 * Insert data to VyDB
 */
async function insertToVyDB(dbId, record) {
  const id = Date.now().toString();
  const dataJson = JSON.stringify({ id, ...record, created_at: new Date().toISOString() });

  if (sheetsAvailable) {
    await appendToSheet('data', [
      id, dbId, '', dataJson, new Date().toISOString(), new Date().toISOString()
    ]);
  }

  return { id, ...record };
}

/**
 * Get data from VyDB
 */
async function getFromVyDB(dbId, query = {}) {
  if (!sheetsAvailable) return [];
  const data = await getSheetData('data');
  let records = data.filter(d => d.db_name === dbId || d.db_name === '');

  records = records.map(r => {
    try { return JSON.parse(r.data_json || '{}'); } catch { return r; }
  });

  if (Object.keys(query).length > 0) {
    records = records.filter(r => {
      return Object.entries(query).every(([key, value]) => r[key] == value);
    });
  }

  return records;
}

/**
 * Add chat message
 */
async function addChatMessage(sender, senderType, message, userId = 'guest') {
  const id = Date.now().toString();
  if (sheetsAvailable) {
    await appendToSheet('chat', [
      id, sender, senderType, message, userId, 'false', new Date().toISOString()
    ]);
  }
  return { id, sender, senderType, message, userId, created_at: new Date().toISOString() };
}

/**
 * Get chat messages
 */
async function getChatMessages(userId = null, limit = 50) {
  if (!sheetsAvailable) return [];
  const data = await getSheetData('chat');
  let messages = data;
  if (userId) {
    messages = messages.filter(m => m.user_id === userId || m.sender_type === 'admin');
  }
  return messages.slice(-limit);
}

/**
 * Mark messages as read
 */
async function markMessagesAsRead(userId) {
  return true;
}

/**
 * Add API log
 */
async function addApiLog(endpoint, method, userId, apiKey, ip, status, responseTime) {
  if (!sheetsAvailable) return;
  const id = Date.now().toString();
  await appendToSheet('api_logs', [
    id, endpoint, method, userId || '', apiKey || '',
    ip || '', status.toString(), responseTime.toString(), new Date().toISOString()
  ]);
}

/**
 * Get API logs
 */
async function getApiLogs(limit = 100) {
  if (!sheetsAvailable) return [];
  const data = await getSheetData('api_logs');
  return data.slice(-limit).reverse();
}

/**
 * Generate random API key
 */
function generateApiKey() {
  return 'vydb_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = {
  initGoogleSheets,
  isSheetsAvailable,
  createSheet,
  appendToSheet,
  getSheetData,
  updateSheetRow,
  deleteSheetRow,
  createVyDB,
  getVyDBByApiKey,
  insertToVyDB,
  getFromVyDB,
  addChatMessage,
  getChatMessages,
  markMessagesAsRead,
  addApiLog,
  getApiLogs,
  sheets
};
