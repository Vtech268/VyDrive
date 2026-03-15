const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const engine = require('ejs-mate');
const config = require('./config/config.json');

// Import routes
const indexRoutes = require('./routes/index');
const fileRoutes = require('./routes/file');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');

// Import services
const { initMongoDB } = require('./services/mongodb');
const { initGoogleSheets } = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session middleware
app.use(session({
  secret: config.app.session_secret,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files - PENTING: Express static middleware
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files from /tmp/uploads on serverless (Vercel), or public/uploads locally
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (isServerless) {
  app.use('/uploads', express.static('/tmp/uploads'));
}

// Favicon fallback
app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));
app.get('/favicon.png', (req, res) => res.redirect(301, '/favicon.svg'));

// Always serve mock-drive folder (used as fallback storage)
app.use('/mock-drive', express.static(path.join(__dirname, 'public', 'mock-drive')));

// Global middleware untuk set user dan config di locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.config = config;
  res.locals.currentPath = req.path;
  res.locals.appName = config.app.name;
  res.locals.appVersion = config.app.version;
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/file', fileRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/chat', chatRoutes);

// Google Drive OAuth callback
const { exchangeCodeForToken, saveRefreshToken } = require('./services/googleDrive');
app.get('/oauth2callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect('/admin?drive_error=' + encodeURIComponent(error));
  }
  if (!code) {
    return res.redirect('/admin?drive_error=no_code');
  }
  try {
    const registered = (config.web && config.web.redirect_uris) || [];
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = registered.find(uri => uri.includes(host))
      || `https://${host}/oauth2callback`;
    const tokens = await exchangeCodeForToken(code, redirectUri);
    if (tokens.refresh_token) {
      saveRefreshToken(tokens.refresh_token);
      res.redirect('/admin?drive_connected=1');
    } else {
      res.redirect('/admin?drive_error=no_refresh_token');
    }
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.redirect('/admin?drive_error=' + encodeURIComponent(err.message));
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500);
  res.render('pages/error', {
    title: 'Error',
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: {}
  });
});

// Initialize services
async function initServices() {
  try {
    await initMongoDB();
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚡ App running without MongoDB - some features may be unavailable');
  }

  initGoogleSheets().then(ok => {
    if (ok) {
      console.log('✅ Google Sheets ready');
    } else {
      console.log('⚠️ Google Sheets unavailable - using MongoDB as fallback data store');
    }
  }).catch(err => {
    console.error('❌ Google Sheets init error:', err.message);
  });
}

// In serverless (Vercel), just initialize services without listening
// In local/traditional server, listen on port
if (process.env.VERCEL || process.env.NOW_REGION) {
  initServices();
} else {
  initServices().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 VyDrive Cloud v${config.app.version} running on port ${PORT}`);
      console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
    });
  });
}

module.exports = app;
