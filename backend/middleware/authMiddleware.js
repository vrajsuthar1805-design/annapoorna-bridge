// JWT Authentication & RBAC Authorization Middleware

const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No authorization token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'annapoorna_bridge_jwt_secret');
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user ? req.user.role : 'unauthenticated'}' does not have permission to access this resource.`
      });
    }
    next();
  };
};

const requireVerified = (req, res, next) => {
  if (req.user && !req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account pending administrative verification. Please wait for an administrator to verify your credentials.'
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  requireVerified
};
