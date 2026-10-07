const express = require('express');
const router = express.Router();
const { getUsers, verifyUser, getAuditLogs } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/verify', verifyUser);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
