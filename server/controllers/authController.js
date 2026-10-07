const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'annapoorna_bridge_jwt_super_secret_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Register a new user (Donor or NGO)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      city,
      address,
      orgName,
      organizationType,
      licenseOrDarpanId,
    } = req.body;

    if (!email || !password || !name || !role || !phone || !city || !address || !orgName || !licenseOrDarpanId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are mandatory for verification and registration.',
      });
    }

    // Role safety check: Prevent self-registration as admin
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be self-registered.',
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Auto-verify donors during demo mode if desired, or set false for realism
    // To ensure demo usability while respecting verification flow:
    // We set isVerified to false by default, but let admin 1-click verify, or allow pre-verified seed accounts.
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role,
      phone,
      city,
      address,
      orgName,
      organizationType: organizationType || 'Other',
      licenseOrDarpanId,
      isVerified: false,
    });

    await AuditLog.create({
      action: 'USER_REGISTERED',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      details: {
        orgName: user.orgName,
        licenseOrDarpanId: user.licenseOrDarpanId,
        city: user.city,
      },
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Pending administrative verification.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        address: user.address,
        orgName: user.orgName,
        organizationType: user.organizationType,
        licenseOrDarpanId: user.licenseOrDarpanId,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        address: user.address,
        orgName: user.orgName,
        organizationType: user.organizationType,
        licenseOrDarpanId: user.licenseOrDarpanId,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
