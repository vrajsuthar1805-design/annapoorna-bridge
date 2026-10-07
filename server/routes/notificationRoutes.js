const express = require('express');
const router = express.Router();
const { getRecentNotifications } = require('../services/notificationService');

router.get('/recent', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 20;
  res.json({
    success: true,
    notifications: getRecentNotifications(limit),
  });
});

module.exports = router;
