import React from 'react';
import { formatTaka, SandboxTag } from './walletUi';

const Stat = ({ label, value, accent }) => (
  <div style={{ flex: '1 1 120px', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.14)' }}>
    <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 800, color: accent || '#fff' }}>{value}</div>
  </div>
);

const actionButton = {
  display: 'flex', alignItems: 'center', gap: 8, border: 0, borderRadius: 12, padding: '11px 16px',
  fontWeight: 800, fontSize: 14, cursor: 'pointer'
};

/**
 * Wallet balance hero card with Add Money / Pay NGO actions.
 */
export default function WalletBalanceCard({ wallet, onAddMoney, onPayNgo, addDisabledReason, payDisabledReason }) {
  return (
    <section
      aria-label="Wallet balance"
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 22, padding: 22, color: '#fff',
        background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark, #1f2937) 100%)',
        boxShadow: '0 16px 36px rgba(0,0,0,0.16)'
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, opacity: 0.9 }}>
        Available balance {wallet.has_simulated_funds && <span style={{ background: '#fff', borderRadius: 6 }}><SandboxTag /></span>}
      </div>
      <div style={{ position: 'relative', fontSize: 'clamp(30px, 7vw, 40px)', fontWeight: 900, letterSpacing: '-0.5px', margin: '4px 0 16px' }}>
        {formatTaka(wallet.balance_paisa)}
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          type="button" onClick={onAddMoney} disabled={Boolean(addDisabledReason)} title={addDisabledReason || undefined}
          style={{ ...actionButton, background: '#fff', color: 'var(--brand-primary)', opacity: addDisabledReason ? 0.6 : 1, cursor: addDisabledReason ? 'not-allowed' : 'pointer' }}
        >
          <span aria-hidden="true">＋</span> Add Money
        </button>
        <button
          type="button" onClick={onPayNgo} disabled={Boolean(payDisabledReason)} title={payDisabledReason || undefined}
          style={{ ...actionButton, background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)', opacity: payDisabledReason ? 0.6 : 1, cursor: payDisabledReason ? 'not-allowed' : 'pointer' }}
        >
          <span aria-hidden="true">➜</span> Pay NGO
        </button>
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat label="Total added" value={formatTaka(wallet.total_added_paisa)} />
        <Stat label="Total spent" value={formatTaka(wallet.total_spent_paisa)} />
        {wallet.total_refunded_paisa > 0 && <Stat label="Refunded" value={formatTaka(wallet.total_refunded_paisa)} />}
      </div>
    </section>
  );
}
