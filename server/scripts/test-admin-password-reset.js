/**
 * Integration tests for the admin-assisted password reset with temporary
 * messages.
 *
 * Runs the real Express app against the configured database (DATABASE_URL)
 * with temporary users and removes every row it created afterwards.
 * Requires migrations 037, 038 and 039.
 *
 *   node scripts/test-admin-password-reset.js
 */
const assert = require('node:assert/strict');
const util = require('util');
const jwt = require('jsonwebtoken');
let bcrypt;
try { bcrypt = require('bcrypt'); } catch (e) { bcrypt = require('bcryptjs'); }

// Capture server logs so the test can check that no secret is logged.
const logged = [];
for (const level of ['log', 'info', 'warn', 'error']) {
  console[level] = (...args) => { logged.push(util.format(...args)); };
}
const print = (...args) => process.stdout.write(`${util.format(...args)}\n`);

const app = require('../app');
const db = require('../config/db');

const tag = `adminreset-${Date.now()}`;
const PASSWORDS = { a: 'UserA#Original1', b: 'UserB#Original2', adminA: 'AdminA#Pass3', adminB: 'AdminB#Pass4' };
const NEW_PASSWORD = 'MyNewPass2026';
const CODE_PATTERN = /^[A-Z2-9]{5}-[A-Z2-9]{5}$/;
const created = [];
const secrets = new Set(Object.values(PASSWORDS).concat(NEW_PASSWORD));
const tempPasswords = new Set();
const requestCodes = new Set();
const responses = [];
let baseUrl;
let passed = 0;
let failed = 0;

const call = async (method, path, { body, token } = {}) => {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  responses.push({ path, text });
  let data = {};
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { status: response.status, body: data };
};

