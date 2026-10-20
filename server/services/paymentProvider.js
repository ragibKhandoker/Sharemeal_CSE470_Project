const crypto = require('crypto');

/**
 * Wallet top-up payment providers.
 *
 * Only the "sandbox" provider is implemented. It simulates a gateway checkout so
 * the wallet flow can be developed and tested end to end; money it credits is
 * test money and every record it touches is stored with is_simulated = true.
 *
 * A real provider (e.g. SSLCommerz or bKash Tokenized Checkout) must implement
 * the same interface, and verifyPayment() must confirm the payment with the
 * provider's server-side validation API — never trust a browser redirect or an
 * unsigned callback body.
 */

const sandboxEnabled = () =>
  process.env.NODE_ENV !== 'production' || process.env.WALLET_SANDBOX_ENABLED === 'true';

const sandboxProvider = {
  name: 'sandbox',
  isSimulated: true,
  isAvailable: sandboxEnabled,

  // Returns the provider-side id for the checkout session.
  createCheckout: async () => ({
    providerTxnId: `SBX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
  }),

  // `outcome` is the result chosen on the simulated checkout screen.
  verifyPayment: async (_topup, { outcome }) => {
    if (outcome === 'success') return { status: 'completed' };
    if (outcome === 'cancelled') return { status: 'cancelled', reason: 'Cancelled on the sandbox checkout.' };
    return { status: 'failed', reason: 'Sandbox payment was declined.' };
  }
};

const providers = { sandbox: sandboxProvider };

const getProviderName = () => (process.env.WALLET_PAYMENT_PROVIDER || 'sandbox').trim().toLowerCase();

/**
 * Returns the configured provider, or null when it is unknown/not implemented
 * or disabled in this environment.
 */
const getProvider = () => {
  const provider = providers[getProviderName()];
  if (!provider || !provider.isAvailable()) return null;
  return provider;
};

module.exports = { getProvider, getProviderName };
