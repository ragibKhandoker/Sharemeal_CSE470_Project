/**
 * Strong password rules for new accounts. Keep in sync with the server
 * (server/validators/authValidator.js).
 */
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'lower', label: 'A small letter (a-z)', test: (value) => /[a-z]/.test(value) },
  { id: 'upper', label: 'A capital letter (A-Z)', test: (value) => /[A-Z]/.test(value) },
  { id: 'number', label: 'A number (0-9)', test: (value) => /\d/.test(value) },
  { id: 'symbol', label: 'A symbol (e.g. ! @ # $ %)', test: (value) => /[^A-Za-z0-9\s]/.test(value) }
];

/** Results for each rule, using the password as it will be saved (trimmed). */
export const checkPasswordRules = (password) => {
  const value = String(password || '').trim();
  return PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(value) }));
};

export const isStrongPassword = (password) => checkPasswordRules(password).every((rule) => rule.passed);

/** Strength label/colour for the meter, based on how many rules pass. */
export const passwordStrength = (password) => {
  const passed = checkPasswordRules(password).filter((rule) => rule.passed).length;
  const extraLong = String(password || '').trim().length >= 12;
  if (passed <= 2) return { label: 'Weak', color: '#dc2626', percent: 25 };
  if (passed <= 4) return { label: 'Fair', color: '#d97706', percent: 60 };
  return extraLong
    ? { label: 'Very strong', color: '#15803d', percent: 100 }
    : { label: 'Strong', color: '#16a34a', percent: 85 };
};
