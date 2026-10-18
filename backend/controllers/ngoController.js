// NGO Controller (Atomic Claiming, Volunteer Assignment, Transit Updates, Dispatch Slip)

const FoodListingModel = require('../models/FoodListing');
const UserModel = require('../models/User');
const LogModel = require('../models/Log');
const { broadcastListingEvent, sendNotification } = require('../services/notificationService');

// @desc    Atomically claim a surplus food listing (NGO only, race-condition protected)
// @route   POST /api/ngo/claim/:id
// @access  Private (NGO)
const claimListing = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const {
      volunteerName,
      volunteerPhone,
      vehicleNumber,
      estimatedPickupTime
    } = req.body;

    if (!volunteerName || !volunteerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide volunteer name and contact phone for pickup dispatch.'
      });
    }

    const volunteerDetails = {
      volunteerName,
      volunteerPhone,
      vehicleNumber: vehicleNumber || 'Standard Volunteer Transport',
      estimatedPickupTime: estimatedPickupTime || 'Within 45 minutes'
    };

    // Atomic claim execution (Prevents two NGOs from claiming the exact same batch concurrently)
    const claimResult = await FoodListingModel.atomicClaim(listingId, req.user, volunteerDetails);

    if (!claimResult.success) {
      return res.status(claimResult.code || 400).json({
        success: false,
        message: claimResult.message
      });
    }

    const listing = claimResult.listing;

    // Create Audit Log
    await LogModel.create({
      listingId: listing._id,
      listingCode: listing.listingCode,
      action: 'LISTING_CLAIMED',
      fromStatus: 'available',
      toStatus: 'claimed',
      actorRole: req.user.role,
      actorName: req.user.name,
      actorId: req.user._id,
      note: `Claimed by NGO "${req.user.name}". Assigned volunteer: ${volunteerName} (${volunteerPhone})`
    });

    // Broadcast Real-time Event via Socket.io
    broadcastListingEvent('listing:claimed', {
      listingId: listing._id,
      listingCode: listing.listingCode,
      claimedBy: listing.claimedBy,
      volunteerDetails: listing.volunteerDetails,
      status: 'claimed',
      city: listing.city
    });

    // Send Simulated SMS to Donor with Volunteer info and OTP
    const donor = await UserModel.findById(listing.donorId);
    if (donor) {
      await sendNotification({
        type: 'CLAIM_CONFIRMED',
        recipient: donor,
        title: `Food Batch Claimed! (${listing.listingCode})`,
        message: `Your listing "${listing.foodTitle}" has been claimed by ${req.user.name}. Volunteer: ${volunteerName} (${volunteerPhone}). Handoff OTP: ${listing.pickupOtp}.`,
        data: { listingId: listing._id, pickupOtp: listing.pickupOtp }
      });
    }

    // Send Simulated SMS to NGO Volunteer
    await sendNotification({
      type: 'DISPATCH_ASSIGNMENT',
      recipient: { phone: volunteerPhone, name: volunteerName, email: req.user.email },
      title: 'Pickup Dispatch Assignment',
      message: `Pickup ${listing.estimatedQuantityKg}kg food from ${listing.pickupAddress} (${listing.contactPerson}: ${listing.contactPhone}). Handoff OTP: ${listing.pickupOtp}.`,
      data: { listingId: listing._id }
    });

    res.status(200).json({
      success: true,
      message: `Batch successfully claimed! Pickup dispatch slip generated for ${listing.foodTitle}.`,
      listing
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update transit status (claimed -> in_transit -> delivered)
// @route   PUT /api/ngo/status/:id
// @access  Private (NGO or Admin)
const updateTransitStatus = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const { status, note, deliveryLocation, verifiedOtp } = req.body;

    if (!['in_transit', 'delivered'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status can only be transitioned to "in_transit" or "delivered".'
      });
    }

    const listing = await FoodListingModel.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Food listing not found.' });
    }

    // Ensure only the claiming NGO (or Admin) can update status
    if (listing.claimedBy && listing.claimedBy._id !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the NGO that claimed this listing can update its transit status.'
      });
    }

    const fromStatus = listing.status;

    // Optional OTP verification upon pickup
    if (status === 'in_transit' && verifiedOtp && verifiedOtp !== listing.pickupOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Handoff OTP. Please confirm with donor.'
      });
    }

    const updatedLogs = [
      ...(listing.statusLogs || []),
      {
        status,
        timestamp: new Date().toISOString(),
        updatedBy: req.user.name,
        note: note || `Status updated to ${status.replace('_', ' ').toUpperCase()} by ${req.user.name}`
      }
    ];

    const updated = await FoodListingModel.findByIdAndUpdate(listingId, {
      status,
      deliveryLocation: deliveryLocation || listing.deliveryLocation,
      statusLogs: updatedLogs
    });

    // Create Audit Log
    await LogModel.create({
      listingId: listing._id,
      listingCode: listing.listingCode,
      action: status === 'in_transit' ? 'TRANSIT_STARTED' : 'FOOD_DELIVERED',
      fromStatus,
      toStatus: status,
      actorRole: req.user.role,
      actorName: req.user.name,
      actorId: req.user._id,
      note: note || (status === 'delivered' ? `Delivered to beneficiaries. Rescued ${listing.estimatedQuantityKg}kg.` : 'Pickup completed, in transit.')
    });

    // Real-Time Socket.io Broadcast
    broadcastListingEvent('listing:status_updated', {
      listingId: listing._id,
      listingCode: listing.listingCode,
      status,
      updatedBy: req.user.name,
      city: listing.city
    });

    // Notify Donor
    const donor = await UserModel.findById(listing.donorId);
    if (donor) {
      const msg = status === 'in_transit'
        ? `Volunteer has picked up food from your venue. Batch ${listing.listingCode} is in transit!`
        : `🎉 Congratulations! Food batch ${listing.listingCode} was safely delivered to community kitchens/beneficiaries. Thank you for zero waste!`;
      await sendNotification({
        type: 'STATUS_UPDATE',
        recipient: donor,
        title: `Status: ${status.toUpperCase()} (${listing.listingCode})`,
        message: msg,
        data: { listingId: listing._id, status }
      });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status.replace('_', ' ').toUpperCase()}`,
      listing: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all listings claimed by current NGO
// @route   GET /api/ngo/claimed
// @access  Private (NGO)
const getClaimedListings = async (req, res, next) => {
  try {
    const allListings = await FoodListingModel.find({});
    const myClaimed = allListings.filter(l => l.claimedBy && (l.claimedBy._id === req.user._id || l.claimedBy._id === req.user._id.toString()));

    myClaimed.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    res.status(200).json({
      success: true,
      count: myClaimed.length,
      listings: myClaimed
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get printable Digital Dispatch Slip for a claimed listing
// @route   GET /api/ngo/dispatch-slip/:id
// @access  Private (NGO, Donor, Admin)
const getDispatchSlip = async (req, res, next) => {
  try {
    const listing = await FoodListingModel.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    const donor = await UserModel.findById(listing.donorId);

    const slip = {
      slipNumber: `DISPATCH-${listing.listingCode}`,
      generatedAt: new Date().toISOString(),
      listing: {
        code: listing.listingCode,
        title: listing.foodTitle,
        category: listing.foodType,
        dietary: listing.dietaryType,
        quantityKg: listing.estimatedQuantityKg,
        plates: listing.estimatedPlates,
        storageCondition: listing.storageCondition,
        cookedTime: listing.cookedTime,
        safeUntil: listing.safeUntil
      },
      donor: {
        venueName: donor ? donor.name : listing.donorName,
        contactPerson: listing.contactPerson,
        phone: listing.contactPhone,
        address: listing.pickupAddress,
        city: listing.city,
        license: donor && donor.donorDetails ? donor.donorDetails.licenseNumber : 'Verified Donor'
      },
      ngo: {
        organizationName: listing.claimedBy ? listing.claimedBy.name : req.user.name,
        contactPhone: listing.claimedBy ? listing.claimedBy.phone : req.user.phone,
        darpanId: listing.claimedBy && listing.claimedBy.darpanId ? listing.claimedBy.darpanId : 'Darpan Verified'
      },
      volunteer: listing.volunteerDetails || {
        volunteerName: 'Assigned Courier',
        volunteerPhone: 'N/A',
        vehicleNumber: 'Standard Transport',
        estimatedPickupTime: 'Immediate'
      },
      pickupOtp: listing.pickupOtp,
      safetyChecklistAccepted: listing.safetyChecklistAccepted,
      fssaiGuidelinesSummary: [
        'Maintain hot food above 60°C; do not store at ambient temperature beyond 4 hours.',
        'Keep transport vehicle clean, covered, and shielded from direct sunlight.',
        'Distribute to beneficiaries immediately upon reaching destination point.'
      ]
    };

    res.status(200).json({
      success: true,
      dispatchSlip: slip
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  claimListing,
  updateTransitStatus,
  getClaimedListings,
  getDispatchSlip
};
