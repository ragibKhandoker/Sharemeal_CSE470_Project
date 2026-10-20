const crypto = require('crypto');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}
const db = require('../config/db');
const messageCrypto = require('./resetMessageCrypto');

/**
 * Admin-assisted password reset.
 *
 * An admin approves a password_reset_requests row, which generates a random
 * temporary password. Only its bcrypt hash is stored; the plain value is
 * returned once to the approving admin. Logging in with it yields a token that
 * can only be used to set a new password (see authMiddleware).
 */

const BCRYPT_ROUNDS = 10; // same cost as signup/login
// No look-alike characters (0/O, 1/l/I) so it can be read out to the user.
const TEMP_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMP_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const TEMP_DIGITS = '23456789';
const TEMP_LENGTH = 12;

const resetError = (status, code, message) => Object.assign(new Error(message), { status, code });

const getTempPasswordTtlHours = () => {
  const value = Number.parseInt(process.env.TEMP_PASSWORD_TTL_HOURS, 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 72) : 24;
};

/** Cryptographically random temporary password with upper, lower and digits. */
const generateTemporaryPassword = () => {
  const all = TEMP_UPPER + TEMP_LOWER + TEMP_DIGITS;
  const pick = (alphabet) => alphabet[crypto.randomInt(alphabet.length)];
  const chars = [pick(TEMP_UPPER), pick(TEMP_LOWER), pick(TEMP_DIGITS)];
  while (chars.length < TEMP_LENGTH) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

/**
 * Rules for a new permanent password: at least 8 characters with a letter
 * and a number, within bcrypt's 72-byte limit. Leading/trailing spaces are
 * trimmed, matching signup.
 */
const validateNewPassword = (value) => {
  const password = typeof value === 'string' ? value.trim() : '';
  if (password.length < 8) throw resetError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters long.');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw resetError(400, 'WEAK_PASSWORD', 'Password must contain at least one letter and one number.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) throw resetError(400, 'WEAK_PASSWORD', 'Password must be 72 bytes or fewer.');
  return password;
};

const withTransaction = async (work) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const MAX_CODE_ATTEMPTS = 5;
const NOTE_MAX_LENGTH = 300;

const cleanNote = (value) => String(value || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, NOTE_MAX_LENGTH);

/**
 * Records a reset request for a user and returns its secret request code.
 * A newer request from the same user replaces the code of their pending
 * request. The code itself is never stored, only a lock derived from it.
 * Returns { code, created }.
 */
const createResetRequest = async ({ userId, identifier, reason }) => {
  const code = messageCrypto.generateRequestCode();
  const lock = await messageCrypto.deriveCodeLock(messageCrypto.normaliseRequestCode(code));
  const result = await db.query(
    `INSERT INTO password_reset_requests (user_id, identifier, reason, status, message_public_key, message_key_salt)
     VALUES ($1, $2, $3, 'pending', $4, $5)
     ON CONFLICT (user_id) WHERE status = 'pending'
     DO UPDATE SET message_public_key = EXCLUDED.message_public_key,
                   message_key_salt = EXCLUDED.message_key_salt,
                   reason = EXCLUDED.reason, code_attempts = 0, requested_at = NOW()
     RETURNING (xmax = 0) AS created`,
    [userId, identifier, reason, lock.publicKey, lock.salt]
  );
  return { code, created: result.rows[0].created };
};

/**
 * Approves a pending request, or regenerates the temporary password of an
 * approved one. Any earlier temporary password for the user stops working.
 *
 * If the request has a code lock, the password is sealed into a temporary
 * message only the user can open (with an optional admin note) and the admin
 * never sees it: returns { messageSent: true }. Otherwise (older requests and
 * admin-started resets) the password is returned once for the admin to hand
 * over: { messageSent: false, temporaryPassword }.
 */
