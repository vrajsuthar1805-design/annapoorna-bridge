const mongoose = require('mongoose');

const foodListingSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor reference is required'],
      index: true,
    },
    foodTitle: {
      type: String,
      required: [true, 'Food listing title or description is required'],
      trim: true,
    },
    foodType: {
      type: String,
      enum: [
        'Cooked Rice & Curry',
        'Breads & Rotis',
        'Packaged / Dry Rations',
        'Sweets & Desserts',
        'Mixed Indian Buffet',
        'Breakfast / Snacks',
        'Dairy & Perishables',
        'Other',
      ],
      required: [true, 'Food category is required'],
    },
    dietaryType: {
      type: String,
      enum: ['veg', 'non-veg'],
      required: [true, 'Dietary classification (Veg or Non-Veg) is mandatory'],
    },
    quantityValue: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    quantityUnit: {
      type: String,
      enum: ['plates', 'kg', 'portions', 'packets'],
      default: 'plates',
    },
    cookedTime: {
      type: Date,
      required: [true, 'Cooked timestamp is required'],
    },
    safeUntil: {
      type: Date,
      required: [true, 'Safe consumption expiry threshold is required'],
      index: true,
    },
    storageCondition: {
      type: String,
      enum: [
        'Ambient / Room Temperature',
        'Chilled (< 5°C)',
        'Insulated / Hot Container (> 60°C)',
        'Freezer (< -18°C)',
      ],
      default: 'Ambient / Room Temperature',
      required: [true, 'Storage condition is required'],
    },
    pickupAddress: {
      type: String,
      required: [true, 'Pickup venue address is required'],
      trim: true,
    },
    pickupCity: {
      type: String,
      required: [true, 'Pickup city is required'],
      trim: true,
      index: true,
    },
    pickupLandmark: {
      type: String,
      trim: true,
      default: '',
    },
    pickupPincode: {
      type: String,
      trim: true,
      default: '',
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person at pickup venue is required'],
      trim: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    specialInstructions: {
      type: String,
      default: '',
      trim: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    safetyChecklistAccepted: {
      type: Boolean,
      required: [true, 'FSSAI Food safety compliance checklist must be accepted'],
      validate: {
        validator: function (v) {
          return v === true;
        },
        message: 'You must confirm compliance with food safety handling standards before listing food.',
      },
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'in_transit', 'delivered', 'expired'],
      default: 'available',
      index: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    volunteerDetails: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      vehicleNumber: { type: String, default: '' },
      etaMinutes: { type: Number, default: 30 },
      assignedAt: { type: Date, default: null },
    },
    pickupVerificationCode: {
      type: String,
      default: '',
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveryNotes: {
      type: String,
      default: '',
    },
    auditLogs: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updaterRole: { type: String },
        updaterName: { type: String },
        notes: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual property: calculate estimated meals served and CO2 emissions diverted
foodListingSchema.virtual('metrics').get(function () {
  let plates = this.quantityValue;
  let kg = this.quantityValue;
  if (this.quantityUnit === 'kg') {
    plates = Math.round(this.quantityValue * 2.5); // ~400g per plate
  } else if (this.quantityUnit === 'plates' || this.quantityUnit === 'portions') {
    kg = +(this.quantityValue * 0.4).toFixed(1); // 400g per plate
  }
  const co2AvoidedKg = +(kg * 2.5).toFixed(1); // 1kg food waste avoided ~ 2.5kg CO2 equivalent (FAO)
  return {
    estimatedMeals: plates,
    approxKg: kg,
    co2AvoidedKg,
  };
});

// Configure JSON serialization to include virtuals
foodListingSchema.set('toJSON', { virtuals: true });
foodListingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FoodListing', foodListingSchema);
