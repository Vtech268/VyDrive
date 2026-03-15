const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Login page
router.get('/login', authController.getLoginPage);

// Register page
router.get('/register', authController.getRegisterPage);

// Handle login
router.post('/login', authController.login);

// Handle register
router.post('/register', authController.register);

// Logout
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

// Get guest session
router.get('/guest', authController.getGuestSession);

module.exports = router;
