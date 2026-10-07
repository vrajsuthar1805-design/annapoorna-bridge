const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'annapoorna_bridge_jwt_super_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Token error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired. Please sign in again.',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

const requireVerified = (req, res, next) => {
  if (req.user && !req.user.isVerified && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Account pending admin verification. Please wait for an administrator to verify your credentials.',
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  requireVerified,
};
