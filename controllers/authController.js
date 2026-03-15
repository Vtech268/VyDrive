const { User } = require('../services/mongodb');
const { checkAdminPassword } = require('../middleware/auth');

/**
 * Get login page
 */
function getLoginPage(req, res) {
  if (req.session.user) {
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
    const config = require('../config/config.json');
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
        return res.redirect('/admin');
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
        error: 'Invalid username or password'
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
    res.redirect(returnTo);
  } catch (error) {
    console.error('Login error:', error);
    res.render('pages/login', {
      title: 'Login',
      error: 'Something went wrong. Please try again.'
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
    if (password !== confirmPassword) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if username exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('pages/register', {
        title: 'Register',
        error: 'Username or email already exists'
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

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Register error:', error);
    res.render('pages/register', {
      title: 'Register',
      error: 'Something went wrong. Please try again.'
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
