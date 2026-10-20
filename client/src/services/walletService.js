import { API_BASE_URL } from '../utils/constants';

/**
 * Wallet API client. All amounts returned by the server are integer paisa;
 * amounts sent to it are taka strings (e.g. "150.50").
 */
const request = async (token, path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${API_BASE_URL}/wallet${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
};

/** Unique key per user action so retries never create a second charge. */
export const newRequestKey = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const walletService = {
  getWallet: (token) => request(token, '/'),
  getTransactions: (token, page = 1, limit = 10) => request(token, `/transactions?page=${page}&limit=${limit}`),
  startTopup: (token, amount, idempotencyKey) =>
    request(token, '/topups', { method: 'POST', body: { amount, idempotency_key: idempotencyKey } }),
  verifyTopup: (token, reference, outcome) =>
    request(token, `/topups/${encodeURIComponent(reference)}/verify`, { method: 'POST', body: { outcome } }),
  getEligibleNgos: (token) => request(token, '/ngos'),
  previewPayment: (token, ngoUserId, amount) =>
    request(token, '/payments/preview', { method: 'POST', body: { ngo_user_id: ngoUserId, amount } }),
  payNgo: (token, { ngoUserId, amount, description, idempotencyKey }) =>
    request(token, '/payments', {
      method: 'POST',
      body: { ngo_user_id: ngoUserId, amount, description, idempotency_key: idempotencyKey }
    }),
  getNgoPayments: (token, page = 1, limit = 10) => request(token, `/ngo/payments?page=${page}&limit=${limit}`)
};

export default walletService;
