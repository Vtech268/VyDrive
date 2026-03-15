const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(requireAuth);

// Dashboard home
router.get('/', dashboardController.getDashboard);

// My files
router.get('/files', dashboardController.getMyFiles);

// VyDB Dashboard
router.get('/vydb', dashboardController.getVyDBDashboard);

// Create VyDB
router.post('/vydb/create', dashboardController.createVyDB);

// Delete VyDB
router.delete('/vydb/:id', dashboardController.deleteVyDB);

// Profile
router.get('/profile', dashboardController.getProfile);

// Update profile
router.post('/profile', dashboardController.updateProfile);

module.exports = router;
