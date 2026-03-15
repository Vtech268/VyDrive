const config = require('../config');

/**
 * Home page
 */
function getHome(req, res) {
  res.render('pages/home', {
    title: 'Home',
    description: 'Free file hosting and database API platform'
  });
}

/**
 * About page
 */
function getAbout(req, res) {
  res.render('pages/about', {
    title: 'About',
    description: 'About VyDrive Cloud'
  });
}

/**
 * Pricing page
 */
function getPricing(req, res) {
  res.render('pages/pricing', {
    title: 'Pricing',
    plans: config.plans
  });
}

/**
 * API Documentation page
 */
function getApiDocs(req, res) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.render('pages/api-docs', {
    title: 'API Documentation',
    baseUrl: baseUrl
  });
}

module.exports = {
  getHome,
  getAbout,
  getPricing,
  getApiDocs
};
