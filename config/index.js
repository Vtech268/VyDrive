const base = require('./config.json');

const config = {
  ...base,
  web: {
    ...base.web,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    project_id: process.env.GOOGLE_PROJECT_ID || '',
    redirect_uris: [
      ...(base.web.redirect_uris || []),
      ...(process.env.OAUTH_REDIRECT_URI ? [process.env.OAUTH_REDIRECT_URI] : [])
    ]
  },
  GOOGLE_PRIVATE_KEY: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || '',
  GOOGLE_PRIVATE_KEY_ID: process.env.GOOGLE_PRIVATE_KEY_ID || '',
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || '',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  DRIVE_REFRESH_TOKEN: process.env.DRIVE_REFRESH_TOKEN || '',
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_URI_FALLBACK: process.env.MONGODB_URI_FALLBACK || '',
  admin_username: process.env.ADMIN_USERNAME || 'admin',
  admin_password: process.env.ADMIN_PASSWORD || '',
  app: {
    ...base.app,
    session_secret: process.env.SESSION_SECRET || ''
  }
};

if (!config.app.session_secret) {
  console.warn('⚠️  SESSION_SECRET is not set. Using an insecure default. Set SESSION_SECRET in your environment secrets.');
  config.app.session_secret = 'change_me_set_SESSION_SECRET_env_var';
}

if (!config.admin_password) {
  console.warn('⚠️  ADMIN_PASSWORD is not set. Admin login will be disabled.');
}

module.exports = config;
