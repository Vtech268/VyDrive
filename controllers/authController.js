const { User } = require('../services/mongodb');
const { checkAdminPassword } = require('../middleware/auth');

/**
 * Get login page
 */
function getLoginPage(req, res) {
  if (req.session.user) {
    if (req.session.user.isAdmin) return res.redirect('/admin');
    return res.redirect('/dashboard');
  }
  
  res.render('pages/login', {
    title: 'Login',
    error: null
  });
}

/**
 * Get register page
 */
function getRegisterPage(req, res) {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('pages/register', {
    title: 'Register',
    error: null
  });
}

/**
 * Handle login
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;
    const config = require('../config');
    const adminUsername = config.admin_username || 'admin';

    // Check if admin login (by username match)
    if (username === adminUsername) {
      if (checkAdminPassword(password)) {
        req.session.user = {
          id: 'admin',
          username: adminUsername,
          isAdmin: true,
          plan: 'paid'
        };
        // Simpan session dulu sebelum redirect (penting untuk Vercel / serverless)
        return req.session.save((err) => {
          if (err) console.error('Session save error:', err);
          res.redirect('/admin');
        });
      } else {
        return res.render('pages/login', {
          title: 'Login',
          error: 'Username atau password salah'
        });
      }
    }

    // Regular user login
    const user = await User.findOne({ username });
    
    if (!user || user.password !== password) {
      return res.render('pages/login', {
        title: 'Login',
        error: 'Username atau password salah'
      });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      plan: user.plan,
      isAdmin: false
    };

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;

    // Simpan session sebelum redirect
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.redirect(returnTo);
    });
  } catch (error) {
    console.error('Login error:', error);
    res.render('pages/login', {
      title: 'Login',
      error: 'Terjadi kesalahan. Silakan coba lagi.'
    });
  }
}

/**
 * Handle register
 */
async function register(req, res) {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Semua kolom harus diisi'
      });
    }

    if (password !== confirmPassword) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Password tidak cocok'
      });
    }

    if (password.length < 6) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Password minimal 6 karakter'
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Username atau email sudah digunakan'
      });
    }

    // Generate API key
    const apiKey = 'vydb_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Create user
    const user = new User({
      username,
      email,
      password,
      plan: 'free',
      apiKey
    });

    await user.save();

    // Auto login
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      plan: user.plan,
      isAdmin: false
    };

    // Simpan session sebelum redirect
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Register error:', error);
    res.render('pages/register', {
      title: 'Register',
      error: 'Terjadi kesalahan. Silakan coba lagi.'
    });
  }
}

/**
 * Handle logout
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

/**
 * Get guest session
 */
function getGuestSession(req, res) {
  if (!req.session.guestId) {
    req.session.guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
  }
  
  res.json({
    success: true,
    guestId: req.session.guestId
  });
}

module.exports = {
  getLoginPage,
  getRegisterPage,
  login,
  register,
  logout,
  getGuestSession
};
