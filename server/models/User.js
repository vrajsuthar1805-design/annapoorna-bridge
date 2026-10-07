const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: {
        values: ['donor', 'ngo', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'donor',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Operating city is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Physical address is required'],
      trim: true,
    },
    orgName: {
      type: String,
      required: [true, 'Organization or Venue name is required'],
      trim: true,
    },
    organizationType: {
      type: String,
      enum: [
        'Marriage Hall',
        'Hotel / Restaurant',
        'Hostel / Educational Institution',
        'Event / Catering Service',
        'Corporate Cafeteria',
        'Food Relief NGO',
        'Community Kitchen',
        'Religious Institution / Langar',
        'Other',
      ],
      default: 'Other',
    },
    licenseOrDarpanId: {
      type: String,
      required: [true, 'Registration / License ID is required (FSSAI/GST for Donors, Darpan/Trust ID for NGOs)'],
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    verificationNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Password comparison method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Hash password before saving if modified
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Remove sensitive fields from JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
