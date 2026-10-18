// Auth Routes

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { getRecentNotifications } = require('../services/notificationService');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Notification Feed for current user
router.get('/notifications', protect, (req, res) => {
  const notifs = getRecentNotifications(req.user._id);
  res.status(200).json({ success: true, count: notifs.length, notifications: notifs });
});

module.exports = router;
