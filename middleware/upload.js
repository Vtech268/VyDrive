const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config.json');

// Vercel serverless has a read-only filesystem except /tmp
// Use /tmp for uploads in production (Vercel), local public/uploads in dev
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadsDir = isServerless
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate random filename (8 karakter)
    const randomName = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(file.originalname);
    cb(null, randomName + ext);
  }
});

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
