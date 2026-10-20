import React, { useState } from 'react';
import Notice from '../common/Notice';
import walletService, { newRequestKey } from '../../services/walletService';
import {
  buttonStyles, colors, DetailRow, FieldError, formatTaka, inputStyle, parseAmountInput, WalletModal
} from './walletUi';

const MIN_PAISA = 10 * 100;
const MAX_PAISA = 50000 * 100;
const QUICK_AMOUNTS = ['100', '500', '1000', '2000'];

/**
 * Wallet top-up flow: amount → provider checkout → verified result.
 * With the sandbox provider the checkout step is simulated and clearly labelled;
 * the wallet is only credited after the server verifies the outcome.
 */
export default function AddMoneyModal({ token, provider, onClose, onCompleted }) {
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const [topup, setTopup] = useState(null);
  const [result, setResult] = useState(null);

  const changeAmount = (value) => {
    setAmount(value);
    setFieldError('');
    setRequestKey(newRequestKey()); // a different amount is a different request
  };

  const startTopup = async (event) => {
    event.preventDefault();
    const parsed = parseAmountInput(amount, { min: MIN_PAISA, max: MAX_PAISA });
    if (parsed.error) return setFieldError(parsed.error);
    setBusy(true);
    setError('');
    try {
      const response = await walletService.startTopup(token, amount.trim(), requestKey);
      setTopup(response.data);
      setStep('checkout');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const finishCheckout = async (outcome) => {
    setBusy(true);
    setError('');
    try {
      const response = await walletService.verifyTopup(token, topup.reference, outcome);
      setResult({ topup: response.data, message: response.message });
      setStep('result');
      onCompleted();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WalletModal title="Add money" onClose={onClose} busy={busy}>
      {error && <div style={{ marginBottom: 14 }}><Notice tone="error" onClose={() => setError('')}>{error}</Notice></div>}

      {step === 'amount' && (
        <form onSubmit={startTopup} noValidate>
          {provider?.simulated && (
            <div style={{ marginBottom: 14 }}>
              <Notice tone="warning" title="Sandbox mode">
                No real payment gateway is connected. Top-ups add <strong>test money</strong> only and no real money is charged.
              </Notice>
            </div>
          )}
          <label htmlFor="topup-amount" style={{ display: 'block', fontWeight: 700, color: colors.ink, marginBottom: 6 }}>Amount (৳)</label>
          <input
            id="topup-amount" inputMode="decimal" autoComplete="off" placeholder="e.g. 500"
            value={amount} onChange={(event) => changeAmount(event.target.value)}
            aria-invalid={Boolean(fieldError)} style={inputStyle}
          />
          <FieldError>{fieldError}</FieldError>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value} type="button" onClick={() => changeAmount(value)}
                style={{ border: `1px solid ${amount === value ? 'var(--brand-primary)' : colors.line}`, background: amount === value ? 'var(--brand-soft, #eef2ff)' : '#fff', color: colors.ink, borderRadius: 999, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }}
              >
                ৳{value}
              </button>
            ))}
          </div>
          <p style={{ color: colors.muted, fontSize: 13, margin: '10px 0 16px' }}>
            Between {formatTaka(MIN_PAISA)} and {formatTaka(MAX_PAISA)} per top-up.
          </p>
          <button type="submit" disabled={busy} style={{ ...buttonStyles.primary, width: '100%', ...(busy ? buttonStyles.disabled : {}) }}>
            {busy ? 'Starting…' : 'Continue to payment'}
          </button>
        </form>
      )}

      {step === 'checkout' && topup && (
        <div>
          <div style={{ border: '2px dashed #f59e0b', borderRadius: 16, padding: 16, background: '#fffbeb' }}>
            <div style={{ fontWeight: 900, color: '#92400e', letterSpacing: 0.5, fontSize: 12 }}>SANDBOX CHECKOUT · TEST ONLY</div>
            <p style={{ margin: '6px 0 10px', color: '#78350f', fontSize: 13 }}>
              This screen stands in for a real payment gateway. Choose what the gateway should report;
              the server then verifies it before touching your balance.
            </p>
            <DetailRow label="Amount" strong>{formatTaka(topup.amount_paisa)}</DetailRow>
            <DetailRow label="Reference"><span style={{ fontFamily: 'monospace' }}>{topup.reference}</span></DetailRow>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
            <button type="button" disabled={busy} onClick={() => finishCheckout('success')} style={{ ...buttonStyles.primary, background: colors.credit, ...(busy ? buttonStyles.disabled : {}) }}>
              {busy ? 'Verifying…' : 'Simulate successful payment'}
            </button>
            <button type="button" disabled={busy} onClick={() => finishCheckout('failed')} style={{ ...buttonStyles.secondary, color: colors.debit, ...(busy ? buttonStyles.disabled : {}) }}>
              Simulate failed payment
            </button>
            <button type="button" disabled={busy} onClick={() => finishCheckout('cancelled')} style={{ ...buttonStyles.secondary, ...(busy ? buttonStyles.disabled : {}) }}>
              Cancel payment
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div>
          <Notice
            tone={result.topup.status === 'completed' ? 'success' : result.topup.status === 'pending' ? 'info' : 'warning'}
            title={{ completed: 'Money added', failed: 'Payment failed', cancelled: 'Top-up cancelled', pending: 'Payment pending' }[result.topup.status]}
          >
            {result.message}
          </Notice>
          <div style={{ marginTop: 12 }}>
            <DetailRow label="Reference"><span style={{ fontFamily: 'monospace' }}>{result.topup.reference}</span></DetailRow>
            <DetailRow label="Amount">{formatTaka(result.topup.amount_paisa)}</DetailRow>
          </div>
          <button type="button" onClick={onClose} style={{ ...buttonStyles.primary, width: '100%', marginTop: 16 }}>Done</button>
        </div>
      )}
    </WalletModal>
  );
}
