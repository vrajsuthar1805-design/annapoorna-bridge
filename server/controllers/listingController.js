const crypto = require('crypto');
const FoodListing = require('../models/FoodListing');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { emitEvent } = require('../services/socketService');
const {
  notifyNewListing,
  notifyListingClaimed,
  notifyStatusUpdate,
} = require('../services/notificationService');

/**
 * Generate 6-character human-friendly verification code
 */
function generateVerificationCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let code = '';
  for (let i = 0; i < 2; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

/**
 * Periodically or on-demand check and update expired listings
 */
async function markExpiredListings() {
  const now = new Date();
  const expiredListings = await FoodListing.find({
    status: 'available',
    safeUntil: { $lte: now },
  });

  for (const listing of expiredListings) {
    listing.status = 'expired';
    listing.auditLogs.push({
      status: 'expired',
      timestamp: now,
      updaterRole: 'system',
      updaterName: 'System Safety Monitor',
      notes: 'Listing passed safe consumption threshold without being claimed.',
    });
    await listing.save();

    await AuditLog.create({
      action: 'LISTING_EXPIRED',
      listingId: listing._id,
      userId: listing.donorId,
      userName: 'System Monitor',
      userRole: 'system',
      details: {
        safeUntil: listing.safeUntil,
        expiredAt: now,
      },
    });

    emitEvent('listing:expired', { listingId: listing._id });
  }
}

/**
 * @desc    Create a new surplus food listing
 * @route   POST /api/listings
 * @access  Private (Donor, Admin)
 */
const createListing = async (req, res, next) => {
  try {
    const {
      foodTitle,
      foodType,
      dietaryType,
      quantityValue,
      quantityUnit,
      cookedTime,
      safeUntil,
      safeWindowHours,
      storageCondition,
      pickupAddress,
      pickupCity,
      pickupLandmark,
      pickupPincode,
      contactPerson,
      contactPhone,
      specialInstructions,
      photoUrl,
      safetyChecklistAccepted,
    } = req.body;

    if (!safetyChecklistAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Mandatory Food Safety & FSSAI Handling checklist must be accepted before posting.',
      });
    }

    const cookedDate = cookedTime ? new Date(cookedTime) : new Date();

    // Calculate expiry: safeUntil or cookedDate + safeWindowHours (default 5 hours)
    let expiryDate;
    if (safeUntil) {
      expiryDate = new Date(safeUntil);
    } else {
      const windowHours = Number(safeWindowHours) || 5;
      expiryDate = new Date(cookedDate.getTime() + windowHours * 60 * 60 * 1000);
    }

    if (expiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Safe consumption expiry must be a future timestamp.',
      });
    }

    const listing = await FoodListing.create({
      donorId: req.user._id,
      foodTitle,
      foodType,
      dietaryType,
      quantityValue: Number(quantityValue),
      quantityUnit: quantityUnit || 'plates',
      cookedTime: cookedDate,
      safeUntil: expiryDate,
      storageCondition: storageCondition || 'Ambient / Room Temperature',
      pickupAddress: pickupAddress || req.user.address,
      pickupCity: (pickupCity || req.user.city).trim(),
      pickupLandmark: pickupLandmark || '',
      pickupPincode: pickupPincode || '',
      contactPerson: contactPerson || req.user.name,
      contactPhone: contactPhone || req.user.phone,
      specialInstructions: specialInstructions || '',
      photoUrl: photoUrl || '',
      safetyChecklistAccepted: true,
      status: 'available',
      auditLogs: [
        {
          status: 'available',
          timestamp: new Date(),
          updatedBy: req.user._id,
          updaterRole: req.user.role,
          updaterName: req.user.name,
          notes: 'Listing created and confirmed under safe handling guidelines.',
        },
      ],
    });

    // Populate donor information
    await listing.populate('donorId', 'name orgName phone city address organizationType isVerified');

    // Record system audit log
    await AuditLog.create({
      action: 'LISTING_CREATED',
      listingId: listing._id,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      details: {
        foodTitle: listing.foodTitle,
        quantity: `${listing.quantityValue} ${listing.quantityUnit}`,
        city: listing.pickupCity,
        safeUntil: listing.safeUntil,
      },
    });

    // Socket.io real-time broadcast: to specific city and globally
    emitEvent('listing:created', listing);
    emitEvent('listing:created', listing, `city:${listing.pickupCity.toLowerCase()}`);

    // Trigger notification alerts (SMS to NGOs, email to donor)
    notifyNewListing(listing, req.user);

    res.status(201).json({
      success: true,
      message: 'Surplus food listing published live! Local verified NGOs have been notified.',
      listing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active surplus food listings with filtering
 * @route   GET /api/listings
 * @access  Public / Authenticated
 */
const getListings = async (req, res, next) => {
  try {
    await markExpiredListings();

    const { city, dietaryType, foodType, status, urgentOnly } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    } else {
      // By default for the public or NGO feed, show available listings
      query.status = 'available';
    }

    if (city && city.toLowerCase() !== 'all') {
      query.pickupCity = new RegExp(`^${city.trim()}$`, 'i');
    }

    if (dietaryType && dietaryType.toLowerCase() !== 'all') {
      query.dietaryType = dietaryType.toLowerCase();
    }

    if (foodType && foodType.toLowerCase() !== 'all') {
      query.foodType = foodType;
    }

    // Urgent filter: Safe until within next 2 hours
    if (urgentOnly === 'true') {
      const twoHoursAhead = new Date(Date.now() + 2 * 60 * 60 * 1000);
      query.safeUntil = { $lte: twoHoursAhead, $gt: new Date() };
    }

    const listings = await FoodListing.find(query)
      .populate('donorId', 'name orgName phone city address organizationType isVerified')
      .populate('claimedBy', 'name orgName phone city isVerified')
      .sort({ safeUntil: 1, createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get listings created by the logged-in donor
 * @route   GET /api/listings/my-listings
 * @access  Private (Donor, Admin)
 */
const getDonorListings = async (req, res, next) => {
  try {
    await markExpiredListings();

    const listings = await FoodListing.find({ donorId: req.user._id })
      .populate('claimedBy', 'name orgName phone city organizationType isVerified')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get listings claimed by the logged-in NGO
 * @route   GET /api/listings/my-claims
 * @access  Private (NGO, Admin)
 */
const getNgoClaims = async (req, res, next) => {
  try {
    const listings = await FoodListing.find({ claimedBy: req.user._id })
      .populate('donorId', 'name orgName phone city address organizationType isVerified')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single listing details
 * @route   GET /api/listings/:id
 * @access  Public / Authenticated
 */
const getListingById = async (req, res, next) => {
  try {
    const listing = await FoodListing.findById(req.params.id)
      .populate('donorId', 'name orgName phone city address organizationType isVerified')
      .populate('claimedBy', 'name orgName phone city organizationType isVerified');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found.',
      });
    }

    res.json({
      success: true,
      listing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Claim a surplus food listing (One-Click Atomic Claim)
 * @route   POST /api/listings/:id/claim
 * @access  Private (NGO, Admin)
 */
const claimListing = async (req, res, next) => {
  try {
    const { volunteerName, volunteerPhone, vehicleNumber, etaMinutes } = req.body;

    const verificationCode = generateVerificationCode();
    const now = new Date();

    // ATOMIC UPDATE to prevent race conditions:
    // Only updates if status is currently strictly 'available' and safeUntil > now
    const claimedListing = await FoodListing.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'available',
        safeUntil: { $gt: now },
      },
      {
        $set: {
          status: 'claimed',
          claimedBy: req.user._id,
          claimedAt: now,
          pickupVerificationCode: verificationCode,
          volunteerDetails: {
            name: volunteerName || `${req.user.name} (Relief Volunteer)`,
            phone: volunteerPhone || req.user.phone,
            vehicleNumber: vehicleNumber || 'Standard Van / Two-Wheeler',
            etaMinutes: Number(etaMinutes) || 30,
            assignedAt: now,
          },
        },
        $push: {
          auditLogs: {
            status: 'claimed',
            timestamp: now,
            updatedBy: req.user._id,
            updaterRole: req.user.role,
            updaterName: req.user.name,
            notes: `Claimed by NGO "${req.user.orgName}". Volunteer assigned: ${volunteerName || req.user.name}. ETA: ${etaMinutes || 30} mins.`,
          },
        },
      },
      { new: true }
    )
      .populate('donorId', 'name orgName phone email city address organizationType isVerified')
      .populate('claimedBy', 'name orgName phone email city organizationType isVerified');

    if (!claimedListing) {
      return res.status(409).json({
        success: false,
        message: 'Batch Unavailable: This food listing has already been claimed by another NGO or has expired.',
      });
    }

    // System audit log
    await AuditLog.create({
      action: 'LISTING_CLAIMED',
      listingId: claimedListing._id,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      details: {
        ngoName: req.user.orgName,
        volunteer: claimedListing.volunteerDetails,
        verificationCode,
      },
    });

    // Real-time Socket events
    emitEvent('listing:claimed', claimedListing);
    emitEvent('listing:claimed', claimedListing, `user:${claimedListing.donorId._id}`);

    // Send notifications
    notifyListingClaimed(claimedListing, claimedListing.donorId, req.user);

    res.json({
      success: true,
      message: 'Successfully claimed surplus food! Pickup dispatch slip is generated.',
      listing: claimedListing,
      dispatchSlip: {
        slipId: `SLIP-${claimedListing._id.toString().slice(-6).toUpperCase()}`,
        foodTitle: claimedListing.foodTitle,
        quantity: `${claimedListing.quantityValue} ${claimedListing.quantityUnit}`,
        dietaryType: claimedListing.dietaryType,
        pickupAddress: claimedListing.pickupAddress,
        pickupCity: claimedListing.pickupCity,
        contactPerson: claimedListing.contactPerson,
        contactPhone: claimedListing.contactPhone,
        donorOrg: claimedListing.donorId.orgName,
        ngoOrg: req.user.orgName,
        volunteer: claimedListing.volunteerDetails,
        verificationCode,
        claimedAt: claimedListing.claimedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update listing transit status (in_transit, delivered)
 * @route   PATCH /api/listings/:id/status
 * @access  Private (NGO, Donor, Admin)
 */
const updateListingStatus = async (req, res, next) => {
  try {
    const { status, deliveryNotes, verificationCodeInput } = req.body;
    const validTransitions = ['in_transit', 'delivered', 'expired'];

    if (!validTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition. Allowed: ${validTransitions.join(', ')}`,
      });
    }

    const listing = await FoodListing.findById(req.params.id)
      .populate('donorId', 'name orgName phone email city address organizationType isVerified')
      .populate('claimedBy', 'name orgName phone email city organizationType isVerified');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found.',
      });
    }

    // Role check: Only the claimed NGO, the donor, or admin can update status
    const isClaimedNgo = listing.claimedBy && listing.claimedBy._id.toString() === req.user._id.toString();
    const isDonor = listing.donorId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isClaimedNgo && !isDonor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update the status of this listing.',
      });
    }

    // Optional verification check for delivery if code provided
    if (status === 'delivered' && verificationCodeInput) {
      if (verificationCodeInput.trim().toUpperCase() !== listing.pickupVerificationCode.trim().toUpperCase()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pickup verification code. Please confirm with the donor venue.',
        });
      }
    }

    const now = new Date();
    listing.status = status;

    if (status === 'delivered') {
      listing.deliveredAt = now;
      if (deliveryNotes) listing.deliveryNotes = deliveryNotes;
    }

    listing.auditLogs.push({
      status,
      timestamp: now,
      updatedBy: req.user._id,
      updaterRole: req.user.role,
      updaterName: req.user.name,
      notes: deliveryNotes || `Status updated to ${status.replace('_', ' ').toUpperCase()}`,
    });

    await listing.save();

    await AuditLog.create({
      action: 'STATUS_UPDATED',
      listingId: listing._id,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      details: {
        newStatus: status,
        deliveryNotes,
      },
    });

    // Real-time events
    emitEvent('listing:status_updated', listing);

    // Notifications
    notifyStatusUpdate(listing, listing.donorId, listing.claimedBy, status);

    res.json({
      success: true,
      message: `Listing status updated to ${status.replace('_', ' ').toUpperCase()}`,
      listing,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  getListings,
  getDonorListings,
  getNgoClaims,
  getListingById,
  claimListing,
  updateListingStatus,
};
