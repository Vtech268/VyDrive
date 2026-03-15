const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { setGuestUser } = require('../middleware/auth');

// Apply guest user middleware
router.use(setGuestUser);

// Chat page
router.get('/', chatController.getChatPage);

// Get messages (API)
router.get('/messages', chatController.getMessages);

// Send message
router.post('/send', chatController.sendMessage);

// Mark as read
router.post('/read', chatController.markAsRead);

// Get unread count
router.get('/unread', chatController.getUnreadCount);

module.exports = router;
