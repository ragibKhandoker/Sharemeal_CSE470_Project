const jwt = require('jsonwebtoken');
const db = require('../config/db');

/*
 * Session revocation after a password change. JWTs are stateless, so each
 * token's issue time (iat) is compared with users.password_changed_at; tokens
 * issued before the last password change are rejected. Lookups are cached
 * briefly to avoid a database query on every request.
 */
const PASSWORD_CHANGE_CACHE_MS = 30000;
const passwordChangeCache = new Map();
let revocationCheckWarned = false;

const invalidateAuthCache = (userId) => {
  passwordChangeCache.delete(String(userId));
};

const getPasswordChangedAt = async (userId) => {
  const key = String(userId);
  const cached = passwordChangeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const result = await db.query('SELECT password_changed_at FROM users WHERE id = $1', [userId]);
  const value = result.rows[0]?.password_changed_at ? new Date(result.rows[0].password_changed_at).getTime() : null;
  passwordChangeCache.set(key, { value, expiresAt: Date.now() + PASSWORD_CHANGE_CACHE_MS });
  return value;
};

/**
 * True when the token was issued before the user's last password change.
 * Fails open (returns false) if the check itself cannot run, e.g. before
 * migration 037 is applied, so existing logins keep working.
 */
const isTokenRevoked = async (decoded) => {
  if (!decoded?.id || !decoded.iat) return false;
  try {
    const changedAt = await getPasswordChangedAt(decoded.id);
    return changedAt !== null && decoded.iat < Math.floor(changedAt / 1000);
  } catch (error) {
    if (!revocationCheckWarned) {
      revocationCheckWarned = true;
      console.warn('Session revocation check unavailable:', error.message);
    }
    return false;
  }
};

/**
 * Builds a JWT guard. Tokens issued after a temporary-password login carry
 * `pcr: true` (password change required); they are rejected everywhere
 * except routes guarded with allowPasswordChange.
 */
const authenticate = ({ allowPasswordChange }) => async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    if (await isTokenRevoked(decoded)) {
      return res.status(401).json({ message: 'Your password was changed. Please log in again.' });
    }
    if (decoded.pcr && !allowPasswordChange) {
      return res.status(403).json({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You signed in with a temporary password. Set a new password to continue.'
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Middleware to protect routes via JWT Bearer token authentication
 */
const protect = authenticate({ allowPasswordChange: false });

/**
 * Like protect, but also accepts temporary-password tokens. Only for the
 * current-user lookup and the set-new-password endpoint.
 */
const protectAllowingPasswordChange = authenticate({ allowPasswordChange: true });

/**
 * Middleware to restrict route access by role (donor, ngo, receiver, admin)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    const normalizeRole = (role) => {
      const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      return normalized === 'superadmin' ? 'super_admin' : normalized;
    };
    const userRole = normalizeRole(req.user?.role);
    const allowedRoles = roles.map(normalizeRole);

    if (!req.user || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
      if (!decoded.pcr && !(await isTokenRevoked(decoded))) req.user = decoded;
    }
  } catch (e) {
    // Ignore invalid token for optional auth
  }
  next();
};

module.exports = {
  protect,
  protectAllowingPasswordChange,
  optionalAuth,
  requireRole,
  invalidateAuthCache
};
