const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(requireAdmin);

// Admin dashboard
router.get('/', adminController.getAdminDashboard);

// Files management
router.get('/files', adminController.getAllFiles);
router.delete('/files/:id', adminController.adminDeleteFile);

// Users management
router.get('/users', adminController.getAllUsers);
router.post('/users/:id/plan', adminController.updateUserPlan);
router.delete('/users/:id', adminController.deleteUser);

// VyDB management
router.get('/vydb', adminController.getAllVyDB);
router.delete('/vydb/:id', adminController.adminDeleteVyDB);

// Chat management
router.get('/chats', adminController.getAllChats);

// API Logs
router.get('/logs', adminController.getApiLogsPage);

// Clean expired files
router.post('/clean-expired', adminController.cleanExpiredFiles);

// Google Drive OAuth setup
router.get('/setup-drive', adminController.setupDrive);

module.exports = router;
