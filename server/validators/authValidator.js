const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const normalizeBangladeshPhone = (value) => {
  if (typeof value !== 'string') return value;
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (!/^(?:01[3-9]\d{8}|(?:\+880|00880|880)1[3-9]\d{8})$/.test(compact)) return '';
  if (compact.startsWith('+880')) return `0${compact.slice(4)}`;
  if (compact.startsWith('00880')) return `0${compact.slice(5)}`;
  if (compact.startsWith('880')) return `0${compact.slice(3)}`;
  return compact;
};

// Strong password for new accounts: 8+ characters (max 72 bytes for bcrypt)
// with a small letter, a capital letter, a number and a symbol.
// Keep in sync with client/src/utils/passwordRules.js.
const isStrongPassword = (value) => typeof value === 'string'
  && value.length >= 8
  && Buffer.byteLength(value, 'utf8') <= 72
  && /[a-z]/.test(value)
  && /[A-Z]/.test(value)
  && /\d/.test(value)
  && /[^A-Za-z0-9\s]/.test(value);

const signupValidation = [
  body('name')
    .customSanitizer((v) => (typeof v === 'string' ? v.trim() : v))
    .notEmpty()
    .withMessage('Name is required'),
  body('nid')
    .customSanitizer((v) => (typeof v === 'string' ? v.trim() : v))
    .notEmpty()
    .withMessage('NID is required'),
  body('phone')
    .customSanitizer(normalizeBangladeshPhone)
    .notEmpty()
    .withMessage('Phone number is required')
    .bail()
    .matches(/^01[3-9]\d{8}$/)
    .withMessage('Enter a valid Bangladesh mobile number, such as 01712345678.'),
  body('password')
    .customSanitizer((v) => (typeof v === 'string' ? v.trim() : v))
    .custom((value) => isStrongPassword(value))
    .withMessage('Please use a strong password: at least 8 characters with small and capital letters, a number and a symbol mixed.'),
  body('role')
    .customSanitizer((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v))
    .isIn(['donor', 'receiver', 'ngo', 'admin'])
    .withMessage('Role must be one of: donor, receiver, ngo, admin'),
  validate,
];

const loginValidation = [
  body('phone')
    .optional()
    .customSanitizer((v) => (typeof v === 'string' ? v.trim() : v)),
  body('email')
    .optional()
    .customSanitizer((v) => (typeof v === 'string' ? v.trim() : v)),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

module.exports = {
  signupValidation,
  validateRegister: signupValidation,
  loginValidation,
  validateLogin: loginValidation,
};
