const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Home page
router.get('/', indexController.getHome);

// About page
router.get('/about', indexController.getAbout);

// Pricing page
router.get('/pricing', indexController.getPricing);

// API Documentation
router.get('/api-docs', indexController.getApiDocs);

module.exports = router;
