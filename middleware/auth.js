const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — requires valid JWT Bearer token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized — no token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not found.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token is invalid or expired.' });
  }
};

// Session-based auth guard (for EJS views)
const requireSession = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user?.role}' is not authorized.`
      });
    }
    next();
  };
};

module.exports = { protect, requireSession, authorize };
