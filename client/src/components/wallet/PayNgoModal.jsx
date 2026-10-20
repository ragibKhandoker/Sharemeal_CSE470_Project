import React, { useEffect, useMemo, useState } from 'react';
import Notice from '../common/Notice';
import walletService, { newRequestKey } from '../../services/walletService';
import PaymentReceipt from './PaymentReceipt';
import {
  buttonStyles, colors, DetailRow, FieldError, formatTaka, inputStyle, parseAmountInput, Spinner, WalletModal
} from './walletUi';

const MIN_PAISA = 1 * 100;
const MAX_PAISA = 100000 * 100;

/**
 * Pay an NGO from the wallet: choose NGO + amount → server-validated
 * confirmation → atomic payment → receipt.
 */
export default function PayNgoModal({ token, balancePaisa, onClose, onCompleted }) {
  const [step, setStep] = useState('form');
  const [ngos, setNgos] = useState(null);
  const [search, setSearch] = useState('');
  const [ngoUserId, setNgoUserId] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [requestKey, setRequestKey] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    walletService.getEligibleNgos(token)
      .then((response) => { if (active) setNgos(response.data); })
      .catch((loadError) => { if (active) { setNgos([]); setError(loadError.message); } });
    return () => { active = false; };
  }, [token]);

  const visibleNgos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (ngos || []).filter((ngo) => !query || ngo.name.toLowerCase().includes(query) || (ngo.address || '').toLowerCase().includes(query));
  }, [ngos, search]);

  const review = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!ngoUserId) errors.ngo = 'Choose an NGO.';
    const parsed = parseAmountInput(amount, { min: MIN_PAISA, max: MAX_PAISA });
    if (parsed.error) errors.amount = parsed.error;
    else if (parsed.paisa > balancePaisa) errors.amount = `Insufficient balance. You have ${formatTaka(balancePaisa)}.`;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    setError('');
    try {
      const response = await walletService.previewPayment(token, ngoUserId, amount.trim());
      setPreview(response.data);
      setRequestKey(newRequestKey()); // one key per confirmation, reused if the user retries it
      setStep('confirm');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await walletService.payNgo(token, {
        ngoUserId, amount: amount.trim(), description: description.trim(), idempotencyKey: requestKey
      });
      setReceipt(response.data);
      setStep('receipt');
      onCompleted();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = { form: 'Pay an NGO', confirm: 'Confirm payment', receipt: 'Payment receipt' };

  return (
    <WalletModal title={titles[step]} onClose={onClose} busy={busy}>
      {error && <div style={{ marginBottom: 14 }}><Notice tone="error" onClose={() => setError('')}>{error}</Notice></div>}

      {step === 'form' && (
        <form onSubmit={review} noValidate>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: colors.soft }}>
            <span style={{ color: colors.muted, fontSize: 14 }}>Available balance</span>
            <strong style={{ color: colors.ink }}>{formatTaka(balancePaisa)}</strong>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 700, color: colors.ink, marginBottom: 6 }}>NGO</legend>
            {ngos === null ? <Spinner label="Loading verified NGOs…" /> : ngos.length === 0 ? (
              <Notice tone="info" title="No NGOs available">No verified NGOs can receive wallet payments right now.</Notice>
            ) : (
              <>
                {ngos.length > 4 && (
                  <input type="search" placeholder="Search NGOs" value={search} onChange={(event) => setSearch(event.target.value)} style={{ ...inputStyle, marginBottom: 8 }} aria-label="Search NGOs" />
                )}
                <div role="radiogroup" style={{ display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                  {visibleNgos.map((ngo) => {
                    const selected = ngo.ngo_user_id === ngoUserId;
                    return (
                      <label key={ngo.ngo_user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${selected ? 'var(--brand-primary)' : colors.line}`, background: selected ? 'var(--brand-soft, #eef2ff)' : '#fff' }}>
                        <input type="radio" name="ngo" checked={selected} onChange={() => { setNgoUserId(ngo.ngo_user_id); setFieldErrors((e) => ({ ...e, ngo: '' })); }} />
                        <span aria-hidden="true" style={{ width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#f3e8de', fontWeight: 800, color: colors.ink }}>
                          {ngo.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 700, color: colors.ink }}>{ngo.name} <span title="Verified NGO" style={{ color: colors.credit }}>✔</span></span>
                          {ngo.address && <span style={{ display: 'block', fontSize: 12, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ngo.address}</span>}
                        </span>
                      </label>
                    );
                  })}
                  {visibleNgos.length === 0 && <p style={{ color: colors.muted, margin: 0 }}>No NGOs match “{search}”.</p>}
                </div>
              </>
            )}
            <FieldError>{fieldErrors.ngo}</FieldError>
          </fieldset>

          <label htmlFor="pay-amount" style={{ display: 'block', fontWeight: 700, color: colors.ink, margin: '14px 0 6px' }}>Amount (৳)</label>
          <input id="pay-amount" inputMode="decimal" autoComplete="off" placeholder="e.g. 150" value={amount} onChange={(event) => { setAmount(event.target.value); setFieldErrors((e) => ({ ...e, amount: '' })); }} aria-invalid={Boolean(fieldErrors.amount)} style={inputStyle} />
          <FieldError>{fieldErrors.amount}</FieldError>

          <label htmlFor="pay-note" style={{ display: 'block', fontWeight: 700, color: colors.ink, margin: '14px 0 6px' }}>
            Note <span style={{ fontWeight: 400, color: colors.muted }}>(optional)</span>
          </label>
          <textarea id="pay-note" rows={2} maxLength={200} placeholder="e.g. For this week's meals" value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ textAlign: 'right', color: colors.muted, fontSize: 12 }}>{description.length}/200</div>

          <button type="submit" disabled={busy || !ngos?.length} style={{ ...buttonStyles.primary, width: '100%', marginTop: 10, ...(busy || !ngos?.length ? buttonStyles.disabled : {}) }}>
            {busy ? 'Checking…' : 'Review payment'}
          </button>
        </form>
      )}

      {step === 'confirm' && preview && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ color: colors.muted, fontSize: 14 }}>You are paying</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: colors.ink }}>{formatTaka(preview.amount_paisa)}</div>
            <div style={{ fontWeight: 700, color: colors.ink }}>to {preview.ngo.name}</div>
          </div>
          <DetailRow label="Current balance">{formatTaka(preview.balance_paisa)}</DetailRow>
          <DetailRow label="Payment">−{formatTaka(preview.amount_paisa)}</DetailRow>
          <DetailRow label="Remaining balance" strong>{formatTaka(preview.remaining_paisa)}</DetailRow>
          {description.trim() && <DetailRow label="Note">{description.trim()}</DetailRow>}
          <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.5, margin: '12px 0 16px' }}>
            The amount moves from your ShareMeal wallet to the NGO inside ShareMeal&apos;s ledger. It cannot be undone by you;
            contact ShareMeal support if you paid by mistake.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep('form')} disabled={busy} style={{ ...buttonStyles.secondary, flex: 1, ...(busy ? buttonStyles.disabled : {}) }}>Back</button>
            <button type="button" onClick={confirm} disabled={busy} style={{ ...buttonStyles.primary, flex: 2, ...(busy ? buttonStyles.disabled : {}) }}>
              {busy ? 'Paying…' : `Pay ${formatTaka(preview.amount_paisa)}`}
            </button>
          </div>
        </div>
      )}

      {step === 'receipt' && receipt && (
        <div>
          <PaymentReceipt receipt={receipt} />
          <button type="button" onClick={onClose} style={{ ...buttonStyles.primary, width: '100%', marginTop: 16 }}>Done</button>
        </div>
      )}
    </WalletModal>
  );
}
