const config = require('../config');

/**
 * Check if user is logged in
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
}

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  
  res.status(403).render('pages/error', {
    title: 'Access Denied',
    message: 'You do not have permission to access this page.',
    error: {}
  });
}

/**
 * Check admin password
 */
function checkAdminPassword(password) {
  return password === config.admin_password;
}

/**
 * Set guest user if not logged in
 */
function setGuestUser(req, res, next) {
  if (!req.session.user) {
    req.session.guestId = req.session.guestId || 'guest_' + Math.random().toString(36).substring(2, 15);
    req.guestUser = {
      id: req.session.guestId,
      type: 'guest',
      plan: 'free'
    };
  }
  next();
}

/**
 * API Key authentication middleware
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'API Key is required. Provide it in X-API-Key header or apiKey parameter.' 
    });
  }
  
  req.apiKey = apiKey;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  checkAdminPassword,
  setGuestUser,
  requireApiKey
};
