/**
 * Integration tests for the receiver wallet and NGO payment system.
 *
 * Runs the real Express app against the configured database (DATABASE_URL)
 * using temporary test users, then removes every row it created.
 * Requires migration 035_receiver_wallet.sql.
 *
 *   node scripts/test-wallet.js
 */
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../config/db');
const walletModel = require('../models/walletModel');
const userModel = require('../models/userModel');
const { parseTakaToPaisa } = require('../controllers/walletController');

const tag = `wallettest-${Date.now()}`;
const created = [];
let baseUrl;
let passed = 0;
let failed = 0;

const key = () => crypto.randomUUID();

const createUser = async (label, role, extra = {}) => {
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role, verification_status, parent_ngo_id)
     VALUES ($1, $2, 'x', $3, $4, $5) RETURNING id`,
    [`Test ${label}`, `${tag}-${label}@example.test`, role, extra.status || 'verified', extra.parent || null]
  );
  const id = result.rows[0].id;
  created.push(id);
  if (extra.ngoRow) {
    await db.query('INSERT INTO ngos (user_id, organization_name) VALUES ($1, $2)', [id, `Test NGO ${label}`]);
  }
  const token = jwt.sign({ id, role, parent_ngo_id: extra.parent || null }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });
  return { id, token };
};

const call = async (method, path, user, body) => {
  const response = await fetch(`${baseUrl}/api/wallet${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: `Bearer ${user.token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data };
};

const balanceOf = async (user) => (await call('GET', '/', user)).body.data.balance_paisa;

const topUp = async (user, amount) => {
  const started = await call('POST', '/topups', user, { amount, idempotency_key: key() });
  return call('POST', `/topups/${started.body.data.reference}/verify`, user, { outcome: 'success' });
};

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✘ ${name}\n      ${error.message.split('\n').join('\n      ')}`);
  }
};

const cleanup = async () => {
  if (created.length === 0) return;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE wallet_transactions DISABLE TRIGGER wallet_transactions_no_update_delete');
    await client.query('DELETE FROM wallet_transactions WHERE user_id = ANY($1)', [created]);
    await client.query('ALTER TABLE wallet_transactions ENABLE TRIGGER wallet_transactions_no_update_delete');
    await client.query('DELETE FROM ngo_payments WHERE receiver_id = ANY($1) OR ngo_user_id = ANY($1)', [created]);
    await client.query('DELETE FROM wallet_topups WHERE user_id = ANY($1)', [created]);
    await client.query('DELETE FROM wallet_accounts WHERE user_id = ANY($1)', [created]);
    await client.query('DELETE FROM notifications WHERE user_id = ANY($1)', [created]);
    await client.query('DELETE FROM ngos WHERE user_id = ANY($1)', [created]);
    await client.query('UPDATE users SET parent_ngo_id = NULL WHERE id = ANY($1)', [created]);
    await client.query('DELETE FROM users WHERE id = ANY($1)', [created]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cleanup failed — remove users with emails like', `${tag}-%`, error.message);
  } finally {
    client.release();
  }
};

