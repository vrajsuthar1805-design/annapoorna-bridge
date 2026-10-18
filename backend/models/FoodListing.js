// FoodListing Model Schema (Mongoose & Dual Adapter with Race-Condition Mutex)

const mongoose = require('mongoose');
const { isMongoConnected } = require('../config/db');
const embeddedStore = require('../services/embeddedStore');

const StatusLogSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['available', 'claimed', 'in_transit', 'delivered', 'expired']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: String,
  note: String
});

const FoodListingSchema = new mongoose.Schema({
  listingCode: {
    type: String,
    unique: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorName: String,
  donorPhone: String,
  foodTitle: {
    type: String,
    required: [true, 'Food title is required'],
    trim: true
  },
  foodType: {
    type: String,
    required: [true, 'Food category/type is required']
  },
  dietaryType: {
    type: String,
    enum: ['Veg', 'Non-Veg'],
    required: true,
    default: 'Veg'
  },
  estimatedQuantityKg: {
    type: Number,
    required: [true, 'Estimated quantity in kg is required'],
    min: [1, 'Quantity must be at least 1 kg']
  },
  estimatedPlates: {
    type: Number,
    required: [true, 'Estimated plates count is required'],
    min: [1, 'Estimated plates must be at least 1']
  },
  itemDescription: {
    type: String,
    required: [true, 'Item description is required']
  },
  cookedTime: {
    type: Date,
    required: [true, 'Preparation / cooked time is required']
  },
  safeUntil: {
    type: Date,
    required: [true, 'Safe consumption window timestamp is required']
  },
  storageCondition: {
    type: String,
    required: true,
    default: 'Ambient Clean Covered Trays'
  },
  city: {
    type: String,
    required: true
  },
  pickupAddress: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'in_transit', 'delivered', 'expired'],
    default: 'available'
  },
  claimedBy: {
    _id: String,
    name: String,
    phone: String,
    email: String,
    darpanId: String
  },
  volunteerDetails: {
    volunteerName: String,
    volunteerPhone: String,
    vehicleNumber: String,
    estimatedPickupTime: String
  },
  safetyChecklistAccepted: {
    type: Boolean,
    required: true,
    default: false
  },
  pickupOtp: {
    type: String,
    default: () => Math.floor(1000 + Math.random() * 9000).toString()
  },
  imageUrl: {
    type: String,
    default: ''
  },
  statusLogs: [StatusLogSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const MongoFoodListing = mongoose.model('FoodListing', FoodListingSchema);

// Hybrid Model Adapter
const FoodListingModel = {
  find: async (query = {}, options = {}) => {
    if (isMongoConnected()) {
      let q = MongoFoodListing.find(query);
      if (options.sort) q = q.sort(options.sort);
      return await q.exec();
    }
    const results = await embeddedStore.Listings.find(query);
    if (options.sort && options.sort.createdAt === -1) {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return results;
  },
  findOne: async (query) => {
    return isMongoConnected() ? MongoFoodListing.findOne(query) : embeddedStore.Listings.findOne(query);
  },
  findById: async (id) => {
    return isMongoConnected() ? MongoFoodListing.findById(id) : embeddedStore.Listings.findById(id);
  },
  create: async (doc) => {
    if (isMongoConnected()) {
      const count = await MongoFoodListing.countDocuments();
      const code = `AB-${new Date().getFullYear()}-${doc.city ? doc.city.substring(0, 3).toUpperCase() : 'IND'}-${String(count + 1).padStart(2, '0')}`;
      return await MongoFoodListing.create({
        ...doc,
        listingCode: code,
        statusLogs: [{
          status: 'available',
          timestamp: new Date(),
          updatedBy: doc.donorName || 'Donor',
          note: 'Surplus food listing published to network'
        }]
      });
    }
    return await embeddedStore.Listings.create(doc);
  },
  // Atomic Claim preventing any race conditions between two concurrent NGO requests
  atomicClaim: async (listingId, ngoUser, volunteerDetails) => {
    if (isMongoConnected()) {
      const listingDoc = await MongoFoodListing.findById(listingId);
      if (!listingDoc) {
        return { success: false, code: 404, message: 'Listing not found.' };
      }

      const now = Date.now();
      const cookedTime = new Date(listingDoc.cookedTime).getTime();
      const ageHours = (now - cookedTime) / (3600 * 1000);
      const safeTime = new Date(listingDoc.safeUntil).getTime();

      // STRICT 4-HOUR RULE: NGO cannot accept food if older than 4 hours or past safeUntil
      if (ageHours > 4.0 || now >= safeTime) {
        await MongoFoodListing.findByIdAndUpdate(listingId, { status: 'expired' });
        return {
          success: false,
          code: 400,
          message: 'This food request cannot be accepted. The food was cooked more than 4 hours ago and has expired under the 4-hour freshness rule.'
        };
      }

      const updated = await MongoFoodListing.findOneAndUpdate(
        { _id: listingId, status: 'available' },
        {
          $set: {
            status: 'claimed',
            claimedBy: {
              _id: ngoUser._id.toString(),
              name: ngoUser.name,
              phone: ngoUser.phone,
              email: ngoUser.email,
              darpanId: ngoUser.ngoDetails ? ngoUser.ngoDetails.darpanId : 'Verified'
            },
            volunteerDetails,
            updatedAt: new Date()
          },
          $push: {
            statusLogs: {
              status: 'claimed',
              timestamp: new Date(),
              updatedBy: ngoUser.name,
              note: `Claimed by ${ngoUser.name}. Volunteer ${volunteerDetails.volunteerName} assigned.`
            }
          }
        },
        { new: true }
      );
      if (!updated) {
        return {
          success: false,
          code: 409,
          message: 'Listing is no longer available or has already been claimed by another NGO.'
        };
      }
      return { success: true, listing: updated };
    }
    return await embeddedStore.Listings.atomicClaim(listingId, ngoUser, volunteerDetails);
  },
  findByIdAndUpdate: async (id, update) => {
    if (isMongoConnected()) {
      return await MongoFoodListing.findByIdAndUpdate(id, update, { new: true });
    }
    return await embeddedStore.Listings.findByIdAndUpdate(id, update);
  },
  countDocuments: async (query = {}) => {
    return isMongoConnected() ? MongoFoodListing.countDocuments(query) : embeddedStore.Listings.countDocuments(query);
  }
};

module.exports = FoodListingModel;
