// Authentication Controller (Register, Login, Profile)

const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');

// @desc    Register a new user (Donor or NGO)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'donor',
      phone,
      city,
      address,
      donorDetails,
      ngoDetails
    } = req.body;

    if (!name || !email || !password || !phone || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory fields: name, email, password, phone, city, address.'
      });
    }

    // Check if user already exists
    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.'
      });
    }

    // Role-specific verification defaults:
    // For demo convenience, sample users can be verified; new users can auto-verify or start pending
    const isVerified = role === 'admin';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      phone,
      city,
      address,
      isVerified,
      donorDetails: role === 'donor' ? donorDetails || {} : undefined,
      ngoDetails: role === 'ngo' ? ngoDetails || {} : undefined
    });

    const token = UserModel.generateJWT(newUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        city: newUser.city,
        address: newUser.address,
        isVerified: newUser.isVerified,
        donorDetails: newUser.donorDetails,
        ngoDetails: newUser.ngoDetails
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await UserModel.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = UserModel.generateJWT(user);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        address: user.address,
        isVerified: user.isVerified,
        donorDetails: user.donorDetails,
        ngoDetails: user.ngoDetails
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
        address: user.address,
        isVerified: user.isVerified,
        donorDetails: user.donorDetails,
        ngoDetails: user.ngoDetails
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe
};
