const express = require('express');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { walletLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/walletController');

const router = express.Router();
router.use(protect);

const receiver = requireRole('receiver');

// Receiver wallet
router.get('/', receiver, controller.getWallet);
router.get('/transactions', receiver, controller.getTransactions);
router.post('/topups', receiver, walletLimiter, controller.createTopup);
router.get('/topups/:reference', receiver, controller.getTopup);
router.post('/topups/:reference/verify', receiver, walletLimiter, controller.verifyTopup);
router.get('/ngos', receiver, controller.getEligibleNgos);
router.post('/payments/preview', receiver, controller.previewPayment);
router.post('/payments', receiver, walletLimiter, controller.createPayment);
router.get('/payments/:reference', receiver, controller.getPayment);

// NGO: payments received by the authenticated NGO organisation only
router.get('/ngo/payments', requireRole('ngo'), controller.requireNgoOwner, controller.getNgoPayments);

// Admin: audited refund of an internal payment
router.post('/admin/payments/:reference/refund', requireRole('admin', 'super_admin'), walletLimiter, controller.refundPayment);

module.exports = router;
