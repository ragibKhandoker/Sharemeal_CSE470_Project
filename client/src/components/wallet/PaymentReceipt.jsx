import React from 'react';
import { colors, DetailRow, formatDateTime, formatTaka, StatusBadge } from './walletUi';

/**
 * Receipt for an internal wallet-to-NGO payment.
 */
export default function PaymentReceipt({ receipt }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div aria-hidden="true" style={{ width: 56, height: 56, margin: '0 auto 8px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#dcfce7', color: colors.credit, fontSize: 28, fontWeight: 900 }}>✓</div>
        <div style={{ color: colors.muted, fontSize: 14 }}>You paid</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: colors.ink }}>{formatTaka(receipt.amount_paisa)}</div>
        <div style={{ color: colors.ink, fontWeight: 700 }}>to {receipt.ngo_name}</div>
      </div>
      <DetailRow label="Transaction ID"><span style={{ fontFamily: 'monospace' }}>{receipt.reference}</span></DetailRow>
      <DetailRow label="Date">{formatDateTime(receipt.created_at)}</DetailRow>
      <DetailRow label="Status"><StatusBadge status={receipt.status} /></DetailRow>
      {receipt.description && <DetailRow label="Note">{receipt.description}</DetailRow>}
      <DetailRow label="Wallet balance after" strong>{formatTaka(receipt.balance_after_paisa)}</DetailRow>
      <p style={{ margin: '12px 0 0', color: colors.muted, fontSize: 12, lineHeight: 1.5 }}>
        This payment is recorded in ShareMeal&apos;s internal wallet ledger. It is not a bank or mobile-wallet
        transfer; the NGO receives the money only once ShareMeal pays it out.
      </p>
    </div>
  );
}
