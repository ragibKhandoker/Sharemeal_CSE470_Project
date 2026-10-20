const db = require('../config/db');
const walletModel = require('../models/walletModel');
const { getProvider, getProviderName } = require('../services/paymentProvider');

const TOPUP_MIN_PAISA = 10 * 100;
const TOPUP_MAX_PAISA = 50000 * 100;
const PAYMENT_MIN_PAISA = 1 * 100;
const PAYMENT_MAX_PAISA = 100000 * 100;

/**
 * Parses a taka amount ("150", "150.5", "150.50") into integer paisa without
 * floating-point arithmetic. Returns null for anything else.
 */
const parseTakaToPaisa = (value) => {
  const text = String(value ?? '').trim();
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
};

const parseIdempotencyKey = (value) => {
  const key = String(value || '').trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(key) ? key : null;
};

const parsePage = (query) => {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 50);
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
};

const cleanText = (value, max) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

const taka = (paisa) => `৳${(paisa / 100).toFixed(2)}`;

const sendKnownError = (res, error) => {
  if (!error.status) return false;
  res.status(error.status).json({ message: error.message, ...(error.code ? { code: error.code } : {}) });
  return true;
};

const providerInfo = () => {
  const provider = getProvider();
  return {
    name: getProviderName(),
    available: Boolean(provider),
    simulated: provider ? provider.isSimulated : null
  };
};

const isVerifiedReceiver = async (userId) => {
  const result = await db.query(
    `SELECT verification_status FROM users WHERE id = $1 AND role::text = 'receiver'`,
    [userId]
  );
  return result.rows[0]?.verification_status === 'verified';
};

/* --------------------------------------------------------------- Receiver -- */

const getWallet = async (req, res, next) => {
  try {
    const [summary, recent] = await Promise.all([
      walletModel.getWalletSummary(req.user.id),
      walletModel.listTransactions(req.user.id, { limit: 5, offset: 0 })
    ]);
    return res.json({ data: { ...summary, recent_transactions: recent.items, payment_provider: providerInfo() } });
  } catch (error) { next(error); }
};

