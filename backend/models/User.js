// User Model Schema (Mongoose & Dual Adapter)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isMongoConnected } = require('../config/db');
const embeddedStore = require('../services/embeddedStore');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an organization or contact name'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['donor', 'ngo', 'admin'],
    default: 'donor'
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  donorDetails: {
    organizationType: String, // 'Marriage Hall / Banquet', 'Hostel / Campus Mess', 'Catering Service', 'Hotel / Restaurant'
    licenseNumber: String,    // FSSAI or Municipal license
    contactPerson: String,
    capacity: String
  },
  ngoDetails: {
    darpanId: String,        // NITI Aayog NGO Darpan ID
    trustRegNo: String,      // Society or Trust Registration Number
    volunteersCount: Number,
    refrigeratedVans: Number,
    servingCapacityPerDay: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compare password
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Generate JWT
UserSchema.methods.generateJWT = function() {
  return jwt.sign(
    { id: this._id, role: this.role, name: this.name, city: this.city },
    process.env.JWT_SECRET || 'annapoorna_bridge_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const MongoUser = mongoose.model('User', UserSchema);

// Hybrid Model Adapter
const UserModel = {
  find: async (query) => {
    return isMongoConnected() ? MongoUser.find(query) : embeddedStore.Users.find(query);
  },
  findOne: async (query) => {
    return isMongoConnected() ? MongoUser.findOne(query) : embeddedStore.Users.findOne(query);
  },
  findById: async (id) => {
    return isMongoConnected() ? MongoUser.findById(id) : embeddedStore.Users.findById(id);
  },
  create: async (doc) => {
    return isMongoConnected() ? MongoUser.create(doc) : embeddedStore.Users.create(doc);
  },
  findByIdAndUpdate: async (id, update) => {
    return isMongoConnected()
      ? MongoUser.findByIdAndUpdate(id, update, { new: true })
      : embeddedStore.Users.findByIdAndUpdate(id, update);
  },
  countDocuments: async (query) => {
    return isMongoConnected() ? MongoUser.countDocuments(query) : embeddedStore.Users.countDocuments(query);
  },
  comparePassword: async (candidatePassword, hash) => {
    return await bcrypt.compare(candidatePassword, hash);
  },
  generateJWT: (user) => {
    return jwt.sign(
      { id: user._id, role: user.role, name: user.name, city: user.city },
      process.env.JWT_SECRET || 'annapoorna_bridge_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }
};

module.exports = UserModel;
