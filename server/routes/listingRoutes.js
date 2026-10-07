const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getDonorListings,
  getNgoClaims,
  getListingById,
  claimListing,
  updateListingStatus,
} = require('../controllers/listingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getListings);
router.post('/', protect, authorize('donor', 'admin'), createListing);
router.get('/my-listings', protect, authorize('donor', 'admin'), getDonorListings);
router.get('/my-claims', protect, authorize('ngo', 'admin'), getNgoClaims);
router.get('/:id', getListingById);
router.post('/:id/claim', protect, authorize('ngo', 'admin'), claimListing);
router.patch('/:id/status', protect, updateListingStatus);

module.exports = router;
