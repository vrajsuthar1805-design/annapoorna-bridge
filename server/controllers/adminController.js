const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { emitEvent } = require('../services/socketService');

/**
 * @desc    Get all users (with role & verification filter)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isVerified } = req.query;
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }
    if (isVerified !== undefined && isVerified !== 'all') {
      query.isVerified = isVerified === 'true';
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify or reject a user (Donor or NGO)
 * @route   PATCH /api/admin/users/:id/verify
 * @access  Private (Admin)
 */
const verifyUser = async (req, res, next) => {
  try {
    const { isVerified, verificationNotes } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.isVerified = Boolean(isVerified);
    user.verificationNotes = verificationNotes || (isVerified ? 'Verified by Administrator' : 'Pending verification');
    if (isVerified) {
      user.verifiedAt = new Date();
    }
    await user.save();

    await AuditLog.create({
      action: isVerified ? 'USER_VERIFIED' : 'USER_REJECTED',
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      details: {
        adminId: req.user._id,
        adminName: req.user.name,
        notes: user.verificationNotes,
      },
    });

    emitEvent('user:verification_changed', {
      userId: user._id,
      isVerified: user.isVerified,
    }, `user:${user._id}`);

    res.json({
      success: true,
      message: `User ${user.orgName} (${user.role.toUpperCase()}) ${isVerified ? 'verified successfully' : 'verification revoked'}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get system audit trail / transaction logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, limit = 50 } = req.query;
    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name orgName role')
      .populate('listingId', 'foodTitle status quantityValue quantityUnit')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  verifyUser,
  getAuditLogs,
};
