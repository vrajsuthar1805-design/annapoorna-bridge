const express = require('express');
const router = express.Router();
const { getImpactMetrics } = require('../controllers/analyticsController');

router.get('/impact', getImpactMetrics);

module.exports = router;