const run = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const receiverA = await createUser('receiver-a', 'receiver');
    const receiverB = await createUser('receiver-b', 'receiver');
    const receiverUnverified = await createUser('receiver-unverified', 'receiver', { status: 'pending' });
    const ngo = await createUser('ngo', 'ngo', { ngoRow: true });
    const ngoPending = await createUser('ngo-pending', 'ngo', { status: 'pending', ngoRow: true });
    const ngoStaff = await createUser('ngo-staff', 'ngo', { parent: ngo.id });
    const admin = await createUser('admin', 'admin');

    console.log('\nAmount parsing');
    await test('parses taka strings to exact paisa', () => {
      assert.equal(parseTakaToPaisa('0.1'), 10);
      assert.equal(parseTakaToPaisa('1.05'), 105);
      assert.equal(parseTakaToPaisa('19.99'), 1999);
      assert.equal(parseTakaToPaisa('250'), 25000);
      for (const bad of ['', '-5', '1.999', 'abc', '1e3', '0x10', '1,000']) assert.equal(parseTakaToPaisa(bad), null, bad);
    });

    console.log('\nAccess control');
    await test('rejects requests without a token', async () => {
      assert.equal((await call('GET', '/', null)).status, 401);
    });
    await test('rejects non-receivers on receiver wallet routes', async () => {
      assert.equal((await call('GET', '/', ngo)).status, 403);
      assert.equal((await call('POST', '/payments', admin, {})).status, 403);
    });
    await test('new receiver wallet starts at zero', async () => {
      const res = await call('GET', '/', receiverA);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.balance_paisa, 0);
      assert.equal(res.body.data.payment_provider.simulated, true);
    });

    console.log('\nTop-ups');
    await test('rejects invalid top-up amounts', async () => {
      for (const amount of ['0', '-5', '10.999', 'abc', '60000', '5']) {
        const res = await call('POST', '/topups', receiverA, { amount, idempotency_key: key() });
        assert.equal(res.status, 400, `amount ${amount} -> ${res.status}`);
      }
    });
    let topupRef;
    await test('creates a pending top-up and replays it for the same key', async () => {
      const k = key();
      const first = await call('POST', '/topups', receiverA, { amount: '500', idempotency_key: k });
      assert.equal(first.status, 201);
      assert.equal(first.body.data.status, 'pending');
      assert.equal(first.body.data.is_simulated, true);
      const again = await call('POST', '/topups', receiverA, { amount: '500', idempotency_key: k });
      assert.equal(again.status, 200);
      assert.equal(again.body.data.reference, first.body.data.reference);
      assert.equal(await balanceOf(receiverA), 0, 'pending top-up must not credit');
      topupRef = first.body.data.reference;
    });
    await test('another receiver cannot see or verify the top-up (IDOR)', async () => {
      assert.equal((await call('GET', `/topups/${topupRef}`, receiverB)).status, 404);
      assert.equal((await call('POST', `/topups/${topupRef}/verify`, receiverB, { outcome: 'success' })).status, 404);
      assert.equal(await balanceOf(receiverB), 0);
    });
    await test('verified success credits the wallet exactly once', async () => {
      const res = await call('POST', `/topups/${topupRef}/verify`, receiverA, { outcome: 'success' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'completed');
      assert.equal(await balanceOf(receiverA), 50000);
      const dup = await call('POST', `/topups/${topupRef}/verify`, receiverA, { outcome: 'success' });
      assert.equal(dup.body.data.status, 'completed');
      assert.equal(await balanceOf(receiverA), 50000, 'duplicate verification must not credit twice');
    });
    await test('concurrent duplicate verifications credit once', async () => {
      const started = await call('POST', '/topups', receiverB, { amount: '100', idempotency_key: key() });
      const ref = started.body.data.reference;
      await Promise.all(Array.from({ length: 5 }, () => call('POST', `/topups/${ref}/verify`, receiverB, { outcome: 'success' })));
      assert.equal(await balanceOf(receiverB), 10000);
    });
    await test('failed top-up never credits, even if "success" arrives later', async () => {
      const started = await call('POST', '/topups', receiverA, { amount: '200', idempotency_key: key() });
      const ref = started.body.data.reference;
      const res = await call('POST', `/topups/${ref}/verify`, receiverA, { outcome: 'failed' });
      assert.equal(res.body.data.status, 'failed');
      const late = await call('POST', `/topups/${ref}/verify`, receiverA, { outcome: 'success' });
      assert.equal(late.body.data.status, 'failed');
      assert.equal(await balanceOf(receiverA), 50000);
    });
    await test('cancelled top-up is recorded and appears in history', async () => {
      const started = await call('POST', '/topups', receiverA, { amount: '50', idempotency_key: key() });
      await call('POST', `/topups/${started.body.data.reference}/verify`, receiverA, { outcome: 'cancelled' });
      const history = await call('GET', '/transactions?limit=50', receiverA);
      const statuses = history.body.data.map((t) => t.status);
      assert.ok(statuses.includes('cancelled') && statuses.includes('failed') && statuses.includes('completed'));
    });

    console.log('\nNGO eligibility');
    await test('lists only verified NGO organisation accounts', async () => {
      const ids = (await call('GET', '/ngos', receiverA)).body.data.map((n) => n.ngo_user_id);
      assert.ok(ids.includes(ngo.id));
      assert.ok(!ids.includes(ngoPending.id), 'pending NGO listed');
      assert.ok(!ids.includes(ngoStaff.id), 'staff account listed');
    });

    console.log('\nNGO payments');
    await test('rejects invalid payment amounts', async () => {
      for (const amount of ['0', '-1', '0.001', 'ten', '200000']) {
        const res = await call('POST', '/payments', receiverA, { ngo_user_id: ngo.id, amount, idempotency_key: key() });
        assert.equal(res.status, 400, `amount ${amount}`);
      }
    });
    await test('rejects ineligible NGOs and non-NGO payees', async () => {
      for (const target of [ngoPending.id, ngoStaff.id, receiverB.id, 999999999]) {
        const res = await call('POST', '/payments', receiverA, { ngo_user_id: target, amount: '10', idempotency_key: key() });
        assert.equal(res.status, 404, `payee ${target}`);
      }
    });
    await test('rejects unverified receivers', async () => {
      const res = await call('POST', '/payments', receiverUnverified, { ngo_user_id: ngo.id, amount: '10', idempotency_key: key() });
      assert.equal(res.status, 403);
    });
    await test('rejects payments above the balance', async () => {
      const res = await call('POST', '/payments', receiverA, { ngo_user_id: ngo.id, amount: '500.01', idempotency_key: key() });
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'INSUFFICIENT_FUNDS');
      assert.equal(await balanceOf(receiverA), 50000);
    });
    await test('preview validates without moving money', async () => {
      const res = await call('POST', '/payments/preview', receiverA, { ngo_user_id: ngo.id, amount: '100' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.remaining_paisa, 40000);
      assert.equal(await balanceOf(receiverA), 50000);
    });
    let paymentRef;
    await test('successful payment debits the wallet and returns a receipt', async () => {
      const k = key();
      const res = await call('POST', '/payments', receiverA, { ngo_user_id: ngo.id, amount: '100', description: 'Meal support', idempotency_key: k });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'completed');
      assert.equal(res.body.data.amount_paisa, 10000);
      assert.equal(res.body.data.balance_after_paisa, 40000);
      assert.equal(res.body.data.ngo_name, 'Test NGO ngo');
      paymentRef = res.body.data.reference;

      const replay = await call('POST', '/payments', receiverA, { ngo_user_id: ngo.id, amount: '100', idempotency_key: k });
      assert.equal(replay.status, 200);
      assert.equal(replay.body.replayed, true);
      assert.equal(replay.body.data.reference, paymentRef);
      assert.equal(await balanceOf(receiverA), 40000, 'replayed payment must not charge twice');
    });
    await test('concurrent double-submit with one key charges once', async () => {
      const k = key();
      const results = await Promise.all(Array.from({ length: 4 }, () =>
        call('POST', '/payments', receiverA, { ngo_user_id: ngo.id, amount: '10', idempotency_key: k })));
      const refs = new Set(results.map((r) => r.body.data?.reference));
      assert.equal(refs.size, 1, `statuses: ${results.map((r) => r.status)}`);
      assert.equal(await balanceOf(receiverA), 39000);
    });
    await test('simultaneous payments cannot overspend', async () => {
      // 39000 paisa balance; 8 x 6000 = 48000 requested, so at most 6 succeed.
      const results = await Promise.all(Array.from({ length: 8 }, () =>
        call('POST', '/payments', receiverA, { ngo_user_id: ngo.id, amount: '60', idempotency_key: key() })));
      const ok = results.filter((r) => r.status === 201).length;
      const rejected = results.filter((r) => r.status === 409).length;
      assert.equal(ok, 6, `statuses: ${results.map((r) => r.status)}`);
      assert.equal(rejected, 2);
      assert.equal(await balanceOf(receiverA), 3000);
    });
    await test('another receiver cannot read the receipt (IDOR)', async () => {
      assert.equal((await call('GET', `/payments/${paymentRef}`, receiverB)).status, 404);
      assert.equal((await call('GET', `/payments/${paymentRef}`, receiverA)).status, 200);
    });
    await test('rolls back every write when the transaction fails midway', async () => {
      const before = await balanceOf(receiverA);
      const ledgerBefore = (await db.query('SELECT COUNT(*)::int c FROM wallet_transactions WHERE user_id = $1', [receiverA.id])).rows[0].c;
      // Make the final statement (NGO notification) fail after the debit and ledger insert.
      const originalConnect = db.pool.connect.bind(db.pool);
      db.pool.connect = async () => {
        const client = await originalConnect();
        const originalQuery = client.query.bind(client);
        client.query = (text, params) => (String(text).includes('INSERT INTO notifications')
          ? Promise.reject(new Error('injected failure'))
          : originalQuery(text, params));
        const release = client.release.bind(client);
        client.release = (...args) => { client.query = originalQuery; return release(...args); };
        return client;
      };
      try {
        await assert.rejects(walletModel.createNgoPayment({
          receiverId: receiverA.id, ngoUserId: ngo.id, amountPaisa: 1000, description: 'rollback', idempotencyKey: key()
        }), /injected failure/);
      } finally {
        db.pool.connect = originalConnect;
      }
      assert.equal(await balanceOf(receiverA), before);
      const ledgerAfter = (await db.query('SELECT COUNT(*)::int c FROM wallet_transactions WHERE user_id = $1', [receiverA.id])).rows[0].c;
      assert.equal(ledgerAfter, ledgerBefore);
      const orphan = await db.query(`SELECT 1 FROM ngo_payments WHERE receiver_id = $1 AND description = 'rollback'`, [receiverA.id]);
      assert.equal(orphan.rows.length, 0);
    });

    console.log('\nNGO dashboard');
    await test('NGO sees only its own payments with safe receiver fields', async () => {
      const res = await call('GET', '/ngo/payments?limit=50', ngo);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.summary.completed_count, 8);
      assert.equal(res.body.data.summary.completed_paisa, 10000 + 1000 + 6 * 6000);
      assert.equal(res.body.data.payout_available, false);
      const row = res.body.data.payments[0];
      for (const field of ['receiver_id', 'email', 'phone', 'nid', 'password_hash', 'idempotency_key']) {
        assert.ok(!(field in row), `exposes ${field}`);
      }
      const other = await call('GET', '/ngo/payments', ngoPending);
      assert.equal(other.body.data.summary.total_count, 0);
    });
    await test('NGO staff and receivers cannot open the NGO payment dashboard', async () => {
      assert.equal((await call('GET', '/ngo/payments', ngoStaff)).status, 403);
      assert.equal((await call('GET', '/ngo/payments', receiverA)).status, 403);
    });

    console.log('\nRefunds');
    await test('only admins can refund', async () => {
      assert.equal((await call('POST', `/admin/payments/${paymentRef}/refund`, receiverA, { reason: 'please refund' })).status, 403);
      assert.equal((await call('POST', `/admin/payments/${paymentRef}/refund`, ngo, { reason: 'please refund' })).status, 403);
    });
    await test('admin refund credits the receiver once and is audited', async () => {
      const before = await balanceOf(receiverA);
      const res = await call('POST', `/admin/payments/${paymentRef}/refund`, admin, { reason: 'Duplicate test payment' });
      assert.equal(res.status, 200);
      assert.equal(await balanceOf(receiverA), before + 10000);
      const again = await call('POST', `/admin/payments/${paymentRef}/refund`, admin, { reason: 'Duplicate test payment' });
      assert.equal(again.status, 409);
      assert.equal(await balanceOf(receiverA), before + 10000);
      const receipt = await call('GET', `/payments/${paymentRef}`, receiverA);
      assert.equal(receipt.body.data.status, 'refunded');
      const summary = (await call('GET', '/ngo/payments', ngo)).body.data.summary;
      assert.equal(summary.failed_refunded_count, 1);
    });

    console.log('\nDatabase safeguards');
    await test('ledger rows cannot be edited or deleted', async () => {
      await assert.rejects(db.query('UPDATE wallet_transactions SET amount_paisa = 1 WHERE user_id = $1', [receiverA.id]), /append-only/);
      await assert.rejects(db.query('DELETE FROM wallet_transactions WHERE user_id = $1', [receiverA.id]), /append-only/);
    });
    await test('wallet balance cannot go negative', async () => {
      await assert.rejects(db.query('UPDATE wallet_accounts SET balance_paisa = -1 WHERE user_id = $1', [receiverA.id]), /check constraint/);
    });
    await test('ledger balance matches the wallet balance', async () => {
      const result = await db.query(
        `SELECT w.balance_paisa,
                COALESCE(SUM(CASE WHEN t.direction = 'credit' THEN t.amount_paisa ELSE -t.amount_paisa END), 0) AS ledger
         FROM wallet_accounts w LEFT JOIN wallet_transactions t ON t.wallet_id = w.id
         WHERE w.user_id = $1 GROUP BY w.balance_paisa`,
        [receiverA.id]
      );
      assert.equal(Number(result.rows[0].balance_paisa), Number(result.rows[0].ledger));
    });
    await test('users with wallet history cannot be deleted', async () => {
      await assert.rejects(userModel.deleteUserById(receiverA.id), (error) => error.statusCode === 409);
    });
    await test('users with only an empty wallet can still be deleted', async () => {
      const temp = await createUser('receiver-empty', 'receiver');
      await call('GET', '/', temp);
      const deleted = await userModel.deleteUserById(temp.id);
      assert.equal(deleted.id, temp.id);
      created.splice(created.indexOf(temp.id), 1);
    });
  } finally {
    await cleanup();
    server.close();
    await db.pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
};

run().catch(async (error) => {
  console.error(error);
  await cleanup().catch(() => {});
  process.exit(1);
});
