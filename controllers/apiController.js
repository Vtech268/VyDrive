const { VyDB, VyDBData, ApiLog } = require('../services/mongodb');
const { getVyDBByApiKey, insertToVyDB, getFromVyDB, addApiLog, isSheetsAvailable } = require('../services/googleSheets');

// ─── MongoDB fallback helpers ────────────────────────────────────────────────

async function mongoInsert(dbName, record) {
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 8);
  const doc = new VyDBData({
    dbName,
    data: { id, ...record, created_at: new Date().toISOString() }
  });
  await doc.save();
  return doc.data;
}

async function mongoGet(dbName, query = {}) {
  const docs = await VyDBData.find({ dbName, deleted: false }).sort({ createdAt: 1 });
  let records = docs.map(d => d.data);

  if (Object.keys(query).length > 0) {
    records = records.filter(r =>
      Object.entries(query).every(([key, value]) => String(r[key]) === String(value))
    );
  }

  return records;
}

async function mongoUpdate(dbName, id, newData) {
  const doc = await VyDBData.findOne({ dbName, deleted: false, 'data.id': id });
  if (!doc) return null;

  doc.data = { ...doc.data, ...newData, id, updated_at: new Date().toISOString() };
  doc.updatedAt = new Date();
  doc.markModified('data');
  await doc.save();
  return doc.data;
}

async function mongoDelete(dbName, id) {
  const result = await VyDBData.findOneAndUpdate(
    { dbName, deleted: false, 'data.id': id },
    { deleted: true, updatedAt: new Date() }
  );
  return !!result;
}

async function mongoLogApi(endpoint, method, userId, apiKey, ip, status, responseTime) {
  try {
    const log = new ApiLog({ endpoint, method, userId, apiKey, ip, status, responseTime });
    await log.save();
  } catch (err) {
    console.error('Failed to log API call to MongoDB:', err.message);
  }
}

// ─── Middleware ──────────────────────────────────────────────────────────────

async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key is required. Provide it in X-API-Key header.',
      example: { headers: { 'X-API-Key': 'your_api_key_here' } }
    });
  }

  try {
    let db = await VyDB.findOne({ apiKey });

    if (!db && isSheetsAvailable()) {
      const sheetDb = await getVyDBByApiKey(apiKey);
      if (sheetDb) {
        db = { dbName: sheetDb.db_name, apiKey: sheetDb.api_key };
      }
    }

    if (!db) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key'
      });
    }

    req.vydb = db;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate API key'
    });
  }
}

// ─── Insert ──────────────────────────────────────────────────────────────────

async function insertData(req, res) {
  const startTime = Date.now();

  try {
    const { data } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Data is required and must be an object',
        example: { data: { name: 'John', age: 25 } }
      });
    }

    const dbName = req.vydb.dbName || String(req.vydb._id);
    let result;

    if (isSheetsAvailable()) {
      result = await insertToVyDB(dbName, data);
    } else {
      result = await mongoInsert(dbName, data);
    }

    if (req.vydb._id) {
      await VyDB.findByIdAndUpdate(req.vydb._id, { $inc: { requestCount: 1 } });
    }

    const responseTime = Date.now() - startTime;
    if (isSheetsAvailable()) {
      await addApiLog('/api/insert', 'POST', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    } else {
      await mongoLogApi('/api/insert', 'POST', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    }

    res.json({ success: true, message: 'Data inserted successfully', data: result });
  } catch (error) {
    console.error('API insert error:', error);
    res.status(500).json({ success: false, message: 'Failed to insert data', error: error.message });
  }
}

// ─── Get ─────────────────────────────────────────────────────────────────────

async function getData(req, res) {
  const startTime = Date.now();

  try {
    const query = { ...req.query };
    delete query.apiKey;

    const dbName = req.vydb.dbName || String(req.vydb._id);
    let results;

    if (isSheetsAvailable()) {
      results = await getFromVyDB(dbName, query);
    } else {
      results = await mongoGet(dbName, query);
    }

    if (req.vydb._id) {
      await VyDB.findByIdAndUpdate(req.vydb._id, { $inc: { requestCount: 1 } });
    }

    const responseTime = Date.now() - startTime;
    if (isSheetsAvailable()) {
      await addApiLog('/api/get', 'GET', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    } else {
      await mongoLogApi('/api/get', 'GET', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error('API get error:', error);
    res.status(500).json({ success: false, message: 'Failed to get data', error: error.message });
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

async function updateData(req, res) {
  const startTime = Date.now();

  try {
    const { id, data } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required',
        example: { id: 'record_id', data: { name: 'Updated Name' } }
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Data is required and must be an object' });
    }

    const dbName = req.vydb.dbName || String(req.vydb._id);
    let result;

    if (isSheetsAvailable()) {
      result = await insertToVyDB(dbName, {
        ...data,
        _updated_from: id,
        _updated_at: new Date().toISOString()
      });
    } else {
      result = await mongoUpdate(dbName, id, data);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
    }

    if (req.vydb._id) {
      await VyDB.findByIdAndUpdate(req.vydb._id, { $inc: { requestCount: 1 } });
    }

    const responseTime = Date.now() - startTime;
    if (isSheetsAvailable()) {
      await addApiLog('/api/update', 'PATCH', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    } else {
      await mongoLogApi('/api/update', 'PATCH', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    }

    res.json({ success: true, message: 'Data updated successfully', data: result });
  } catch (error) {
    console.error('API update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update data', error: error.message });
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

async function deleteData(req, res) {
  const startTime = Date.now();

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required', example: { id: 'record_id' } });
    }

    const dbName = req.vydb.dbName || String(req.vydb._id);

    if (isSheetsAvailable()) {
      await insertToVyDB(dbName, {
        _deleted_id: id,
        _deleted_at: new Date().toISOString(),
        _action: 'deleted'
      });
    } else {
      const deleted = await mongoDelete(dbName, id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Record not found' });
      }
    }

    if (req.vydb._id) {
      await VyDB.findByIdAndUpdate(req.vydb._id, { $inc: { requestCount: 1 } });
    }

    const responseTime = Date.now() - startTime;
    if (isSheetsAvailable()) {
      await addApiLog('/api/delete', 'DELETE', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    } else {
      await mongoLogApi('/api/delete', 'DELETE', req.vydb.userId, req.apiKey, req.ip, 200, responseTime);
    }

    res.json({ success: true, message: 'Data deleted successfully', data: { id, deleted: true } });
  } catch (error) {
    console.error('API delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete data', error: error.message });
  }
}

// ─── Info ─────────────────────────────────────────────────────────────────────

function getApiInfo(req, res) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    success: true,
    message: 'VyDB API v1.0',
    storage: isSheetsAvailable() ? 'Google Sheets' : 'MongoDB (fallback)',
    database: req.vydb.dbName || req.vydb._id,
    endpoints: {
      insert: { method: 'POST', url: `${baseUrl}/api/insert`, headers: { 'X-API-Key': req.apiKey }, body: { data: { key: 'value' } } },
      get: { method: 'GET', url: `${baseUrl}/api/get`, headers: { 'X-API-Key': req.apiKey }, query: { key: 'value' } },
      update: { method: 'PATCH', url: `${baseUrl}/api/update`, headers: { 'X-API-Key': req.apiKey }, body: { id: 'record_id', data: { key: 'new_value' } } },
      delete: { method: 'DELETE', url: `${baseUrl}/api/delete`, headers: { 'X-API-Key': req.apiKey }, body: { id: 'record_id' } }
    }
  });
}

module.exports = {
  validateApiKey,
  insertData,
  getData,
  updateData,
  deleteData,
  getApiInfo
};
