const crypto = require('crypto');
const { promisify } = require('util');

/**
 * Sealed temporary messages for password resets.
 *
 * The user's request code is stretched with scrypt into an X25519 private
 * key. Only the matching public key (and the scrypt salt) is stored. Messages
 * are encrypted to that public key with an ephemeral X25519 key, HKDF-SHA256
 * and AES-256-GCM, so the server cannot read a stored message without the
 * user's code, and a wrong code fails the GCM authentication check.
 */

const scrypt = promisify(crypto.scrypt);

// Unambiguous characters only (no 0/O, 1/I/L, U) so codes are easy to copy.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_LENGTH = 10; // ~49 bits
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const HKDF_INFO = Buffer.from('sharemeal-temp-message-v1');
// PKCS#8 DER prefix for a raw 32-byte X25519 private key.
const X25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420', 'hex');

const generateRequestCode = () => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
};

/** Uppercases and strips spaces/dashes; returns null if it cannot be a code. */
const normaliseRequestCode = (value) => {
  const code = String(value || '').toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH || [...code].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  return code;
};

const rawPublicKey = (keyObject) => Buffer.from(keyObject.export({ format: 'jwk' }).x, 'base64url');
const publicKeyFromRaw = (raw) => crypto.createPublicKey({
  key: { kty: 'OKP', crv: 'X25519', x: Buffer.from(raw).toString('base64url') },
  format: 'jwk'
});

const privateKeyFromCode = async (normalisedCode, saltBase64) => {
  const seed = await scrypt(normalisedCode, Buffer.from(saltBase64, 'base64'), 32, SCRYPT_OPTIONS);
  return crypto.createPrivateKey({ key: Buffer.concat([X25519_PKCS8_PREFIX, seed]), format: 'der', type: 'pkcs8' });
};

/**
 * Derives the stored lock for a code: { publicKey, salt } (both base64).
 */
const deriveCodeLock = async (normalisedCode) => {
  const salt = crypto.randomBytes(16).toString('base64');
  const privateKey = await privateKeyFromCode(normalisedCode, salt);
  return { publicKey: rawPublicKey(crypto.createPublicKey(privateKey)).toString('base64'), salt };
};

/**
 * True when the code matches the stored lock. Always runs scrypt, so timing
 * does not reveal whether a lock exists (pass null lock for a dummy check).
 */
const codeMatchesLock = async (normalisedCode, lock) => {
  const salt = lock?.salt || crypto.randomBytes(16).toString('base64');
  const privateKey = await privateKeyFromCode(normalisedCode || 'XXXXXXXXXX', salt);
  if (!lock?.publicKey || !normalisedCode) return false;
  const derived = rawPublicKey(crypto.createPublicKey(privateKey));
  const stored = Buffer.from(lock.publicKey, 'base64');
  return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
};

const messageKey = (sharedSecret, ephemeralRaw, recipientRaw) => Buffer.from(
  crypto.hkdfSync('sha256', sharedSecret, Buffer.concat([ephemeralRaw, recipientRaw]), HKDF_INFO, 32)
);

/** Encrypts a JSON payload to the stored public key. */
const sealMessage = (publicKeyBase64, payload) => {
  const recipientRaw = Buffer.from(publicKeyBase64, 'base64');
  const ephemeral = crypto.generateKeyPairSync('x25519');
  const ephemeralRaw = rawPublicKey(ephemeral.publicKey);
  const shared = crypto.diffieHellman({ privateKey: ephemeral.privateKey, publicKey: publicKeyFromRaw(recipientRaw) });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', messageKey(shared, ephemeralRaw, recipientRaw), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return `v1.${Buffer.concat([ephemeralRaw, iv, cipher.getAuthTag(), ciphertext]).toString('base64url')}`;
};

/** Decrypts a sealed message with the user's code. Throws if the code is wrong. */
const openMessage = async (normalisedCode, lock, sealed) => {
  if (!String(sealed).startsWith('v1.')) throw new Error('Unsupported message format');
  const data = Buffer.from(sealed.slice(3), 'base64url');
  const ephemeralRaw = data.subarray(0, 32);
  const iv = data.subarray(32, 44);
  const tag = data.subarray(44, 60);
  const ciphertext = data.subarray(60);
  const privateKey = await privateKeyFromCode(normalisedCode, lock.salt);
  const recipientRaw = rawPublicKey(crypto.createPublicKey(privateKey));
  const shared = crypto.diffieHellman({ privateKey, publicKey: publicKeyFromRaw(ephemeralRaw) });
  const decipher = crypto.createDecipheriv('aes-256-gcm', messageKey(shared, ephemeralRaw, recipientRaw), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
};

module.exports = {
  generateRequestCode,
  normaliseRequestCode,
  deriveCodeLock,
  codeMatchesLock,
  sealMessage,
  openMessage
};
