const path = require('path');
const fs = require('fs');
const { File } = require('../services/mongodb');
const { uploadFile, deleteFile, getDirectUrl, getPreviewUrl } = require('../services/googleDrive');
const config = require('../config');

/**
 * Upload page
 */
function getUploadPage(req, res) {
  res.render('pages/upload', {
    title: 'Upload File',
    plans: config.plans
  });
}

/**
 * Handle file upload
 */
async function uploadFileHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { expiresIn = '7' } = req.body;
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const size = req.file.size;

    // Generate short filename
    const shortName = path.basename(req.file.filename);

    // Calculate expiry date
    let expiresAt;
    let isPermanent = false;
    
    if (expiresIn === '0') {
      isPermanent = true;
      expiresAt = new Date('2099-12-31');
    } else {
      const days = parseInt(expiresIn);
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    // Upload to Google Drive
    const driveResult = await uploadFile(filePath, originalName, mimeType);

    // Save to MongoDB
    const fileDoc = new File({
      filename: shortName,
      originalName: originalName,
      mimeType: mimeType,
      size: size,
      googleDriveId: driveResult.id,
      downloadUrl: driveResult.directLink,
      userId: req.session?.user?.id || req.session?.guestId || 'guest',
      userType: req.session?.user ? 'registered' : 'guest',
      plan: req.session?.user?.plan || 'free',
      expiresAt: expiresAt,
      isPermanent: isPermanent
    });

    await fileDoc.save();

    // Delete local file
    fs.unlinkSync(filePath);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: shortName,
        originalName: originalName,
        size: size,
        mimeType: mimeType,
        viewUrl: `${baseUrl}/file/${shortName}`,
        downloadUrl: `${baseUrl}/file/${shortName}/download`,
        directUrl: driveResult.directLink,
        expiresAt: expiresAt,
        isPermanent: isPermanent
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up local file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error.message
    });
  }
}

/**
 * Show upload result
 */
async function getUploadResult(req, res) {
  try {
    const { filename } = req.params;
    const file = await File.findOne({ filename });

    if (!file) {
      return res.status(404).render('pages/error', {
        title: 'File Not Found',
        message: 'The file you are looking for does not exist or has expired.',
        error: {}
      });
    }

    // Check if expired
    if (!file.isPermanent && new Date() > file.expiresAt) {
      return res.status(404).render('pages/error', {
        title: 'File Expired',
        message: 'This file has expired and is no longer available.',
        error: {}
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.render('pages/upload-result', {
      title: 'Upload Success',
      file: file,
      viewUrl: `${baseUrl}/file/${filename}`,
      downloadUrl: `${baseUrl}/file/${filename}/download`,
      directUrl: file.downloadUrl
    });
  } catch (error) {
    console.error('Get upload result error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Something went wrong.',
      error: error
    });
  }
}

/**
 * Preview file
 */
async function previewFile(req, res) {
  try {
    const { filename } = req.params;
    const file = await File.findOne({ filename });

    if (!file) {
      return res.status(404).render('pages/error', {
        title: 'File Not Found',
        message: 'The file you are looking for does not exist or has expired.',
        error: {}
      });
    }

    // Check if expired
    if (!file.isPermanent && new Date() > file.expiresAt) {
      return res.status(404).render('pages/error', {
        title: 'File Expired',
        message: 'This file has expired and is no longer available.',
        error: {}
      });
    }

    // Increment views
    file.views += 1;
    await file.save();

    const isImage = file.mimeType.startsWith('image/');
    const isVideo = file.mimeType.startsWith('video/');
    const isAudio = file.mimeType.startsWith('audio/');
    const isPDF = file.mimeType === 'application/pdf';

    res.render('pages/preview', {
      title: file.originalName,
      file: file,
      isImage: isImage,
      isVideo: isVideo,
      isAudio: isAudio,
      isPDF: isPDF,
      previewUrl: getPreviewUrl(file.googleDriveId),
      directUrl: file.downloadUrl
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Something went wrong.',
      error: error
    });
  }
}

/**
 * Download file
 */
async function downloadFile(req, res) {
  try {
    const { filename } = req.params;
    const file = await File.findOne({ filename });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if expired
    if (!file.isPermanent && new Date() > file.expiresAt) {
      return res.status(404).json({
        success: false,
        message: 'File has expired'
      });
    }

    // Increment downloads
    file.downloads += 1;
    await file.save();

    // Redirect to Google Drive direct link
    res.redirect(file.downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
}

/**
 * Delete file
 */
async function deleteFileHandler(req, res) {
  try {
    const { filename } = req.params;
    const file = await File.findOne({ filename });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permission
    const userId = req.session?.user?.id;
    const isOwner = file.userId === userId || file.userId === req.session?.guestId;
    const isAdmin = req.session?.user?.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this file'
      });
    }

    // Delete from Google Drive
    await deleteFile(file.googleDriveId);

    // Delete from MongoDB
    await File.deleteOne({ filename });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
}

/**
 * Get user files
 */
async function getUserFiles(req, res) {
  try {
    const userId = req.session?.user?.id || req.session?.guestId;
    const files = await File.find({ userId }).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get files'
    });
  }
}

module.exports = {
  getUploadPage,
  uploadFileHandler,
  getUploadResult,
  previewFile,
  downloadFile,
  deleteFileHandler,
  getUserFiles
};
