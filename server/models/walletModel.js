const crypto = require('crypto');
const db = require('../config/db');

// All amounts in this module are integer paisa (1 BDT = 100 paisa).

const walletError = (status, message, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const newReference = (prefix) => {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${day}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
};

const toInt = (value) => (value === null || value === undefined ? 0 : Number(value));

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

const ensureWallet = async (executor, userId) => {
  await executor.query(
    'INSERT INTO wallet_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );
};

const lockWallet = async (client, userId) => {
  await ensureWallet(client, userId);
  const result = await client.query(
    'SELECT id, user_id, balance_paisa, status FROM wallet_accounts WHERE user_id = $1 FOR UPDATE',
    [userId]
  );
  return { ...result.rows[0], balance_paisa: toInt(result.rows[0].balance_paisa) };
};

const insertLedgerEntry = (client, entry) => client.query(
  `INSERT INTO wallet_transactions
     (reference, wallet_id, user_id, type, direction, amount_paisa, balance_after_paisa,
      description, topup_id, ngo_payment_id, is_simulated)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
   RETURNING reference, created_at`,
  [
    newReference('TXN'), entry.walletId, entry.userId, entry.type, entry.direction,
    entry.amountPaisa, entry.balanceAfterPaisa, entry.description,
    entry.topupId || null, entry.ngoPaymentId || null, Boolean(entry.isSimulated)
  ]
);

const notify = (client, userId, title, message, type, link, metadata) => client.query(
  `INSERT INTO notifications (user_id, title, message, type, link, metadata)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [userId, title, message, type, link, JSON.stringify(metadata)]
);

const formatTaka = (paisa) => `৳${(toInt(paisa) / 100).toFixed(2)}`;

/* ---------------------------------------------------------------- Wallet -- */

const getWalletSummary = async (userId) => {
  await ensureWallet(db, userId);
  const result = await db.query(
    `SELECT w.balance_paisa, w.status, w.currency,
            COALESCE((SELECT SUM(amount_paisa) FROM wallet_transactions
                      WHERE user_id = $1 AND type = 'topup'), 0) AS total_added_paisa,
            COALESCE((SELECT SUM(amount_paisa) FROM ngo_payments
                      WHERE receiver_id = $1 AND status = 'completed'), 0) AS total_spent_paisa,
            COALESCE((SELECT SUM(amount_paisa) FROM wallet_transactions
                      WHERE user_id = $1 AND type = 'refund'), 0) AS total_refunded_paisa,
            EXISTS (SELECT 1 FROM wallet_transactions
                    WHERE user_id = $1 AND is_simulated) AS has_simulated_funds
     FROM wallet_accounts w
     WHERE w.user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return {
    balance_paisa: toInt(row.balance_paisa),
    total_added_paisa: toInt(row.total_added_paisa),
    total_spent_paisa: toInt(row.total_spent_paisa),
    total_refunded_paisa: toInt(row.total_refunded_paisa),
    status: row.status,
    currency: row.currency,
    has_simulated_funds: row.has_simulated_funds
  };
};

// Ledger entries plus top-ups that never credited the wallet (pending/failed/cancelled).
const historySql = `
  SELECT t.reference, t.type, t.direction, t.amount_paisa, t.balance_after_paisa,
         t.description, t.is_simulated, t.created_at,
         CASE WHEN t.type = 'ngo_payment' THEN np.status ELSE 'completed' END AS status,
         np.reference AS payment_reference,
         COALESCE(n.organization_name, nu.name) AS ngo_name
  FROM wallet_transactions t
  LEFT JOIN ngo_payments np ON np.id = t.ngo_payment_id
  LEFT JOIN users nu ON nu.id = np.ngo_user_id
  LEFT JOIN ngos n ON n.id = np.ngo_id
  WHERE t.user_id = $1
  UNION ALL
  SELECT tp.reference, 'topup', 'credit', tp.amount_paisa, NULL,
         'Wallet top-up', tp.is_simulated, tp.created_at, tp.status,
         NULL, NULL
  FROM wallet_topups tp
  WHERE tp.user_id = $1 AND tp.status <> 'completed'`;

const listTransactions = async (userId, { limit, offset }) => {
  const [rows, count] = await Promise.all([
    db.query(`${historySql} ORDER BY created_at DESC, reference DESC LIMIT $2 OFFSET $3`, [userId, limit, offset]),
    db.query(`SELECT COUNT(*)::int AS total FROM (${historySql}) h`, [userId])
  ]);
  return {
    items: rows.rows.map((row) => ({
      ...row,
      amount_paisa: toInt(row.amount_paisa),
      balance_after_paisa: row.balance_after_paisa === null ? null : toInt(row.balance_after_paisa)
    })),
    total: count.rows[0].total
  };
};

/* ---------------------------------------------------------------- Top-ups -- */

const topupColumns = `reference, amount_paisa, provider, provider_txn_id, status, is_simulated,
  failure_reason, created_at, updated_at, completed_at`;

const createTopup = async ({ userId, amountPaisa, idempotencyKey, provider }) => {
  await ensureWallet(db, userId);
  const existing = await db.query(
    `SELECT ${topupColumns} FROM wallet_topups WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, idempotencyKey]
  );
  if (existing.rows[0]) return { topup: existing.rows[0], replayed: true };

  const checkout = await provider.createCheckout();
  const result = await db.query(
    `INSERT INTO wallet_topups
       (reference, user_id, wallet_id, amount_paisa, provider, provider_txn_id, is_simulated, idempotency_key)
     SELECT $1, $2, w.id, $3, $4, $5, $6, $7 FROM wallet_accounts w WHERE w.user_id = $2
     ON CONFLICT (user_id, idempotency_key) DO NOTHING
     RETURNING ${topupColumns}`,
    [newReference('TOP'), userId, amountPaisa, provider.name, checkout.providerTxnId, provider.isSimulated, idempotencyKey]
  );
  if (result.rows[0]) return { topup: result.rows[0], replayed: false };

  // Lost a race with an identical request; return the row that won.
  const winner = await db.query(
    `SELECT ${topupColumns} FROM wallet_topups WHERE user_id = $1 AND idempotency_key = $2`,
    [userId, idempotencyKey]
  );
  return { topup: winner.rows[0], replayed: true };
};

const getTopup = async (userId, reference) => {
  const result = await db.query(
    `SELECT ${topupColumns} FROM wallet_topups WHERE user_id = $1 AND reference = $2`,
    [userId, reference]
  );
  return result.rows[0] || null;
};

/**
 * Finalises a pending top-up after asking the provider whether it was paid.
 * Idempotent: a top-up that is no longer pending is returned unchanged, and
 * the wallet is credited at most once (row lock + unique ledger index).
 */
const settleTopup = async ({ userId, reference, provider, verificationInput }) => withTransaction(async (client) => {
  const locked = await client.query(
    `SELECT id, wallet_id, user_id, amount_paisa, provider, status, is_simulated
     FROM wallet_topups WHERE user_id = $1 AND reference = $2 FOR UPDATE`,
    [userId, reference]
  );
  const topup = locked.rows[0];
  if (!topup) throw walletError(404, 'Top-up not found.');

  if (topup.status === 'pending') {
    if (topup.provider !== provider.name) {
      throw walletError(409, 'This top-up was started with a different payment provider and cannot be verified here.');
    }
    const verdict = await provider.verifyPayment(topup, verificationInput || {});

    if (verdict.status === 'completed') {
      const wallet = await lockWallet(client, userId);
      const amount = toInt(topup.amount_paisa);
      const updated = await client.query(
        `UPDATE wallet_accounts SET balance_paisa = balance_paisa + $1, updated_at = NOW()
         WHERE id = $2 RETURNING balance_paisa`,
        [amount, wallet.id]
      );
      await insertLedgerEntry(client, {
        walletId: wallet.id,
        userId,
        type: 'topup',
        direction: 'credit',
        amountPaisa: amount,
        balanceAfterPaisa: toInt(updated.rows[0].balance_paisa),
        description: topup.is_simulated ? 'Wallet top-up (sandbox test money)' : 'Wallet top-up',
        topupId: topup.id,
        isSimulated: topup.is_simulated
      });
      await client.query(
        `UPDATE wallet_topups SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [topup.id]
      );
    } else if (verdict.status === 'failed' || verdict.status === 'cancelled') {
      await client.query(
        `UPDATE wallet_topups SET status = $1, failure_reason = $2, updated_at = NOW() WHERE id = $3`,
        [verdict.status, String(verdict.reason || '').slice(0, 255) || null, topup.id]
      );
    }
    // Any other verdict (still pending at the provider) leaves the row untouched.
  }

  const fresh = await client.query(`SELECT ${topupColumns} FROM wallet_topups WHERE id = $1`, [topup.id]);
  return fresh.rows[0];
});