const createUser = async (label, role, password) => {
  const email = `${tag}-${label}@example.test`;
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role, verification_status)
     VALUES ($1, $2, $3, $4, 'verified') RETURNING id`,
    [`Test ${tag} ${label}`, email, await bcrypt.hash(password, 10), role]
  );
  created.push(result.rows[0].id);
  return { id: result.rows[0].id, email, role };
};

const sign = (user, iatOffsetSeconds = 0) => jwt.sign(
  { id: user.id, role: user.role, iat: Math.floor(Date.now() / 1000) + iatOffsetSeconds },
  process.env.JWT_SECRET || 'default_secret'
);
const login = (email, password) => call('POST', '/auth/login', { body: { email, password } });
const requestReset = async (email, reason) => {
  const res = await call('POST', '/auth/request-reset', { body: { identifier: email, reason } });
  if (res.body.requestCode) requestCodes.add(res.body.requestCode);
  return res;
};
const readMessage = async (email, code) => {
  const res = await call('POST', '/auth/reset-message', { body: { email, code } });
  if (res.body.temporaryPassword) tempPasswords.add(res.body.temporaryPassword);
  return res;
};
const requestRow = async (userId) => (await db.query(
  'SELECT * FROM password_reset_requests WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [userId]
)).rows[0];

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    print(`  ✔ ${name}`);
  } catch (error) {
    failed += 1;
    print(`  ✘ ${name}\n      ${error.message.split('\n').join('\n      ')}`);
  }
};

const cleanup = async () => {
  const signedUp = await db.query('SELECT id FROM users WHERE email LIKE $1', [`${tag}-%`]);
  const ids = [...new Set([...created, ...signedUp.rows.map((r) => r.id)])];
  if (!ids.length) return;
  await db.query('DELETE FROM notifications WHERE user_id = ANY($1) OR message LIKE $2', [ids, `%${tag}%`]);
  await db.query('UPDATE password_reset_requests SET resolved_by = NULL WHERE resolved_by = ANY($1)', [ids]);
  await db.query('DELETE FROM password_reset_requests WHERE user_id = ANY($1)', [ids]);
  await db.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
};

const run = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const userA = await createUser('a', 'receiver', PASSWORDS.a);
    const userB = await createUser('b', 'donor', PASSWORDS.b);
    const adminA = await createUser('admin-a', 'admin', PASSWORDS.adminA);
    const adminB = await createUser('admin-b', 'admin', PASSWORDS.adminB);
    const adminToken = sign(adminA);
    const userAOldSession = sign(userA, -5);
    let requestA;
    let codeA;
    let tempA1;
    let tempA2;
    let pcrToken1;
    let pcrToken2;

    print('\n1. User requests a reset');
    await test('request is saved as pending and returns a request code; unknown emails look the same', async () => {
      const known = await requestReset(userA.email, `Forgot it ${tag}`);
      const unknown = await requestReset(`${tag}-nobody@example.test`, 'x');
      assert.equal(known.status, 202);
      assert.equal(unknown.status, 202);
      assert.equal(known.body.message, unknown.body.message);
      assert.match(known.body.requestCode, CODE_PATTERN);
      assert.match(unknown.body.requestCode, CODE_PATTERN);
      requestA = await requestRow(userA.id);
      assert.equal(requestA.status, 'pending');
      assert.equal(requestA.reason, `Forgot it ${tag}`);
      assert.ok(!JSON.stringify(requestA).includes(known.body.requestCode.replace('-', '')), 'request code stored in plain text');
      codeA = known.body.requestCode;
    });
    await test('a second request keeps one pending request and replaces the code', async () => {
      const again = await requestReset(userA.email, 'again');
      assert.equal(again.status, 202);
      const count = await db.query(`SELECT COUNT(*)::int c FROM password_reset_requests WHERE user_id = $1 AND status = 'pending'`, [userA.id]);
      assert.equal(count.rows[0].c, 1);
      assert.notEqual(again.body.requestCode, codeA);
      codeA = again.body.requestCode;
    });
    await test('before approval the message page says "pending" (and a wrong code reveals nothing)', async () => {
      const wrong = await readMessage(userA.email, 'AAAAA-BBBBB');
      assert.equal(wrong.status, 404);
      const unknownEmail = await readMessage(`${tag}-nobody@example.test`, codeA);
      assert.deepEqual(unknownEmail.body, wrong.body);
      const res = await readMessage(userA.email, codeA.toLowerCase());
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'pending');
    });

    print('\n2-4. Admin access');
    await test('2. admin sees the request with name, email, date, reason and status', async () => {
      const res = await call('GET', '/admin/password-requests', { token: adminToken });
      assert.equal(res.status, 200);
      const row = res.body.requests.find((r) => r.id === requestA.id);
      assert.ok(row, 'request missing from admin list');
      assert.equal(row.user_email, userA.email);
      assert.equal(row.status, 'pending');
      assert.equal(row.has_message_code, true);
      assert.ok(row.requested_at && row.reason && row.user_name);
      for (const field of ['temp_password_hash', 'reset_token', 'temp_message_ciphertext', 'message_public_key', 'message_key_salt']) {
        assert.ok(!(field in row), `admin list exposes ${field}`);
      }
    });
    await test('3. non-admins cannot use the admin reset endpoints', async () => {
      const userToken = sign(userA);
      for (const [method, path] of [
        ['GET', '/admin/password-requests'],
        ['POST', `/admin/password-requests/${requestA.id}/approve`],
        ['POST', `/admin/password-requests/${requestA.id}/regenerate`],
        ['POST', `/admin/password-requests/${requestA.id}/reject`],
        ['PATCH', `/admin/reset-password/${userB.id}`]
      ]) {
        assert.equal((await call(method, path, { token: userToken })).status, 403, `${method} ${path} as user`);
        assert.equal((await call(method, path)).status, 401, `${method} ${path} without token`);
      }
      assert.equal((await requestRow(userA.id)).status, 'pending');
    });
    await test('2. admin approves: a temporary message is sent and the admin never sees the password', async () => {
      const res = await call('POST', `/admin/password-requests/${requestA.id}/approve`, { token: adminToken, body: { note: `Hello from admin ${tag}` } });
      assert.equal(res.status, 200);
      assert.equal(res.body.messageSent, true);
      assert.ok(!('temporaryPassword' in res.body), 'admin received the temporary password');
      const row = await requestRow(userA.id);
      assert.equal(row.status, 'approved');
      assert.ok(row.temp_message_ciphertext.startsWith('v1.'));
      assert.ok(row.temp_password_hash);
    });
    await test('the user opens the message once with email + code', async () => {
      const res = await readMessage(userA.email, codeA);
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ready');
      assert.match(res.body.temporaryPassword, /^[A-Za-z0-9]{12}$/);
      assert.equal(res.body.note, `Hello from admin ${tag}`);
      tempA1 = res.body.temporaryPassword;
      const row = await requestRow(userA.id);
      assert.ok(await bcrypt.compare(tempA1, row.temp_password_hash));
      assert.equal(row.temp_message_ciphertext, null, 'message not deleted after reading');
      const again = await readMessage(userA.email, codeA);
      assert.equal(again.body.status, 'viewed');
      assert.ok(!('temporaryPassword' in again.body));
    });
    await test('4. admin endpoints never expose a password, hash or message', async () => {
      for (const path of ['/admin/users', '/admin/ngo-queue', '/admin/password-requests']) {
        const res = await call('GET', path, { token: adminToken });
        assert.equal(res.status, 200, path);
        const text = JSON.stringify(res.body);
        assert.ok(!/\$2[aby]\$/.test(text), `${path} contains a bcrypt hash`);
        assert.ok(!/password_hash|plain_password|ciphertext/.test(text), `${path} contains a secret field`);
        assert.ok(!text.includes(tempA1), `${path} contains the temporary password`);
      }
    });
    await test('an admin cannot approve their own reset request', async () => {
      await requestReset(adminA.email, 'own');
      const own = await requestRow(adminA.id);
      const self = await call('POST', `/admin/password-requests/${own.id}/approve`, { token: adminToken });
      assert.equal(self.status, 403);
      assert.equal(self.body.code, 'SELF_APPROVAL');
      const other = await call('POST', `/admin/password-requests/${own.id}/approve`, { token: sign(adminB) });
      assert.equal(other.status, 200);
      assert.equal(other.body.messageSent, true);
    });

    print('\n5-6. Temporary password login');
    await test('5. the temporary password only works for its own user', async () => {
      assert.equal((await login(userB.email, tempA1)).status, 401);
      const res = await login(userA.email, tempA1);
      assert.equal(res.status, 200);
      assert.equal(res.body.requirePasswordChange, true);
      assert.equal(res.body.user.password_change_required, true);
      pcrToken1 = res.body.token;
    });
    await test('6. a temporary-password session is blocked from protected APIs', async () => {
      for (const path of ['/receiver-commerce/cart', '/wallet', '/notifications', '/food-requests/my-requests']) {
        const res = await call('GET', path, { token: pcrToken1 });
        assert.equal(res.status, 403, path);
        assert.equal(res.body.code, 'PASSWORD_CHANGE_REQUIRED', path);
      }
      const me = await call('GET', '/auth/me', { token: pcrToken1 });
      assert.equal(me.status, 200);
      assert.equal(me.body.user.password_change_required, true);
    });
    await test('resending a new message invalidates the previous temporary password and its session', async () => {
      const res = await call('POST', `/admin/password-requests/${requestA.id}/regenerate`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.body.messageSent, true);
      const message = await readMessage(userA.email, codeA);
      assert.equal(message.body.status, 'ready');
      tempA2 = message.body.temporaryPassword;
      assert.notEqual(tempA2, tempA1);
      assert.equal((await login(userA.email, tempA1)).status, 401);
      const stale = await call('POST', '/auth/set-new-password', { token: pcrToken1, body: { password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } });
      assert.equal(stale.status, 401);
      assert.equal(stale.body.code, 'TEMP_PASSWORD_INVALID');
      pcrToken2 = (await login(userA.email, tempA2)).body.token;
    });
    await test('new password must match, be strong and differ from the temporary one', async () => {
      const mismatch = await call('POST', '/auth/set-new-password', { token: pcrToken2, body: { password: NEW_PASSWORD, confirmPassword: 'other' } });
      assert.equal(mismatch.body.code, 'PASSWORD_MISMATCH');
      const weak = await call('POST', '/auth/set-new-password', { token: pcrToken2, body: { password: 'abcdefgh', confirmPassword: 'abcdefgh' } });
      assert.equal(weak.body.code, 'WEAK_PASSWORD');
      const same = await call('POST', '/auth/set-new-password', { token: pcrToken2, body: { password: tempA2, confirmPassword: tempA2 } });
      assert.equal(same.body.code, 'WEAK_PASSWORD');
      const normal = await call('POST', '/auth/set-new-password', { token: sign(userA), body: { password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } });
      assert.equal(normal.status, 403, 'a normal session must not use this endpoint');
    });

    print('\n7-8. Setting the new password');
    await test('7. the new password is saved and works for normal login', async () => {
      const res = await call('POST', '/auth/set-new-password', { token: pcrToken2, body: { password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD } });
      assert.equal(res.status, 200);
      const row = await requestRow(userA.id);
      assert.equal(row.status, 'completed');
      assert.equal(row.temp_password_hash, null);
      assert.equal(row.temp_message_ciphertext, null);
      const loginRes = await login(userA.email, NEW_PASSWORD);
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.requirePasswordChange, false);
      assert.equal((await call('GET', '/receiver-commerce/cart', { token: loginRes.body.token })).status, 200);
    });
    await test('8. the temporary password and older sessions no longer work', async () => {
      assert.equal((await login(userA.email, tempA2)).status, 401);
      assert.equal((await login(userA.email, PASSWORDS.a)).status, 401, 'old permanent password still works');
      assert.notEqual((await call('POST', '/auth/set-new-password', { token: pcrToken2, body: { password: 'Another2026x', confirmPassword: 'Another2026x' } })).status, 200);
      assert.equal((await call('GET', '/auth/me', { token: userAOldSession })).status, 401);
    });

    print('\n9. Rejected requests and code lock-out');
    await test('9. a rejected request cannot be approved or used', async () => {
      const request = await requestReset(userB.email, 'reject me');
      const requestB = await requestRow(userB.id);
      await call('POST', `/admin/password-requests/${requestB.id}/approve`, { token: adminToken });
      const tempB = (await readMessage(userB.email, request.body.requestCode)).body.temporaryPassword;
      assert.ok(tempB);
      const rejected = await call('POST', `/admin/password-requests/${requestB.id}/reject`, { token: adminToken });
      assert.equal(rejected.status, 200);
      assert.equal((await login(userB.email, tempB)).status, 401, 'temporary password works after rejection');
      assert.equal((await readMessage(userB.email, request.body.requestCode)).body.status, 'rejected');
      assert.equal((await call('POST', `/admin/password-requests/${requestB.id}/approve`, { token: adminToken })).status, 409);
      assert.equal((await call('POST', `/admin/password-requests/${requestB.id}/regenerate`, { token: adminToken })).status, 409);
      assert.equal((await login(userB.email, PASSWORDS.b)).status, 200, 'user B normal login broken');
    });
    await test('too many wrong codes destroy the message and temporary password', async () => {
      const own = await requestRow(adminA.id);
      assert.ok(own.temp_message_ciphertext, 'expected an unread message');
      await db.query('UPDATE password_reset_requests SET code_attempts = 4 WHERE id = $1', [own.id]);
      assert.equal((await readMessage(adminA.email, 'ZZZZZ-ZZZZZ')).status, 404);
      const locked = await requestRow(adminA.id);
      assert.equal(locked.temp_message_ciphertext, null);
      assert.equal(locked.temp_password_hash, null);
      const ownCode = [...requestCodes][3];
      assert.equal((await readMessage(adminA.email, ownCode)).status, 404, 'locked message still readable');
    });
    await test('admin direct reset without a request code shows the password to the admin once', async () => {
      const res = await call('PATCH', `/admin/reset-password/${userB.id}`, { token: adminToken, body: { newPassword: 'AdminChosen123' } });
      assert.equal(res.status, 200);
      assert.equal(res.body.messageSent, false);
      tempPasswords.add(res.body.temporaryPassword);
      assert.equal((await login(userB.email, 'AdminChosen123')).status, 401, 'admin-chosen password was set');
      const tempLogin = await login(userB.email, res.body.temporaryPassword);
      assert.equal(tempLogin.body.requirePasswordChange, true);
    });

    print('\n10-12. Existing features and data safety');
    await test('10. signup and normal login still work', async () => {
      const signup = await call('POST', '/auth/signup', {
        body: { name: `Test ${tag} signup`, phone: `016${String(Date.now()).slice(-8)}`, nid: '1234567890', email: `${tag}-signup@example.test`, password: 'Signup#Pass6', role: 'donor' }
      });
      assert.equal(signup.status, 201, JSON.stringify(signup.body));
      secrets.add('Signup#Pass6');
      const res = await login(`${tag}-signup@example.test`, 'Signup#Pass6');
      assert.equal(res.status, 200);
      assert.equal(res.body.requirePasswordChange, false);
      assert.equal((await call('GET', '/auth/me', { token: res.body.token })).status, 200);
      const google = await call('POST', '/auth/google', { body: { credential: 'not-a-real-token' } });
      assert.ok([400, 401, 503].includes(google.status), `google auth returned ${google.status}`);
    });
    await test('11. no plaintext password or code is stored in the database', async () => {
      const rows = await db.query(
        `SELECT row_to_json(u)::text AS j FROM users u WHERE u.email LIKE $1
         UNION ALL SELECT row_to_json(p)::text FROM password_reset_requests p
         WHERE p.user_id IN (SELECT id FROM users WHERE email LIKE $1)
         UNION ALL SELECT row_to_json(n)::text FROM notifications n
         WHERE n.user_id IN (SELECT id FROM users WHERE email LIKE $1)`,
        [`${tag}-%`]
      );
      const dump = rows.rows.map((r) => r.j).join('\n');
      for (const secret of [...secrets, ...tempPasswords]) assert.ok(!dump.includes(secret), `plaintext found (${secret.slice(0, 3)}…)`);
      for (const code of requestCodes) assert.ok(!dump.includes(code) && !dump.includes(code.replace('-', '')), 'request code stored');
      const columns = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'plain_password'`);
      assert.equal(columns.rows.length, 0);
    });
    await test('12. API responses and logs do not expose sensitive password data', async () => {
      // Temporary passwords may appear only where they are meant to be delivered.
      const delivering = /\/auth\/reset-message$|\/admin\/reset-password\/\d+$/;
      for (const { path, text } of responses) {
        assert.ok(!/\$2[aby]\$|password_hash|temp_password_hash|ciphertext|message_public_key/.test(text), `${path} exposes a secret field`);
        for (const secret of secrets) assert.ok(!text.includes(secret), `${path} exposes a password`);
        if (!delivering.test(path)) {
          for (const temp of tempPasswords) assert.ok(!text.includes(temp), `${path} exposes a temporary password`);
        }
      }
      const logText = logged.join('\n');
      for (const secret of [...secrets, ...tempPasswords, ...requestCodes]) assert.ok(!logText.includes(secret), 'a secret was logged');
      assert.ok(!/\$2[aby]\$/.test(logText), 'a hash was logged');
    });
  } finally {
    await cleanup().catch((error) => print('Cleanup failed:', error.message));
    server.close();
    await db.pool.end();
  }

  print(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
};

run().catch(async (error) => {
  print(error);
  await cleanup().catch(() => {});
  process.exit(1);
});