const getTransactions = async (req, res, next) => {
  try {
    const { limit, page, offset } = parsePage(req.query);
    const result = await walletModel.listTransactions(req.user.id, { limit, offset });
    return res.json({ data: result.items, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
  } catch (error) { next(error); }
};

const createTopup = async (req, res, next) => {
  try {
    const provider = getProvider();
    if (!provider) {
      return res.status(503).json({
        message: `Wallet top-ups are unavailable: payment provider "${getProviderName()}" is not configured on this server.`
      });
    }
    const amountPaisa = parseTakaToPaisa(req.body.amount);
    if (amountPaisa === null || amountPaisa < TOPUP_MIN_PAISA || amountPaisa > TOPUP_MAX_PAISA) {
      return res.status(400).json({ message: `Enter an amount between ${taka(TOPUP_MIN_PAISA)} and ${taka(TOPUP_MAX_PAISA)}.` });
    }
    const idempotencyKey = parseIdempotencyKey(req.body.idempotency_key);
    if (!idempotencyKey) return res.status(400).json({ message: 'Missing or invalid request key. Refresh and try again.' });

    const { topup, replayed } = await walletModel.createTopup({ userId: req.user.id, amountPaisa, idempotencyKey, provider });
    if (Number(topup.amount_paisa) !== amountPaisa) {
      return res.status(409).json({ message: 'This request key was already used for a different amount. Refresh and try again.' });
    }
    return res.status(replayed ? 200 : 201).json({
      message: provider.isSimulated
        ? 'Sandbox top-up started. No real money will be charged.'
        : 'Top-up started. Complete the payment with the provider.',
      data: topup
    });
  } catch (error) {
    if (sendKnownError(res, error)) return;
    next(error);
  }
};

const getTopup = async (req, res, next) => {
  try {
    const topup = await walletModel.getTopup(req.user.id, String(req.params.reference));
    if (!topup) return res.status(404).json({ message: 'Top-up not found.' });
    return res.json({ data: topup });
  } catch (error) { next(error); }
};

/**
 * Verifies a top-up with the provider and credits the wallet only if the
 * provider confirms payment. For the sandbox provider the body carries the
 * outcome picked on the simulated checkout screen.
 */
const verifyTopup = async (req, res, next) => {
  try {
    const provider = getProvider();
    if (!provider) return res.status(503).json({ message: 'Payment provider is not configured on this server.' });

    const outcome = String(req.body.outcome || '');
    if (provider.isSimulated && !['success', 'failed', 'cancelled'].includes(outcome)) {
      return res.status(400).json({ message: 'Choose a sandbox outcome: success, failed or cancelled.' });
    }
    const topup = await walletModel.settleTopup({
      userId: req.user.id,
      reference: String(req.params.reference),
      provider,
      verificationInput: { outcome }
    });
    const messages = {
      completed: `${taka(Number(topup.amount_paisa))} was added to your wallet${topup.is_simulated ? ' (sandbox test money)' : ''}.`,
      failed: 'The payment failed. Your wallet was not charged or credited.',
      cancelled: 'The top-up was cancelled. Your wallet was not credited.',
      pending: 'The payment is still pending with the provider.'
    };
    return res.json({ message: messages[topup.status], data: topup });
  } catch (error) {
    if (sendKnownError(res, error)) return;
    next(error);
  }
};

const getEligibleNgos = async (req, res, next) => {
  try {
    return res.json({ data: await walletModel.listEligibleNgos() });
  } catch (error) { next(error); }
};

const parsePaymentInput = (body) => {
  const ngoUserId = Number(body.ngo_user_id);
  if (!Number.isSafeInteger(ngoUserId) || ngoUserId <= 0) return { error: 'Choose an NGO to pay.' };
  const amountPaisa = parseTakaToPaisa(body.amount);
  if (amountPaisa === null || amountPaisa < PAYMENT_MIN_PAISA || amountPaisa > PAYMENT_MAX_PAISA) {
    return { error: `Enter an amount between ${taka(PAYMENT_MIN_PAISA)} and ${taka(PAYMENT_MAX_PAISA)} (up to 2 decimal places).` };
  }
  return { ngoUserId, amountPaisa };
};

const previewPayment = async (req, res, next) => {
  try {
    const input = parsePaymentInput(req.body);
    if (input.error) return res.status(400).json({ message: input.error });
    if (!(await isVerifiedReceiver(req.user.id))) {
      return res.status(403).json({ message: 'Verify your receiver profile before paying an NGO.' });
    }
    const preview = await walletModel.previewNgoPayment({ receiverId: req.user.id, ...input });
    return res.json({ data: preview });
  } catch (error) {
    if (sendKnownError(res, error)) return;
    next(error);
  }
};

const createPayment = async (req, res, next) => {
  try {
    const input = parsePaymentInput(req.body);
    if (input.error) return res.status(400).json({ message: input.error });
    const idempotencyKey = parseIdempotencyKey(req.body.idempotency_key);
    if (!idempotencyKey) return res.status(400).json({ message: 'Missing or invalid request key. Refresh and try again.' });
    if (!(await isVerifiedReceiver(req.user.id))) {
      return res.status(403).json({ message: 'Verify your receiver profile before paying an NGO.' });
    }

    const { reference, replayed } = await walletModel.createNgoPayment({
      receiverId: req.user.id,
      ngoUserId: input.ngoUserId,
      amountPaisa: input.amountPaisa,
      description: cleanText(req.body.description, 200),
      idempotencyKey
    });
    const receipt = await walletModel.getPaymentForReceiver(req.user.id, reference);
    return res.status(replayed ? 200 : 201).json({
      message: replayed ? 'This payment was already processed.' : 'Payment recorded in the ShareMeal wallet ledger.',
      replayed,
      data: receipt
    });
  } catch (error) {
    if (sendKnownError(res, error)) return;
    next(error);
  }
};

const getPayment = async (req, res, next) => {
  try {
    const receipt = await walletModel.getPaymentForReceiver(req.user.id, String(req.params.reference));
    if (!receipt) return res.status(404).json({ message: 'Payment not found.' });
    return res.json({ data: receipt });
  } catch (error) { next(error); }
};

/* -------------------------------------------------------------------- NGO -- */

// Payment records belong to the NGO organisation account; staff accounts
// (users with parent_ngo_id) are not given access to financial data.
const requireNgoOwner = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id FROM users WHERE id = $1 AND role::text = 'ngo' AND parent_ngo_id IS NULL`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(403).json({ message: 'Only the NGO account owner can view wallet payments.' });
    next();
  } catch (error) { next(error); }
};

const getNgoPayments = async (req, res, next) => {
  try {
    const { limit, page, offset } = parsePage(req.query);
    const [summary, list] = await Promise.all([
      walletModel.getNgoPaymentSummary(req.user.id),
      walletModel.listNgoPayments(req.user.id, { limit, offset })
    ]);
    return res.json({
      data: { summary, payments: list.items, payout_available: false },
      pagination: { page, limit, total: list.total, pages: Math.ceil(list.total / limit) }
    });
  } catch (error) { next(error); }
};

/* ------------------------------------------------------------------ Admin -- */

const refundPayment = async (req, res, next) => {
  try {
    const reason = cleanText(req.body.reason, 255);
    if (reason.length < 5) return res.status(400).json({ message: 'Give a refund reason (at least 5 characters).' });
    const result = await walletModel.refundNgoPayment({
      reference: String(req.params.reference),
      adminId: req.user.id,
      reason
    });
    return res.json({ message: 'Payment refunded to the receiver wallet.', data: result });
  } catch (error) {
    if (sendKnownError(res, error)) return;
    next(error);
  }
};

module.exports = {
  parseTakaToPaisa,
  getWallet,
  getTransactions,
  createTopup,
  getTopup,
  verifyTopup,
  getEligibleNgos,
  previewPayment,
  createPayment,
  getPayment,
  requireNgoOwner,
  getNgoPayments,
  refundPayment
};
