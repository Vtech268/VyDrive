const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Di Vercel, filesystem read-only kecuali /tmp
// Gunakan /tmp/uploads sebagai fallback
let uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  uploadsDir = path.join('/tmp', 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (e2) {
    console.warn('⚠️  Could not create uploads dir:', e2.message);
  }
}

// Storage configuration - gunakan memory storage agar kompatibel dengan Vercel serverless
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const plan = req.session?.user?.plan || 'free';
  const allowedTypes = config.plans[plan]?.allowed_types || ['*'];
  
  if (allowedTypes.includes('*')) {
    cb(null, true);
  } else {
    const isAllowed = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.mimetype.startsWith(type.replace('/*', ''));
      }
      return file.mimetype === type;
    });
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.plans.paid.max_file_size // Default to max (paid plan)
  }
});

// Middleware to check file size limit based on plan
function checkFileSizeLimit(req, res, next) {
  const plan = req.session?.user?.plan || 'free';
  const maxSize = config.plans[plan]?.max_file_size || config.plans.free.max_file_size;
  
  // Override limit untuk request ini
  const uploadWithLimit = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: maxSize
    }
  });
  
  uploadWithLimit.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size for ${plan} plan is ${formatBytes(maxSize)}`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Generate short filename
function generateShortFilename(originalName) {
  const ext = path.extname(originalName);
  const randomName = Math.random().toString(36).substring(2, 10);
  return randomName + ext;
}

module.exports = {
  upload,
  checkFileSizeLimit,
  generateShortFilename,
  formatBytes
};
