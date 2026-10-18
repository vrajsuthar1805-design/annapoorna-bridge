// Admin Controller (Verifications, System Audit Logs, Platform Governance)

const UserModel = require('../models/User');
const LogModel = require('../models/Log');
const FoodListingModel = require('../models/FoodListing');
const { sendNotification } = require('../services/notificationService');

// @desc    Get all registered users with filter by role and verification status
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, isVerified } = req.query;
    const query = {};
    if (role && role !== 'all') query.role = role;
    if (isVerified !== undefined && isVerified !== 'all') {
      query.isVerified = isVerified === 'true';
    }

    const users = await UserModel.find(query);
    const sanitized = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      city: u.city,
      address: u.address,
      isVerified: u.isVerified,
      donorDetails: u.donorDetails,
      ngoDetails: u.ngoDetails,
      createdAt: u.createdAt
    }));

    res.status(200).json({
      success: true,
      count: sanitized.length,
      users: sanitized
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify or toggle verification for a Donor or NGO
// @route   PUT /api/admin/users/:id/verify
// @access  Private (Admin)
const verifyUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { isVerified = true } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updated = await UserModel.findByIdAndUpdate(userId, { isVerified: Boolean(isVerified) });

    // Send Notification
    await sendNotification({
      type: 'VERIFICATION_UPDATE',
      recipient: updated,
      title: 'Verification Status Updated',
      message: isVerified
        ? `Congratulations! Your ${updated.role.toUpperCase()} account has been officially verified by the Annapoorna Bridge platform administration.`
        : 'Your account verification status has been paused. Please contact administration.',
      data: { isVerified }
    });

    res.status(200).json({
      success: true,
      message: `User ${updated.name} verification status set to ${isVerified ? 'VERIFIED' : 'PENDING'}`,
      user: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get full platform audit log trail
// @route   GET /api/admin/logs
// @access  Private (Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await LogModel.find({}, { limit: 100 });
    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin emergency delete of listing
// @route   DELETE /api/admin/listings/:id
// @access  Private (Admin)
const deleteListing = async (req, res, next) => {
  try {
    const listingId = req.params.id;
    const listing = await FoodListingModel.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    await FoodListingModel.findByIdAndUpdate(listingId, { status: 'expired' });

    await LogModel.create({
      listingId: listing._id,
      listingCode: listing.listingCode,
      action: 'ADMIN_FORCE_EXPIRED',
      fromStatus: listing.status,
      toStatus: 'expired',
      actorRole: 'admin',
      actorName: req.user.name,
      note: 'Listing archived/expired by platform admin.'
    });

    res.status(200).json({
      success: true,
      message: `Listing ${listing.listingCode} expired by admin.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  verifyUser,
  getAuditLogs,
  deleteListing
};
