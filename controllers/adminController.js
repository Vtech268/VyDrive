const { File, User, VyDB, Chat, ApiLog } = require('../services/mongodb');
const { getSheetData, getChatMessages, getApiLogs } = require('../services/googleSheets');
const { deleteFile, isOAuthReady } = require('../services/googleDrive');

/**
 * Get admin dashboard
 */
async function getAdminDashboard(req, res) {
  try {
    // Get stats
    const stats = {
      totalFiles: await File.countDocuments(),
      totalUsers: await User.countDocuments(),
      totalDatabases: await VyDB.countDocuments(),
      totalChats: await Chat.countDocuments()
    };
    
    // Get recent files
    const recentFiles = await File.find().sort({ createdAt: -1 }).limit(10);
    
    // Get recent users
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10);
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: stats,
      recentFiles: recentFiles,
      recentUsers: recentUsers,
      driveConnected: isOAuthReady(),
      driveError: req.query.drive_error || null
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {},
      recentFiles: [],
      recentUsers: [],
      driveConnected: isOAuthReady(),
      driveError: req.query.drive_error || null,
      error: error.message
    });
  }
}

/**
 * Get all files
 */
async function getAllFiles(req, res) {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    
    res.render('admin/files', {
      title: 'Manage Files',
      files: files
    });
  } catch (error) {
    console.error('Admin files error:', error);
    res.render('admin/files', {
      title: 'Manage Files',
      files: [],
      error: error.message
    });
  }
}

/**
 * Delete file (admin)
 */
async function adminDeleteFile(req, res) {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete from Google Drive
    await deleteFile(file.googleDriveId);
    
    // Delete from MongoDB
    await File.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
}

/**
 * Get all users
 */
async function getAllUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    
    res.render('admin/users', {
      title: 'Manage Users',
      users: users
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.render('admin/users', {
      title: 'Manage Users',
      users: [],
      error: error.message
    });
  }
}

/**
 * Update user plan
 */
async function updateUserPlan(req, res) {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    
    await User.findByIdAndUpdate(id, { plan });
    
    res.json({
      success: true,
      message: 'User plan updated successfully'
    });
  } catch (error) {
    console.error('Update user plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user plan'
    });
  }
}

/**
 * Delete user
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    
    await User.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
}

/**
 * Get all VyDB databases
 */
async function getAllVyDB(req, res) {
  try {
    const databases = await VyDB.find().sort({ createdAt: -1 });
    
    res.render('admin/vydb', {
      title: 'Manage VyDB',
      databases: databases
    });
  } catch (error) {
    console.error('Admin VyDB error:', error);
    res.render('admin/vydb', {
      title: 'Manage VyDB',
      databases: [],
      error: error.message
    });
  }
}

/**
 * Delete VyDB database
 */
async function adminDeleteVyDB(req, res) {
  try {
    const { id } = req.params;
    
    await VyDB.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Database deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete VyDB error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete database'
    });
  }
}

/**
 * Get all chats
 */
async function getAllChats(req, res) {
  try {
    // Try MongoDB first
    let messages = await Chat.find().sort({ createdAt: -1 }).limit(100);
    
    // If empty, try Google Sheets
    if (messages.length === 0) {
      messages = await getChatMessages(null, 100);
    }
    
    res.render('admin/chats', {
      title: 'Manage Chats',
      messages: messages
    });
  } catch (error) {
    console.error('Admin chats error:', error);
    res.render('admin/chats', {
      title: 'Manage Chats',
      messages: [],
      error: error.message
    });
  }
}

/**
 * Get API logs
 */
async function getApiLogsPage(req, res) {
  try {
    // Try Google Sheets
    const logs = await getApiLogs(100);
    
    res.render('admin/logs', {
      title: 'API Logs',
      logs: logs
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    res.render('admin/logs', {
      title: 'API Logs',
      logs: [],
      error: error.message
    });
  }
}

/**
 * Clean expired files
 */
async function cleanExpiredFiles(req, res) {
  try {
    const now = new Date();
    const expiredFiles = await File.find({
      isPermanent: false,
      expiresAt: { $lt: now }
    });
    
    let deletedCount = 0;
    for (const file of expiredFiles) {
      try {
        await deleteFile(file.googleDriveId);
        await File.findByIdAndDelete(file._id);
        deletedCount++;
      } catch (e) {
        console.error('Error deleting expired file:', e);
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned ${deletedCount} expired files`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Clean expired files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean expired files'
    });
  }
}

function getMatchingRedirectUri(req) {
  const config = require('../config');
  const registered = (config.web && config.web.redirect_uris) || [];
  const host = req.headers['x-forwarded-host'] || req.get('host');
  // Find a registered URI that contains the current host
  const match = registered.find(uri => uri.includes(host));
  if (match) return match;
  // Fallback: build from request
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}/oauth2callback`;
}

function setupDrive(req, res) {
  const { getAuthUrl } = require('../services/googleDrive');
  const redirectUri = getMatchingRedirectUri(req);
  const authUrl = getAuthUrl(redirectUri);
  if (!authUrl) {
    return res.redirect('/admin?drive_error=oauth_not_configured');
  }
  res.redirect(authUrl);
}

module.exports = {
  getAdminDashboard,
  getAllFiles,
  adminDeleteFile,
  getAllUsers,
  updateUserPlan,
  deleteUser,
  getAllVyDB,
  adminDeleteVyDB,
  getAllChats,
  getApiLogsPage,
  cleanExpiredFiles,
  setupDrive
};
