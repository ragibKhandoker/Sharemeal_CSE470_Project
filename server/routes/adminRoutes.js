const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Admin and Super Admin only routes
router.use(protect, requireRole('admin', 'super_admin'));

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', adminController.deleteInactiveUser);
router.post('/users/delete-inactive-batch', adminController.deleteInactiveUsersBatch);
router.patch('/users/:id/simulate-inactivity', adminController.simulateUserInactivity);
router.get('/ngo-queue', adminController.getNgoVerificationQueue);
router.get('/nid-document/:userId', adminController.getNidDocument);
router.patch('/ngo-verify/:id', adminController.verifyNgo);
router.patch('/reset-password/:id', adminController.resetUserPasswordByAdmin);
router.get('/notifications', adminController.getAdminNotifications);
router.get('/food-threads', adminController.getFoodPostLifecycleThreads);
router.get('/password-requests', adminController.getPasswordResetRequests);
router.post('/password-requests/:id/approve', adminController.approvePasswordResetRequest);
// Generates a fresh temporary password for an approved request (the old one stops working).
router.post('/password-requests/:id/regenerate', adminController.approvePasswordResetRequest);
router.post('/password-requests/:id/reject', adminController.rejectPasswordResetRequest);
router.get('/bot-alerts', adminController.getBotAlerts);
router.post('/bot-alerts/:id/action', adminController.handleBotAlertAction);
router.get('/analytics', adminController.getAnalytics);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.post('/settings/invite', adminController.inviteAdmin);

module.exports = router;
