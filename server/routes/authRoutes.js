const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const { protect, protectAllowingPasswordChange, optionalAuth } = require('../middleware/authMiddleware');
const {
  signupLimiter,
  loginLimiter,
  passwordChangeLimiter,
  adminResetRequestLimiter,
  resetMessageLimiter
} = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../validators/authValidator');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    if (!isPdf && !isImage) {
      return cb(new Error('Only PDF documents or image files (JPG, PNG) are allowed for NID upload'), false);
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('nidPdf')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Auth routes
router.get('/captcha', authController.getCaptcha);
router.get('/check-exists', authController.checkUserExists);
router.post('/signup', signupLimiter, handleUpload, validateRegister, authController.register);
router.post('/register', signupLimiter, handleUpload, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/google', authController.googleAuth);
router.post('/request-reset', adminResetRequestLimiter, optionalAuth, authController.requestPasswordReset);
router.post('/reset-message', resetMessageLimiter, authController.getResetMessage);
router.post('/set-new-password', passwordChangeLimiter, protectAllowingPasswordChange, authController.setNewPassword);
router.get('/me', protectAllowingPasswordChange, authController.getMe);
router.put('/profile', protect, handleUpload, authController.updateProfile);
router.patch('/verify/:id', protect, authController.verifyUser);

module.exports = router;
