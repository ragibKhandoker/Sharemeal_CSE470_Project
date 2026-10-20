let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const userModel = require('../models/userModel');

const db = require('../config/db');
const passwordResetService = require('../services/passwordResetService');
const resetMessageCrypto = require('../services/resetMessageCrypto');
const { invalidateAuthCache } = require('../middleware/authMiddleware');
const captchaService = require('../utils/captchaService');

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_SIGN_IN_ENABLED = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID);
const googleClient = GOOGLE_SIGN_IN_ENABLED ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

/**
 * Auth Controller handles user registration, login, profile retrieval, update, verification & password reset
 */

const getCaptcha = (req, res) => {
  try {
    const captcha = captchaService.generateCaptcha();
    return res.status(200).json({
      message: 'Captcha challenge generated',
      data: captcha
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to generate CAPTCHA' });
  }
};

const checkUserExists = async (req, res, next) => {
  try {
    const { phone, email, identifier } = req.query;

    if (phone && phone.trim()) {
      const existingPhone = await userModel.findByPhone(phone.trim());
      if (existingPhone) {
        return res.status(200).json({
          exists: true,
          field: 'phone',
          message: 'User already exists with this phone number. Please log in instead.'
        });
      }
    }

    if (email && email.trim()) {
      const existingEmail = await userModel.findByEmail(email.trim());
      if (existingEmail) {
        return res.status(200).json({
          exists: true,
          field: 'email',
          message: 'User already exists with this email address. Please log in instead.'
        });
      }
    }

    if (identifier && identifier.trim()) {
      const existingUser = await userModel.findByPhoneOrEmail(identifier.trim());
      if (existingUser) {
        return res.status(200).json({
          exists: true,
          field: 'identifier',
          message: 'User account found for this phone number or email.'
        });
      }
    }

    return res.status(200).json({ exists: false });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { name, phone, nid, email, address, password, role, captchaId, captchaAnswer } = req.body;
    const nid_pdf = req.file ? req.file.buffer : null;

    // 1. Check if phone already registered (Immediate duplicate feedback)
    if (phone && phone.trim()) {
      const existingPhone = await userModel.findByPhone(phone.trim());
      if (existingPhone) {
        return res.status(409).json({
          userExists: true,
          field: 'phone',
          message: 'User already exists with this phone number. Please log in instead.'
        });
      }
    }

    // 2. Check if email already registered (Immediate duplicate feedback)
    if (email && email.trim()) {
      const existingEmail = await userModel.findByEmail(email.trim());
      if (existingEmail) {
        return res.status(409).json({
          userExists: true,
          field: 'email',
          message: 'User already exists with this email address. Please log in instead.'
        });
      }
    }

    // 3. Verify CAPTCHA only if challenge response was submitted
    if (captchaId && captchaAnswer) {
      if (!captchaService.verifyCaptcha(captchaId, captchaAnswer)) {
        return res.status(400).json({
          message: 'Security verification failed: Invalid or expired CAPTCHA code. Please type the characters shown in the security box.'
        });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const userRole = role ? role.toLowerCase() : 'donor';

    const newUser = await userModel.createUser({
      name,
      phone: phone ? phone.trim() : '',
      nid,
      nid_pdf,
      email: email ? email.trim() : null,
      address,
      password_hash,
      role: userRole
    });

    if (userRole.includes('ngo')) {
      const ngoModel = require('../models/ngoModel');
      await ngoModel.createNgo({
        user_id: newUser.id,
        organization_name: req.body.organization_name || name,
        registration_no: req.body.registration_no || nid || null,
        registration_document_pdf: nid_pdf
      });
    }

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: newUser
    });
  } catch (error) {
    if (error.code === '23505') {
      const detail = String(error.detail || error.message || '').toLowerCase();
      const constraint = String(error.constraint || '').toLowerCase();
      if (detail.includes('phone') || constraint.includes('phone')) {
        return res.status(409).json({
          userExists: true,
          field: 'phone',
          message: 'User already exists with this phone number. Please log in instead.'
        });
      }
      if (detail.includes('email') || constraint.includes('email')) {
        return res.status(409).json({
          userExists: true,
          field: 'email',
          message: 'User already exists with this email address. Please log in instead.'
        });
      }
      return res.status(409).json({
        userExists: true,
        message: 'User already exists with this phone number or email address. Please log in instead.'
      });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { phone, email, identifier, password } = req.body;
    const loginInput = (identifier || phone || email || '').trim();

    if (!loginInput || !password) {
      return res.status(400).json({ message: 'Phone/Email and password are required' });
    }

    const user = await userModel.findByPhoneOrEmail(loginInput);

    if (!user) {
      return res.status(404).json({
        userExists: false,
        field: 'identifier',
        message: 'No account found with this phone number or email. Please sign up first.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    // Not the permanent password: it may be an admin-issued temporary password.
    let tempCredential = null;
    if (!isMatch) {
      const active = await passwordResetService.findActiveTemporaryPassword(user.id);
      if (active && await bcrypt.compare(password, active.temp_password_hash)) tempCredential = active;
    }

    if (!isMatch && !tempCredential) {
      return res.status(401).json({
        userExists: true,
        field: 'password',
        message: 'Incorrect password. Account exists for this user. Please try again or reset your password.'
      });
    }

    const baseClaims = { id: user.id, role: user.role, ngo_staff_role: user.ngo_staff_role, parent_ngo_id: user.parent_ngo_id };
    // A temporary-password login gets a short-lived token that only works on
    // the Set New Password page (pcr = password change required).
    const token = tempCredential
      ? jwt.sign(
        { ...baseClaims, pcr: true, rid: tempCredential.id, tia: new Date(tempCredential.temp_password_issued_at).getTime() },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '30m' }
      )
      : jwt.sign(baseClaims, process.env.JWT_SECRET || 'default_secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    // Track user login and active time
    try {
      await userModel.updateLastLogin(user.id);
    } catch (errLastLogin) {
      console.error('Failed to update last_login:', errLastLogin.message);
    }

    res.status(200).json({
      message: tempCredential ? 'Temporary password accepted. Set a new password to continue.' : 'Login successful',
      token,
      requirePasswordChange: Boolean(tempCredential),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        nid: user.nid,
        role: user.role,
        ngo_staff_role: user.ngo_staff_role,
        parent_ngo_id: user.parent_ngo_id,
        verification_status: user.verification_status,
        password_change_required: Boolean(tempCredential)
      }
    });
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    if (!GOOGLE_SIGN_IN_ENABLED) {
      return res.status(503).json({
        message: 'Google sign-in is not configured. Set a valid GOOGLE_CLIENT_ID in server/.env.'
      });
    }

    const { token: idToken, role = 'donor' } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await userModel.findByEmail(email);

    if (!user) {
      const dummyPhone = `g_${googleId.slice(0, 10)}`;
      const randomPasswordHash = await bcrypt.hash(googleId + (process.env.JWT_SECRET || 'secret'), 10);
      const normalizedRole = role.toLowerCase();

      user = await userModel.createUser({
        name: name || 'Google User',
        phone: dummyPhone,
        email,
        password_hash: randomPasswordHash,
        role: normalizedRole,
        address: 'Registered via Google OAuth'
      });

      if (normalizedRole === 'ngo') {
        const ngoModel = require('../models/ngoModel');
        await ngoModel.createNgo({
          user_id: user.id,
          organization_name: name || 'NGO Organization'
        });
      }
    }

    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    try {
      await userModel.updateLastLogin(user.id);
    } catch (errLastLogin) {
      console.error('Failed to update last_login on googleAuth:', errLastLogin.message);
    }

    res.status(200).json({
      message: 'Google Sign-In successful',
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        nid: user.nid,
        role: user.role,
        verification_status: user.verification_status
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ message: 'Google authentication failed: ' + error.message });
  }
};

const GENERIC_REQUEST_MESSAGE = 'If an account matches these details, your request has been sent to the ShareMeal admin team. Save your request code: after approval you will need it to open the temporary message from the admin.';

/**
 * POST /api/auth/request-reset { identifier (email or phone), reason }
 * Logged-in users (Profile page) are identified by their token instead.
 * The response is identical whether or not an account matched, and a user
 * can have only one pending request.
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { identifier, reason } = req.body;
    const inputIdentifier = typeof identifier === 'string' ? identifier.trim().slice(0, 255) : '';
    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';

    let targetUser = null;
    if (req.user && req.user.id) {
      const userRes = await db.query('SELECT id, name, email, phone FROM users WHERE id = $1', [req.user.id]);
      targetUser = userRes.rows[0];
    } else {
      if (!inputIdentifier) {
        return res.status(400).json({ message: 'Please enter the email address registered on your account.' });
      }
      const userRes = await db.query(
        'SELECT id, name, email, phone FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1',
        [inputIdentifier]
      );
      targetUser = userRes.rows[0];
    }

    // Every caller gets a request code (a throwaway one when no account
    // matched, after the same amount of work) so responses look identical.
    let requestCode;
    if (targetUser) {
      const created = await passwordResetService.createResetRequest({
        userId: targetUser.id,
        identifier: inputIdentifier || targetUser.email || targetUser.phone,
        reason: cleanReason || 'User requested password reset'
      });
      requestCode = created.code;
      if (created.created) {
        try {
          await db.query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             SELECT id, '🔑 Password Reset Request', 'User ' || $1 || ' has submitted a password reset request.', 'password_reset_request', '/admin/users?tab=password-requests'
             FROM users WHERE role::text IN ('admin', 'super_admin') AND id <> $2;`,
            [targetUser.name, targetUser.id]
          );
        } catch (notifErr) {
          console.warn('Could not insert admin notification for reset request:', notifErr.message);
        }
      }
    } else {
      requestCode = resetMessageCrypto.generateRequestCode();
      await resetMessageCrypto.deriveCodeLock(resetMessageCrypto.normaliseRequestCode(requestCode));
    }

    return res.status(202).json({ message: GENERIC_REQUEST_MESSAGE, requestCode });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-message { email, code }
 * Opens the admin's temporary message (temporary password + note) once.
 */
const getResetMessage = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (typeof email !== 'string' || !email.trim() || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ message: 'Enter your registered email address and request code.' });
    }
    const result = await passwordResetService.readResetMessage({ email, code });
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.code, message: error.message });
    return next(error);
  }
};