const issueTemporaryPassword = ({ requestId, adminId, note = '' }) => withTransaction(async (client) => {
  const found = await client.query(
    `SELECT prr.id, prr.user_id, prr.status, prr.message_public_key, u.name, u.email
     FROM password_reset_requests prr
     JOIN users u ON u.id = prr.user_id
     WHERE prr.id = $1
     FOR UPDATE OF prr`,
    [requestId]
  );
  const request = found.rows[0];
  if (!request) throw resetError(404, 'NOT_FOUND', 'Password reset request not found.');
  if (!['pending', 'approved'].includes(request.status)) {
    throw resetError(409, 'NOT_APPROVABLE', `This request is already ${request.status} and cannot be approved.`);
  }
  if (Number(request.user_id) === Number(adminId)) {
    throw resetError(403, 'SELF_APPROVAL', 'You cannot approve a password reset for your own account. Ask another admin.');
  }

  // Invalidate any other temporary password this user still holds.
  await client.query(
    `UPDATE password_reset_requests
     SET temp_password_hash = NULL, temp_password_expires_at = LEAST(temp_password_expires_at, NOW())
     WHERE user_id = $1 AND id <> $2 AND temp_password_hash IS NOT NULL`,
    [request.user_id, request.id]
  );

  const temporaryPassword = generateTemporaryPassword();
  const tempHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
  const sealed = request.message_public_key
    ? messageCrypto.sealMessage(request.message_public_key, { p: temporaryPassword, n: cleanNote(note) })
    : null;
  const updated = await client.query(
    `UPDATE password_reset_requests
     SET status = 'approved', temp_password_hash = $1, temp_password_issued_at = NOW(),
         temp_password_expires_at = NOW() + make_interval(hours => $2),
         reset_token = NULL, resolved_at = NOW(), resolved_by = $3,
         temp_message_ciphertext = $5,
         temp_message_sent_at = CASE WHEN $5::text IS NULL THEN NULL ELSE NOW() END,
         temp_message_viewed_at = NULL, code_attempts = 0
     WHERE id = $4
     RETURNING temp_password_expires_at`,
    [tempHash, getTempPasswordTtlHours(), adminId, request.id, sealed]
  );

  await client.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, 'password_reset_approved')`,
    [
      request.user_id,
      '🔑 Password Reset Approved',
      sealed
        ? 'An admin approved your password reset. Open "Check Reset Message" on the login page with your request code to get your temporary password.'
        : 'An admin approved your password reset. The admin team will share a temporary password with you privately. Log in with it and set a new password.'
    ]
  );

  const base = {
    messageSent: Boolean(sealed),
    expiresAt: updated.rows[0].temp_password_expires_at,
    user: { id: request.user_id, name: request.name, email: request.email }
  };
  return sealed ? base : { ...base, temporaryPassword };
});

const GENERIC_MESSAGE_ERROR = resetError(
  404,
  'NO_MESSAGE',
  'No reset message was found for this email and code. Check both, or send a new password reset request.'
);

/**
 * Opens a user's temporary message with their request code. A ready message
 * is returned once and then deleted. Wrong codes count towards a lock-out
 * (MAX_CODE_ATTEMPTS), after which the message and temporary password are
 * destroyed. Unknown emails and wrong codes get the same answer.
 */
const readResetMessage = async ({ email, code }) => {
  const normalisedCode = messageCrypto.normaliseRequestCode(code);
  const userRes = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [String(email || '').trim()]);
  const user = userRes.rows[0];
  if (!user || !normalisedCode) {
    await messageCrypto.codeMatchesLock(normalisedCode, null); // same work as a real check
    throw GENERIC_MESSAGE_ERROR;
  }

  const result = await withTransaction(async (client) => {
    // A user may have re-requested after approval, so check the latest few.
    const candidates = await client.query(
      `SELECT id, status, message_public_key, message_key_salt, code_attempts,
              temp_message_ciphertext, temp_message_viewed_at, temp_password_expires_at,
              temp_password_expires_at > NOW() AS temp_valid
       FROM password_reset_requests
       WHERE user_id = $1 AND message_public_key IS NOT NULL
       ORDER BY id DESC LIMIT 3
       FOR UPDATE`,
      [user.id]
    );
    const rows = candidates.rows;
    if (!rows.length || rows[0].code_attempts >= MAX_CODE_ATTEMPTS) {
      await messageCrypto.codeMatchesLock(normalisedCode, null);
      throw GENERIC_MESSAGE_ERROR;
    }

    let match = null;
    for (const row of rows) {
      if (await messageCrypto.codeMatchesLock(normalisedCode, { publicKey: row.message_public_key, salt: row.message_key_salt })) {
        match = row;
        break;
      }
    }

    if (!match) {
      const latest = rows[0];
      const attempts = latest.code_attempts + 1;
      await client.query(
        attempts >= MAX_CODE_ATTEMPTS
          ? `UPDATE password_reset_requests
             SET code_attempts = $2, temp_message_ciphertext = NULL, temp_password_hash = NULL,
                 temp_password_expires_at = LEAST(temp_password_expires_at, NOW())
             WHERE id = $1`
          : 'UPDATE password_reset_requests SET code_attempts = $2 WHERE id = $1',
        [latest.id, attempts]
      );
      return { wrongCode: true }; // commit the attempt count, then report the error
    }

    await client.query('UPDATE password_reset_requests SET code_attempts = 0 WHERE id = $1', [match.id]);

    if (match.status !== 'approved') return { status: match.status };
    if (!match.temp_valid) return { status: 'expired' };
    if (!match.temp_message_ciphertext) {
      return match.temp_message_viewed_at
        ? { status: 'viewed', viewedAt: match.temp_message_viewed_at }
        : { status: 'approved_offline' };
    }

    const payload = await messageCrypto.openMessage(
      normalisedCode,
      { publicKey: match.message_public_key, salt: match.message_key_salt },
      match.temp_message_ciphertext
    );
    // One-time: delete the sealed message as soon as it has been read.
    await client.query(
      `UPDATE password_reset_requests
       SET temp_message_ciphertext = NULL, temp_message_viewed_at = NOW()
       WHERE id = $1`,
      [match.id]
    );
    return {
      status: 'ready',
      temporaryPassword: payload.p,
      note: payload.n || '',
      expiresAt: match.temp_password_expires_at
    };
  });
  if (result.wrongCode) throw GENERIC_MESSAGE_ERROR;
  return result;
};

/**
 * Admin-initiated reset without a user request (Users / NGO panels): records
 * an audit request row, then issues a temporary password for it.
 */
const issueTemporaryPasswordForUser = async ({ userId, adminId, note = '' }) => {
  const userRes = await db.query('SELECT id, email, phone FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) throw resetError(404, 'NOT_FOUND', 'User not found.');
  if (Number(user.id) === Number(adminId)) {
    throw resetError(403, 'SELF_APPROVAL', 'You cannot reset your own password here. Ask another admin.');
  }

  const existing = await db.query(
    `SELECT id FROM password_reset_requests
     WHERE user_id = $1 AND status IN ('pending', 'approved')
     ORDER BY (status = 'pending') DESC, id DESC LIMIT 1`,
    [user.id]
  );
  let requestId = existing.rows[0]?.id;
  if (!requestId) {
    const inserted = await db.query(
      `INSERT INTO password_reset_requests (user_id, identifier, reason, status)
       VALUES ($1, $2, 'Password reset started by an admin', 'pending')
       ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING
       RETURNING id`,
      [user.id, user.email || user.phone || `user-${user.id}`]
    );
    requestId = inserted.rows[0]?.id
      || (await db.query(`SELECT id FROM password_reset_requests WHERE user_id = $1 AND status = 'pending'`, [user.id])).rows[0].id;
  }
  return issueTemporaryPassword({ requestId, adminId, note });
};

/** The user's usable temporary credential, if any. */
const findActiveTemporaryPassword = async (userId) => {
  const result = await db.query(
    `SELECT id, temp_password_hash, temp_password_issued_at
     FROM password_reset_requests
     WHERE user_id = $1 AND status = 'approved' AND temp_password_hash IS NOT NULL
       AND temp_password_expires_at > NOW()
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

/**
 * Replaces the password after a temporary-password login. `requestId` and
 * `issuedAtMs` come from the signed token, so a token from an older (since
 * regenerated) temporary password is rejected. Runs in one transaction with
 * the request row locked, so it can only complete once.
 */
const completePasswordChange = async ({ userId, requestId, issuedAtMs, newPassword }) => {
  const password = validateNewPassword(newPassword);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return withTransaction(async (client) => {
    const found = await client.query(
      `SELECT id, temp_password_hash, temp_password_issued_at
       FROM password_reset_requests
       WHERE id = $1 AND user_id = $2 AND status = 'approved'
         AND temp_password_hash IS NOT NULL AND temp_password_expires_at > NOW()
       FOR UPDATE`,
      [requestId, userId]
    );
    const request = found.rows[0];
    if (!request || new Date(request.temp_password_issued_at).getTime() !== Number(issuedAtMs)) {
      throw resetError(401, 'TEMP_PASSWORD_INVALID', 'Your temporary password has expired or was replaced. Log in again with the latest temporary password.');
    }
    if (await bcrypt.compare(password, request.temp_password_hash)) {
      throw resetError(400, 'WEAK_PASSWORD', 'Choose a new password that is different from the temporary password.');
    }

    // password_changed_at is compared with JWT issue times, so it must come
    // from this server's clock (the one that signs tokens), not the database's.
    await client.query(
      `UPDATE users SET password_hash = $1, password_changed_at = $3, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId, new Date()]
    );
    await client.query(
      `UPDATE password_reset_requests
       SET status = 'completed', temp_password_hash = NULL, temp_message_ciphertext = NULL,
           temp_password_expires_at = LEAST(temp_password_expires_at, NOW()), completed_at = NOW()
       WHERE id = $1`,
      [request.id]
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Password changed', 'Your ShareMeal password was changed. If this was not you, contact the ShareMeal admin team immediately.', 'password_reset_success')`,
      [userId]
    );
    return { userId };
  });
};

module.exports = {
  createResetRequest,
  readResetMessage,
  generateTemporaryPassword,
  validateNewPassword,
  issueTemporaryPassword,
  issueTemporaryPasswordForUser,
  findActiveTemporaryPassword,
  completePasswordChange,
  getTempPasswordTtlHours
};
