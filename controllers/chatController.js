const { Chat } = require('../services/mongodb');
const { addChatMessage, getChatMessages, markMessagesAsRead } = require('../services/googleSheets');

/**
 * Get chat page
 */
async function getChatPage(req, res) {
  try {
    const userId = req.session?.user?.id || req.session?.guestId || 'guest';
    const isAdmin = req.session?.user?.isAdmin || false;
    
    // Get messages
    let messages = [];
    
    if (isAdmin) {
      // Admin sees all messages
      messages = await Chat.find().sort({ createdAt: 1 }).limit(100);
      if (messages.length === 0) {
        messages = await getChatMessages(null, 100);
      }
    } else {
      // User sees only their messages and admin replies
      messages = await Chat.find({
        $or: [
          { userId: userId },
          { senderType: 'admin' }
        ]
      }).sort({ createdAt: 1 }).limit(50);
      
      if (messages.length === 0) {
        const allMessages = await getChatMessages(userId, 50);
        messages = allMessages;
      }
    }
    
    res.render('pages/chat', {
      title: 'Live Chat',
      messages: messages,
      userId: userId,
      isAdmin: isAdmin
    });
  } catch (error) {
    console.error('Chat page error:', error);
    res.render('pages/chat', {
      title: 'Live Chat',
      messages: [],
      userId: req.session?.user?.id || 'guest',
      isAdmin: req.session?.user?.isAdmin || false,
      error: error.message
    });
  }
}

/**
 * Get chat messages (API)
 */
async function getMessages(req, res) {
  try {
    const userId = req.session?.user?.id || req.session?.guestId || 'guest';
    const isAdmin = req.session?.user?.isAdmin || false;
    const since = req.query.since;
    
    let query = {};
    
    if (!isAdmin) {
      query = {
        $or: [
          { userId: userId },
          { senderType: 'admin' }
        ]
      };
    }
    
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }
    
    let messages = await Chat.find(query).sort({ createdAt: 1 }).limit(50);
    
    // If MongoDB empty, use Google Sheets
    if (messages.length === 0) {
      messages = await getChatMessages(isAdmin ? null : userId, 50);
      if (since) {
        const sinceDate = new Date(since);
        messages = messages.filter(m => new Date(m.created_at) > sinceDate);
      }
    }
    
    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
}

/**
 * Send message
 */
async function sendMessage(req, res) {
  try {
    const { message } = req.body;
    const userId = req.session?.user?.id || req.session?.guestId || 'guest';
    const username = req.session?.user?.username || 'Guest';
    const isAdmin = req.session?.user?.isAdmin || false;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    const senderType = isAdmin ? 'admin' : 'user';
    const sender = isAdmin ? 'Admin' : username;
    
    // Save to MongoDB
    const chatMsg = new Chat({
      sender: sender,
      senderType: senderType,
      message: message.trim(),
      userId: userId,
      isRead: false
    });
    
    await chatMsg.save();
    
    // Also save to Google Sheets
    await addChatMessage(sender, senderType, message.trim(), userId);
    
    res.json({
      success: true,
      message: 'Message sent',
      data: {
        id: chatMsg._id,
        sender: sender,
        senderType: senderType,
        message: message.trim(),
        createdAt: chatMsg.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
}

/**
 * Mark messages as read
 */
async function markAsRead(req, res) {
  try {
    const userId = req.session?.user?.id || req.session?.guestId;
    
    await Chat.updateMany(
      { userId: userId, senderType: 'admin', isRead: false },
      { isRead: true }
    );
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
}

/**
 * Get unread count
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.session?.user?.id || req.session?.guestId;
    const isAdmin = req.session?.user?.isAdmin || false;
    
    let count = 0;
    
    if (isAdmin) {
      // Admin sees unread user messages
      count = await Chat.countDocuments({ senderType: 'user', isRead: false });
    } else {
      // User sees unread admin messages
      count = await Chat.countDocuments({ userId: userId, senderType: 'admin', isRead: false });
    }
    
    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
}

module.exports = {
  getChatPage,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount
};
