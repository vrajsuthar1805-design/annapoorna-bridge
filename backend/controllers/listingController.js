// Food Listing Controller (Create, View, Filter, Expiry Management)

const FoodListingModel = require('../models/FoodListing');
const UserModel = require('../models/User');
const LogModel = require('../models/Log');
const { broadcastListingEvent, sendNotification } = require('../services/notificationService');
const { DEFAULT_SAFE_HOURS, URGENT_THRESHOLD_HOURS } = require('../config/constants');

// @desc    Create a new surplus food listing (Donor only)
// @route   POST /api/listings
// @access  Private (Donor)
const createListing = async (req, res, next) => {
  try {
    const {
      foodTitle,
      foodType,
      dietaryType = 'Veg',
      estimatedQuantityKg,
      estimatedPlates,
      itemDescription,
      cookedTime,
      safeHoursDuration,
      storageCondition,
      pickupAddress,
      contactPerson,
      contactPhone,
      city,
      imageUrl,
      safetyChecklistAccepted
    } = req.body;

    // FSSAI Compliance Enforcement: Donor must accept food safety handling declaration
    if (!safetyChecklistAccepted) {
      return res.status(400).json({
        success: false,
        message: 'FSSAI Compliance Violation: You must accept the food safety & hygiene checklist before posting surplus food.'
      });
    }

    if (!foodTitle || !foodType || !estimatedQuantityKg || !estimatedPlates || !cookedTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide food title, category, quantity in kg, estimated plates, and cooked timestamp.'
      });
    }

    const prepTime = new Date(cookedTime);
    const now = new Date();

    // Preparation time cannot be in the future
    if (prepTime.getTime() > now.getTime() + 60000) {
      return res.status(400).json({
        success: false,
        message: 'Cooked time cannot be in the future. Please specify the actual time the food was prepared.'
      });
    }

    const ageHours = (now.getTime() - prepTime.getTime()) / (3600 * 1000);

    // STRICT 4-HOUR RULE: Food cooked more than 4 hours ago cannot be posted
    if (ageHours > 4.0) {
      return res.status(400).json({
        success: false,
        message: `Disallowed: Food was cooked ${ageHours.toFixed(1)} hours ago (more than 4 hours). Under food safety rules, food older than 4 hours cannot be posted or redistributed.`
      });
    }

    // Safe consumption window is strictly 4 hours from cooking time
    const safeUntilTime = new Date(prepTime.getTime() + 4 * 3600 * 1000);

    // If safeUntil has already passed
    if (safeUntilTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'The 4-hour safe consumption window has expired. Food older than 4 hours cannot be redistributed.'
      });
    }

    const newListing = await FoodListingModel.create({
      donorId: req.user._id,
      donorName: req.user.name,
      donorPhone: req.user.phone,
      foodTitle,
      foodType,
      dietaryType,
      estimatedQuantityKg: Number(estimatedQuantityKg),
      estimatedPlates: Number(estimatedPlates),
      itemDescription,
      cookedTime: prepTime.toISOString(),
      safeUntil: safeUntilTime.toISOString(),
      storageCondition: storageCondition || 'Ambient Clean Covered Trays',
      pickupAddress: pickupAddress || req.user.address,
      contactPerson: contactPerson || req.user.name,
      contactPhone: contactPhone || req.user.phone,
      city: city || req.user.city,
      imageUrl: imageUrl || '',
      safetyChecklistAccepted: true
    });

    // Create Audit Log
    await LogModel.create({
      listingId: newListing._id,
      listingCode: newListing.listingCode,
      action: 'LISTING_POSTED',
      fromStatus: null,
      toStatus: 'available',
      actorRole: req.user.role,
      actorName: req.user.name,
      actorId: req.user._id,
      note: `Published ${newListing.estimatedQuantityKg}kg (${newListing.estimatedPlates} plates) of ${newListing.foodTitle}`
    });

    // Real-Time Socket.io Broadcast to all NGOs
    broadcastListingEvent('listing:created', newListing);

    // Notify registered NGOs in the city via SMS/Email Stub
    const cityNgos = await UserModel.find({ role: 'ngo', city: newListing.city });
    for (const ngo of cityNgos) {
      await sendNotification({
        type: 'SURPLUS_ALERT',
        recipient: ngo,
        title: `Surplus Food Alert (${newListing.city})`,
        message: `${newListing.foodTitle} (${newListing.estimatedPlates} plates / ${newListing.estimatedQuantityKg} kg) available at ${newListing.pickupAddress}.`,
        data: { listingId: newListing._id, listingCode: newListing.listingCode }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Surplus food listing published to real-time redistribution network!',
      listing: newListing
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all listings with filtering, urgent calculation, and auto-expiry
// @route   GET /api/listings
// @access  Public
const getListings = async (req, res, next) => {
  try {
    const { city, dietaryType, status, foodType, urgentOnly } = req.query;
    const query = {};

    if (city && city !== 'all') query.city = city;
    if (dietaryType && dietaryType !== 'all') query.dietaryType = dietaryType;
    if (foodType && foodType !== 'all') query.foodType = foodType;
    if (status && status !== 'all') query.status = status;

    const allListings = await FoodListingModel.find(query, { sort: { createdAt: -1 } });
    const now = Date.now();

    // Process countdown and auto-expire available listings past safeUntil
    const enrichedListings = [];
    for (const item of allListings) {
      const safeTime = new Date(item.safeUntil).getTime();
      const remainingMs = safeTime - now;
      const remainingMinutes = Math.floor(remainingMs / (60 * 1000));

      let currentStatus = item.status;
      // Auto-expire available listings if safe time passed
      if (currentStatus === 'available' && remainingMs <= 0) {
        currentStatus = 'expired';
        await FoodListingModel.findByIdAndUpdate(item._id, { status: 'expired' });
        await LogModel.create({
          listingId: item._id,
          listingCode: item.listingCode,
          action: 'LISTING_EXPIRED',
          fromStatus: 'available',
          toStatus: 'expired',
          actorRole: 'system',
          actorName: 'Automated Expiry Sentinel',
          note: 'Safe consumption window lapsed.'
        });
      }

      const isUrgent = currentStatus === 'available' && remainingMinutes > 0 && remainingMinutes <= (URGENT_THRESHOLD_HOURS * 60);

      if (urgentOnly === 'true' && !isUrgent) {
        continue;
      }

      enrichedListings.push({
        ...item,
        status: currentStatus,
        remainingMinutes: Math.max(0, remainingMinutes),
        isUrgent
      });
    }

    res.status(200).json({
      success: true,
      count: enrichedListings.length,
      listings: enrichedListings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single listing by ID
// @route   GET /api/listings/:id
// @access  Public
const getListingById = async (req, res, next) => {
  try {
    const listing = await FoodListingModel.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found.'
      });
    }

    const safeTime = new Date(listing.safeUntil).getTime();
    const remainingMinutes = Math.max(0, Math.floor((safeTime - Date.now()) / (60 * 1000)));

    res.status(200).json({
      success: true,
      listing: {
        ...listing,
        remainingMinutes,
        isUrgent: listing.status === 'available' && remainingMinutes <= (URGENT_THRESHOLD_HOURS * 60)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get donor's own postings
// @route   GET /api/listings/my/postings
// @access  Private (Donor)
const getMyListings = async (req, res, next) => {
  try {
    const listings = await FoodListingModel.find({ donorId: req.user._id });
    const now = Date.now();

    const formatted = listings.map(item => {
      const safeTime = new Date(item.safeUntil).getTime();
      const remainingMinutes = Math.max(0, Math.floor((safeTime - now) / (60 * 1000)));
      return {
        ...item,
        remainingMinutes,
        isUrgent: item.status === 'available' && remainingMinutes <= (URGENT_THRESHOLD_HOURS * 60)
      };
    });

    formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: formatted.length,
      listings: formatted
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel an un-claimed listing
// @route   PUT /api/listings/:id/cancel
// @access  Private (Donor or Admin)
const cancelListing = async (req, res, next) => {
  try {
    const listing = await FoodListingModel.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    if (listing.donorId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this listing.' });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel listing because it is already ${listing.status}.`
      });
    }

    const updated = await FoodListingModel.findByIdAndUpdate(listing._id, {
      status: 'expired',
      statusLogs: [
        ...(listing.statusLogs || []),
        {
          status: 'expired',
          timestamp: new Date().toISOString(),
          updatedBy: req.user.name,
          note: 'Cancelled by donor.'
        }
      ]
    });

    await LogModel.create({
      listingId: listing._id,
      listingCode: listing.listingCode,
      action: 'LISTING_CANCELLED',
      fromStatus: 'available',
      toStatus: 'expired',
      actorRole: req.user.role,
      actorName: req.user.name,
      note: 'Listing cancelled by donor'
    });

    broadcastListingEvent('listing:status_updated', {
      listingId: listing._id,
      status: 'expired',
      listingCode: listing.listingCode
    });

    res.status(200).json({
      success: true,
      message: 'Listing cancelled successfully.',
      listing: updated
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  cancelListing
};