/**
 * POST /api/auth/set-new-password { password, confirmPassword }
 * Only accepts the restricted token issued by a temporary-password login.
 */
const setNewPassword = async (req, res, next) => {
  try {
    if (!req.user?.pcr) {
      return res.status(403).json({ message: 'This page is only for accounts signed in with a temporary password.' });
    }
    const { password, confirmPassword } = req.body;
    if (typeof password !== 'string' || password !== confirmPassword) {
      return res.status(400).json({ code: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' });
    }
    await passwordResetService.completePasswordChange({
      userId: req.user.id,
      requestId: req.user.rid,
      issuedAtMs: req.user.tia,
      newPassword: password
    });
    invalidateAuthCache(req.user.id);
    return res.status(200).json({ message: 'Your new password is saved. Please log in with it.' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ code: error.code, message: error.message });
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Tells the client to show the Set New Password page.
    res.status(200).json({ user: { ...user, password_change_required: Boolean(req.user.pcr) } });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, email, address, nid } = req.body;
    const nid_pdf = req.file ? req.file.buffer : null;

    const updatedUser = await userModel.updateUserProfile(req.user.id, {
      name,
      phone,
      email,
      address,
      nid,
      nid_pdf
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

const verifyUser = async (req, res, next) => {
  try {
    const updated = await userModel.updateVerificationStatus(req.params.id, 'verified');
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User verified', user: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  signup: register,
  login,
  checkUserExists,
  googleAuth,
  requestPasswordReset,
  getResetMessage,
  setNewPassword,
  getMe,
  updateProfile,
  verifyUser,
  getCaptcha
};
