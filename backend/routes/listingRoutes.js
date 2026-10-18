// Food Listing Routes

const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getListingById,
  getMyListings,
  cancelListing
} = require('../controllers/listingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public endpoints
router.get('/', getListings);
router.get('/:id', getListingById);

// Donor endpoints
router.post('/', protect, authorize('donor', 'admin'), createListing);
router.get('/my/postings', protect, authorize('donor', 'admin'), getMyListings);
router.put('/:id/cancel', protect, authorize('donor', 'admin'), cancelListing);

module.exports = router;
