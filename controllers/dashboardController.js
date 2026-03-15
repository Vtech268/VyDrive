const { File, User, VyDB } = require('../services/mongodb');
const { getSheetData } = require('../services/googleSheets');
const config = require('../config/config.json');

function isAdminUser(req) {
  return req.session.user && req.session.user.isAdmin;
}

/**
 * Get dashboard
 */
async function getDashboard(req, res) {
  if (isAdminUser(req)) {
    return res.redirect('/admin');
  }
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);

    const files = await File.find({ userId: userId.toString() }).sort({ createdAt: -1 }).limit(10);
    const totalFiles = await File.countDocuments({ userId: userId.toString() });
    const vydbList = await VyDB.find({ userId: userId.toString() });

    res.render('dashboard/index', {
      title: 'Dashboard',
      user: user || req.session.user,
      files,
      totalFiles,
      vydbList,
      plans: config.plans
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard/index', {
      title: 'Dashboard',
      user: req.session.user,
      files: [],
      totalFiles: 0,
      vydbList: [],
      plans: config.plans,
      error: 'Failed to load dashboard data'
    });
  }
}

/**
 * Get user files
 */
async function getMyFiles(req, res) {
  if (isAdminUser(req)) return res.redirect('/admin/files');
  try {
    const userId = req.session.user.id;
    const files = await File.find({ userId: userId.toString() }).sort({ createdAt: -1 });

    res.render('dashboard/files', {
      title: 'My Files',
      files
    });
  } catch (error) {
    console.error('My files error:', error);
    res.render('dashboard/files', {
      title: 'My Files',
      files: [],
      error: 'Failed to load files'
    });
  }
}

/**
 * Get VyDB dashboard
 */
async function getVyDBDashboard(req, res) {
  if (isAdminUser(req)) return res.redirect('/admin/vydb');
  try {
    const userId = req.session.user.id;
    const databases = await VyDB.find({ userId: userId.toString() }).sort({ createdAt: -1 });

    res.render('dashboard/vydb', {
      title: 'VyDB - Database API',
      databases,
      baseUrl: `${req.protocol}://${req.get('host')}`
    });
  } catch (error) {
    console.error('VyDB dashboard error:', error);
    res.render('dashboard/vydb', {
      title: 'VyDB - Database API',
      databases: [],
      baseUrl: `${req.protocol}://${req.get('host')}`,
      error: 'Failed to load databases'
    });
  }
}

/**
 * Create new VyDB database
 */
async function createVyDB(req, res) {
  if (isAdminUser(req)) {
    return res.status(403).json({ success: false, message: 'Admin cannot create user databases' });
  }
  try {
    const { dbName } = req.body;
    const userId = req.session.user.id;

    if (!dbName || dbName.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Database name must be at least 3 characters' });
    }

    const existing = await VyDB.findOne({ userId: userId.toString(), dbName });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Database with this name already exists' });
    }

    const apiKey = 'vydb_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const vydb = new VyDB({
      userId: userId.toString(),
      dbName: dbName.trim(),
      apiKey,
      sheetId: config.GOOGLE_SHEET_ID,
      requestCount: 0
    });

    await vydb.save();

    res.json({
      success: true,
      message: 'Database created successfully',
      data: { id: vydb._id, dbName: vydb.dbName, apiKey: vydb.apiKey }
    });
  } catch (error) {
    console.error('Create VyDB error:', error);
    res.status(500).json({ success: false, message: 'Failed to create database' });
  }
}

/**
 * Delete VyDB database
 */
async function deleteVyDB(req, res) {
  if (isAdminUser(req)) {
    return res.status(403).json({ success: false, message: 'Use admin panel to delete databases' });
  }
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const result = await VyDB.deleteOne({ _id: id, userId: userId.toString() });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Database not found' });
    }

    res.json({ success: true, message: 'Database deleted successfully' });
  } catch (error) {
    console.error('Delete VyDB error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete database' });
  }
}

/**
 * Get profile page
 */
async function getProfile(req, res) {
  if (isAdminUser(req)) {
    return res.render('dashboard/profile', {
      title: 'Admin Profile',
      user: {
        username: req.session.user.username,
        email: 'admin@vydrive.local',
        plan: 'paid',
        isAdmin: true,
        apiKey: 'N/A (Admin Account)'
      },
      apiKey: 'N/A'
    });
  }
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);

    res.render('dashboard/profile', {
      title: 'Profile',
      user: user || req.session.user,
      apiKey: user ? user.apiKey : ''
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.render('dashboard/profile', {
      title: 'Profile',
      user: req.session.user,
      apiKey: ''
    });
  }
}

/**
 * Update profile
 */
async function updateProfile(req, res) {
  if (isAdminUser(req)) {
    return res.json({ success: false, message: 'Cannot update admin profile this way' });
  }
  try {
    const { email } = req.body;
    const userId = req.session.user.id;

    await User.findByIdAndUpdate(userId, { email });
    req.session.user.email = email;

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

module.exports = {
  getDashboard,
  getMyFiles,
  getVyDBDashboard,
  createVyDB,
  deleteVyDB,
  getProfile,
  updateProfile
};
