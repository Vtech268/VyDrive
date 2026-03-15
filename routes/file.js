const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { setGuestUser } = require('../middleware/auth');
const { checkFileSizeLimit } = require('../middleware/upload');

// Upload page
router.get('/upload', setGuestUser, fileController.getUploadPage);

// Handle upload
router.post('/upload', setGuestUser, checkFileSizeLimit, fileController.uploadFileHandler);

// Upload result page
router.get('/result/:filename', fileController.getUploadResult);

// Preview file
router.get('/:filename', fileController.previewFile);

// Download file
router.get('/:filename/download', fileController.downloadFile);

// Delete file
router.delete('/:filename', fileController.deleteFileHandler);

// Get user files (API)
router.get('/api/my-files', fileController.getUserFiles);

module.exports = router;
