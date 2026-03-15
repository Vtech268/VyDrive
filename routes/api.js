const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Apply API key validation to all routes
router.use(apiController.validateApiKey);

// API Info
router.get('/', apiController.getApiInfo);

// Insert data
router.post('/insert', apiController.insertData);

// Get data
router.get('/get', apiController.getData);

// Update data
router.patch('/update', apiController.updateData);

// Delete data
router.delete('/delete', apiController.deleteData);

module.exports = router;
