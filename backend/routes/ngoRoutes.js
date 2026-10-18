// NGO Routes

const express = require('express');
const router = express.Router();
const {
  claimListing,
  updateTransitStatus,
  getClaimedListings,
  getDispatchSlip
} = require('../controllers/ngoController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Claiming an available surplus listing (Atomic race-condition protected)
router.post('/claim/:id', protect, authorize('ngo', 'admin'), claimListing);

// Updating transit tracking status (claimed -> in_transit -> delivered)
router.put('/status/:id', protect, authorize('ngo', 'admin'), updateTransitStatus);

// View listings claimed by this NGO
router.get('/claimed', protect, authorize('ngo', 'admin'), getClaimedListings);

// Get digital pickup dispatch slip
router.get('/dispatch-slip/:id', protect, getDispatchSlip);

module.exports = router;