/* ----------------------------------------------------------- NGO payments -- */

// An NGO can receive wallet payments when its organisation account (not a
// staff account) has been verified by an admin.
const eligibleNgoSql = `
  SELECT u.id AS ngo_user_id, n.id AS ngo_id,
         COALESCE(NULLIF(TRIM(n.organization_name), ''), u.name) AS name,
         n.address
  FROM users u
  JOIN ngos n ON n.user_id = u.id
  WHERE u.role::text = 'ngo'
    AND u.parent_ngo_id IS NULL
    AND u.verification_status = 'verified'`;

const listEligibleNgos = async () => {
  const result = await db.query(`${eligibleNgoSql} ORDER BY name ASC`);
  return result.rows;
};

const findEligibleNgo = async (executor, ngoUserId, lock = false) => {
  const result = await executor.query(
    `${eligibleNgoSql} AND u.id = $1${lock ? ' FOR SHARE OF u' : ''}`,
    [ngoUserId]
  );
  return result.rows[0] || null;
};

const paymentColumns = (alias = 'np') => `${alias}.reference, ${alias}.amount_paisa, ${alias}.description,
  ${alias}.status, ${alias}.settlement_status, ${alias}.created_at, ${alias}.refunded_at, ${alias}.refund_reason`;

const getPaymentForReceiver = async (receiverId, reference) => {
  const result = await db.query(
    `SELECT ${paymentColumns()}, np.ngo_user_id,
            COALESCE(n.organization_name, u.name) AS ngo_name,
            t.balance_after_paisa
     FROM ngo_payments np
     JOIN users u ON u.id = np.ngo_user_id
     LEFT JOIN ngos n ON n.id = np.ngo_id
     LEFT JOIN wallet_transactions t ON t.ngo_payment_id = np.id AND t.type = 'ngo_payment'
     WHERE np.receiver_id = $1 AND np.reference = $2`,
    [receiverId, reference]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { ...row, amount_paisa: toInt(row.amount_paisa), balance_after_paisa: toInt(row.balance_after_paisa) };
};

/**
 * Validates a payment without moving money (used for the confirmation screen).
 */
const previewNgoPayment = async ({ receiverId, ngoUserId, amountPaisa }) => {
  if (receiverId === ngoUserId) throw walletError(400, 'You cannot pay yourself.');
  const ngo = await findEligibleNgo(db, ngoUserId);
  if (!ngo) throw walletError(404, 'This NGO is not available for wallet payments.');
  const wallet = await getWalletSummary(receiverId);
  if (wallet.status !== 'active') throw walletError(403, 'Your wallet is frozen. Contact ShareMeal support.');
  if (wallet.balance_paisa < amountPaisa) {
    throw walletError(409, `Insufficient wallet balance. Available: ${formatTaka(wallet.balance_paisa)}.`, { code: 'INSUFFICIENT_FUNDS' });
  }
  return {
    ngo: { ngo_user_id: ngo.ngo_user_id, name: ngo.name },
    amount_paisa: amountPaisa,
    balance_paisa: wallet.balance_paisa,
    remaining_paisa: wallet.balance_paisa - amountPaisa
  };
};

/**
 * Moves money from the receiver's wallet to an NGO as one atomic ledger
 * operation. The wallet row lock serialises concurrent payments, so balance
 * checks cannot race; the idempotency key makes retries return the original
 * payment instead of charging twice.
 */
const createNgoPayment = async ({ receiverId, ngoUserId, amountPaisa, description, idempotencyKey }) => {
  try {
    return await withTransaction(async (client) => {
      const wallet = await lockWallet(client, receiverId);

      const existing = await client.query(
        'SELECT reference FROM ngo_payments WHERE receiver_id = $1 AND idempotency_key = $2',
        [receiverId, idempotencyKey]
      );
      if (existing.rows[0]) return { reference: existing.rows[0].reference, replayed: true };

      if (wallet.status !== 'active') throw walletError(403, 'Your wallet is frozen. Contact ShareMeal support.');
      if (receiverId === ngoUserId) throw walletError(400, 'You cannot pay yourself.');

      const ngo = await findEligibleNgo(client, ngoUserId, true);
      if (!ngo) throw walletError(404, 'This NGO is not available for wallet payments.');

      if (wallet.balance_paisa < amountPaisa) {
        throw walletError(409, `Insufficient wallet balance. Available: ${formatTaka(wallet.balance_paisa)}.`, { code: 'INSUFFICIENT_FUNDS' });
      }

      const payment = await client.query(
        `INSERT INTO ngo_payments
           (reference, receiver_id, ngo_user_id, ngo_id, amount_paisa, description, status, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)
         RETURNING id, reference`,
        [newReference('PAY'), receiverId, ngo.ngo_user_id, ngo.ngo_id, amountPaisa, description || null, idempotencyKey]
      );
      const { id: paymentId, reference } = payment.rows[0];

      const updated = await client.query(
        `UPDATE wallet_accounts SET balance_paisa = balance_paisa - $1, updated_at = NOW()
         WHERE id = $2 RETURNING balance_paisa`,
        [amountPaisa, wallet.id]
      );

      // Payments draw on a balance that may contain sandbox credits.
      const simulated = await client.query(
        'SELECT EXISTS (SELECT 1 FROM wallet_transactions WHERE wallet_id = $1 AND is_simulated) AS any',
        [wallet.id]
      );

      await insertLedgerEntry(client, {
        walletId: wallet.id,
        userId: receiverId,
        type: 'ngo_payment',
        direction: 'debit',
        amountPaisa,
        balanceAfterPaisa: toInt(updated.rows[0].balance_paisa),
        description: `Payment to ${ngo.name}`.slice(0, 255),
        ngoPaymentId: paymentId,
        isSimulated: simulated.rows[0].any
      });

      await notify(
        client, ngo.ngo_user_id, 'Wallet payment received',
        `A receiver recorded a ${formatTaka(amountPaisa)} wallet payment to your NGO (ref ${reference}).`,
        'wallet_payment', '/ngo/payments', { reference }
      );

      return { reference, replayed: false };
    });
  } catch (error) {
    // Two identical submissions raced past the replay check; the unique key kept one.
    if (error.code === '23505' && /idempotency/.test(error.constraint || error.detail || '')) {
      const winner = await db.query(
        'SELECT reference FROM ngo_payments WHERE receiver_id = $1 AND idempotency_key = $2',
        [receiverId, idempotencyKey]
      );
      if (winner.rows[0]) return { reference: winner.rows[0].reference, replayed: true };
    }
    throw error;
  }
};

/* ---------------------------------------------------------- NGO dashboard -- */

const getNgoPaymentSummary = async (ngoUserId) => {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total_count,
            COALESCE(SUM(amount_paisa), 0) AS total_paisa,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
            COALESCE(SUM(amount_paisa) FILTER (WHERE status = 'completed'), 0) AS completed_paisa,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
            COALESCE(SUM(amount_paisa) FILTER (WHERE status = 'pending'), 0) AS pending_paisa,
            COUNT(*) FILTER (WHERE status IN ('failed', 'refunded'))::int AS failed_refunded_count,
            COALESCE(SUM(amount_paisa) FILTER (WHERE status IN ('failed', 'refunded')), 0) AS failed_refunded_paisa,
            COALESCE(SUM(amount_paisa) FILTER (WHERE status = 'completed' AND settlement_status = 'unsettled'), 0) AS unsettled_paisa
     FROM ngo_payments WHERE ngo_user_id = $1`,
    [ngoUserId]
  );
  const row = result.rows[0];
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toInt(value)]));
};

const listNgoPayments = async (ngoUserId, { limit, offset }) => {
  const [rows, count] = await Promise.all([
    db.query(
      // Only the receiver's display name is shared with the NGO.
      `SELECT ${paymentColumns()}, r.name AS receiver_name
       FROM ngo_payments np
       JOIN users r ON r.id = np.receiver_id
       WHERE np.ngo_user_id = $1
       ORDER BY np.created_at DESC, np.id DESC
       LIMIT $2 OFFSET $3`,
      [ngoUserId, limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM ngo_payments WHERE ngo_user_id = $1', [ngoUserId])
  ]);
  return {
    items: rows.rows.map((row) => ({ ...row, amount_paisa: toInt(row.amount_paisa) })),
    total: count.rows[0].total
  };
};

/* ---------------------------------------------------------------- Refunds -- */

/**
 * Admin-only reversal of a completed internal payment back to the receiver's
 * wallet. Records an auditable refund ledger entry; nothing is deleted.
 */
const refundNgoPayment = async ({ reference, adminId, reason }) => withTransaction(async (client) => {
  const locked = await client.query(
    `SELECT id, receiver_id, ngo_user_id, amount_paisa, status, settlement_status
     FROM ngo_payments WHERE reference = $1 FOR UPDATE`,
    [reference]
  );
  const payment = locked.rows[0];
  if (!payment) throw walletError(404, 'Payment not found.');
  if (payment.status === 'refunded') throw walletError(409, 'This payment has already been refunded.');
  if (payment.status !== 'completed') throw walletError(409, `Only completed payments can be refunded (current status: ${payment.status}).`);
  if (payment.settlement_status === 'settled') {
    throw walletError(409, 'This payment was already paid out to the NGO; it must be refunded through the payout provider.');
  }

  const wallet = await lockWallet(client, payment.receiver_id);
  const amount = toInt(payment.amount_paisa);
  const updated = await client.query(
    `UPDATE wallet_accounts SET balance_paisa = balance_paisa + $1, updated_at = NOW()
     WHERE id = $2 RETURNING balance_paisa`,
    [amount, wallet.id]
  );
  const debit = await client.query(
    `SELECT is_simulated FROM wallet_transactions WHERE ngo_payment_id = $1 AND type = 'ngo_payment'`,
    [payment.id]
  );
  await insertLedgerEntry(client, {
    walletId: wallet.id,
    userId: payment.receiver_id,
    type: 'refund',
    direction: 'credit',
    amountPaisa: amount,
    balanceAfterPaisa: toInt(updated.rows[0].balance_paisa),
    description: `Refund of payment ${reference}`,
    ngoPaymentId: payment.id,
    isSimulated: Boolean(debit.rows[0]?.is_simulated)
  });
  await client.query(
    `UPDATE ngo_payments
     SET status = 'refunded', refund_reason = $1, refunded_by = $2, refunded_at = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [reason, adminId, payment.id]
  );

  const message = `Payment ${reference} (${formatTaka(amount)}) was refunded to the receiver's wallet by an admin.`;
  await notify(client, payment.receiver_id, 'Payment refunded', message, 'wallet_refund', '/receiver/wallet', { reference });
  await notify(client, payment.ngo_user_id, 'Payment refunded', message, 'wallet_refund', '/ngo/payments', { reference });

  return { reference, status: 'refunded', amount_paisa: amount };
});

module.exports = {
  getWalletSummary,
  listTransactions,
  createTopup,
  getTopup,
  settleTopup,
  listEligibleNgos,
  previewNgoPayment,
  createNgoPayment,
  getPaymentForReceiver,
  getNgoPaymentSummary,
  listNgoPayments,
  refundNgoPayment
};
