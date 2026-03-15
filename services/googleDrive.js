const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function getConfig() {
  delete require.cache[require.resolve('../config/config.json')];
  return require('../config/config.json');
}

// Vercel filesystem is read-only — use /tmp for temporary storage
const IS_VERCEL = !!(process.env.VERCEL || process.env.NOW_REGION);
const MOCK_STORAGE_DIR = IS_VERCEL
  ? '/tmp/mock-drive'
  : path.join(__dirname, '..', 'public', 'mock-drive');

try {
  if (!fs.existsSync(MOCK_STORAGE_DIR)) {
    fs.mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[WARN] Could not create mock-drive dir:', e.message);
}

const mockFiles = new Map();

function getOAuth2Client() {
  const config = getConfig();
  const clientId = config.web && config.web.client_id;
  const clientSecret = config.web && config.web.client_secret;
  if (!clientId || !clientSecret) return null;
  return new google.auth.OAuth2(clientId, clientSecret);
}

function getDriveClient() {
  const config = getConfig();

  // Prefer OAuth2 user credentials (refresh token) — uses personal Drive quota
  if (config.DRIVE_REFRESH_TOKEN) {
    try {
      const oauth2Client = getOAuth2Client();
      if (oauth2Client) {
        oauth2Client.setCredentials({ refresh_token: config.DRIVE_REFRESH_TOKEN });
        return google.drive({ version: 'v3', auth: oauth2Client });
      }
    } catch (e) {
      console.error('OAuth2 Drive init failed:', e.message);
    }
  }

  // Fallback: service account
  if (config.GOOGLE_PRIVATE_KEY && config.GOOGLE_CLIENT_EMAIL) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: config.GOOGLE_PROJECT_ID,
          private_key_id: config.GOOGLE_PRIVATE_KEY_ID,
          private_key: config.GOOGLE_PRIVATE_KEY,
          client_email: config.GOOGLE_CLIENT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/drive']
      });
      return google.drive({ version: 'v3', auth });
    } catch (e) {
      console.error('Service account Drive init failed:', e.message);
    }
  }

  return null;
}

function isOAuthReady() {
  const config = getConfig();
  return !!config.DRIVE_REFRESH_TOKEN;
}

function getAuthUrl(redirectUri) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
    redirect_uri: redirectUri
  });
}

async function exchangeCodeForToken(code, redirectUri) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) throw new Error('OAuth2 client not configured');
  const { tokens } = await oauth2Client.getToken({ code, redirect_uri: redirectUri });
  return tokens;
}

function saveRefreshToken(refreshToken) {
  if (IS_VERCEL) {
    // On Vercel, filesystem is read-only — log only, token can't be persisted
    console.log('[VERCEL] saveRefreshToken: filesystem is read-only, token not persisted.');
    return;
  }
  const configPath = path.join(__dirname, '..', 'config', 'config.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.DRIVE_REFRESH_TOKEN = refreshToken;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.warn('[WARN] saveRefreshToken failed:', e.message);
  }
}

async function storeFileMock(filePath, fileName, mimeType) {
  try {
    if (!fs.existsSync(MOCK_STORAGE_DIR)) {
      fs.mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('[WARN] storeFileMock mkdir failed:', e.message);
  }
  const fileId = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  const mockPath = path.join(MOCK_STORAGE_DIR, fileId);
  fs.copyFileSync(filePath, mockPath);
  const stats = fs.statSync(mockPath);
  const mockData = {
    id: fileId,
    name: fileName,
    webViewLink: `/mock-drive/${fileId}`,
    webContentLink: `/mock-drive/${fileId}`,
    directLink: `/mock-drive/${fileId}`,
    mimeType,
    size: stats.size,
    mockPath
  };
  mockFiles.set(fileId, mockData);
  return {
    id: fileId,
    name: fileName,
    webViewLink: mockData.webViewLink,
    webContentLink: mockData.webContentLink,
    directLink: mockData.directLink
  };
}

async function uploadFile(filePath, fileName, mimeType) {
  const config = getConfig();
  const drive = getDriveClient();

  if (!drive) {
    console.log('[LOCAL] No Drive client, storing locally:', fileName);
    return storeFileMock(filePath, fileName, mimeType);
  }

  try {
    const fileMetadata = {
      name: fileName,
      parents: config.GOOGLE_DRIVE_FOLDER_ID ? [config.GOOGLE_DRIVE_FOLDER_ID] : undefined
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    });

    console.log('[DRIVE] File uploaded:', fileName);
    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      directLink: `https://drive.google.com/uc?export=download&id=${response.data.id}`
    };
  } catch (error) {
    console.error('Google Drive upload error:', error.message);
    console.log('[FALLBACK] Storing locally:', fileName);
    return storeFileMock(filePath, fileName, mimeType);
  }
}

async function deleteFile(fileId) {
  try {
    if (fileId.startsWith('mock_')) {
      const mockData = mockFiles.get(fileId);
      if (mockData && fs.existsSync(mockData.mockPath)) {
        fs.unlinkSync(mockData.mockPath);
      }
      mockFiles.delete(fileId);
      return true;
    }
    const drive = getDriveClient();
    if (!drive) return false;
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('Google Drive delete error:', error.message);
    return false;
  }
}

async function getFileInfo(fileId) {
  try {
    if (fileId.startsWith('mock_')) {
      return mockFiles.get(fileId) || null;
    }
    const drive = getDriveClient();
    if (!drive) return null;
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink'
    });
    return response.data;
  } catch (error) {
    console.error('Google Drive get file error:', error.message);
    return null;
  }
}

function getDirectUrl(fileId) {
  if (fileId.startsWith('mock_')) return `/mock-drive/${fileId}`;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function getPreviewUrl(fileId) {
  if (fileId.startsWith('mock_')) return `/mock-drive/${fileId}`;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

const USE_MOCK_DRIVE = false;

module.exports = {
  uploadFile,
  deleteFile,
  getFileInfo,
  getDirectUrl,
  getPreviewUrl,
  getAuthUrl,
  exchangeCodeForToken,
  saveRefreshToken,
  isOAuthReady,
  USE_MOCK_DRIVE
};
