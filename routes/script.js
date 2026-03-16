const express = require('express');
const router = express.Router();
const { setGuestUser } = require('../middleware/auth');
const { dynamicSave, dynamicRead, getExistingSheetNames, isSheetsAvailable } = require('../services/googleSheets');

router.get('/upload', setGuestUser, (req, res) => {
  res.render('pages/upload-script', { title: 'Upload Script' });
});

/**
 * POST /script/upload
 * Body: { _sheet: "nama_sheet", ...field bebas user }
 * Auto-creates the sheet tab + columns if not exist.
 */
router.post('/upload', setGuestUser, async (req, res) => {
  try {
    const { _sheet, ...data } = req.body;

    const sheetName = (_sheet || 'scripts').trim();
    if (!sheetName) return res.status(400).json({ success: false, message: 'Nama sheet (_sheet) wajib diisi.' });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'Data tidak boleh kosong.' });
    }

    if (!isSheetsAvailable()) {
      return res.status(503).json({ success: false, message: 'Google Sheets belum tersedia, coba lagi sebentar.' });
    }

    const result = await dynamicSave(sheetName, data);
    return res.json({ success: true, sheet: sheetName, data: result });
  } catch (err) {
    console.error('Dynamic save error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /script/data/:sheet
 * Ambil semua data dari sheet tertentu
 */
router.get('/data/:sheet', setGuestUser, async (req, res) => {
  try {
    if (!isSheetsAvailable()) {
      return res.status(503).json({ success: false, message: 'Google Sheets tidak tersedia.' });
    }
    const rows = await dynamicRead(req.params.sheet);
    return res.json({ success: true, sheet: req.params.sheet, total: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /script/sheets
 * List semua sheet yang ada di spreadsheet
 */
router.get('/sheets', setGuestUser, async (req, res) => {
  try {
    if (!isSheetsAvailable()) {
      return res.status(503).json({ success: false, message: 'Google Sheets tidak tersedia.' });
    }
    const names = await getExistingSheetNames();
    return res.json({ success: true, total: names.length, sheets: names });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
