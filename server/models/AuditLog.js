const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'LISTING_CREATED',
        'LISTING_CLAIMED',
        'STATUS_UPDATED',
        'LISTING_EXPIRED',
        'USER_REGISTERED',
        'USER_VERIFIED',
        'USER_REJECTED',
        'SAFETY_FLAG_TRIGGERED',
      ],
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodListing',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userRole: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
