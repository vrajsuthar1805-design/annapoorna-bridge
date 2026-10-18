// Metrics & Safety Routes

const express = require('express');
const router = express.Router();
const { getImpactMetrics, getFssaiGuidelines } = require('../controllers/metricsController');

router.get('/impact', getImpactMetrics);
router.get('/fssai-guidelines', getFssaiGuidelines);

module.exports = router;
