// Admin Routes

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  verifyUser,
  getAuditLogs,
  deleteListing
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/users', getAllUsers);
router.put('/users/:id/verify', verifyUser);
router.get('/logs', getAuditLogs);
router.delete('/listings/:id', deleteListing);

module.exports = router;
