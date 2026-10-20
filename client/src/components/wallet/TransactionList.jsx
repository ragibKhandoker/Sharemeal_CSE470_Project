import React from 'react';
import { colors, formatDateTime, formatTaka, SandboxTag, StatusBadge } from './walletUi';

const TYPE_META = {
  topup: { icon: '↓', title: 'Money added', bg: '#dcfce7', fg: colors.credit },
  ngo_payment: { icon: '↑', title: 'NGO payment', bg: '#fee2e2', fg: colors.debit },
  refund: { icon: '↺', title: 'Refund', bg: '#e0e7ff', fg: '#3730a3' }
};

/**
 * Wallet transaction rows. Pending/failed/cancelled top-ups are shown greyed
 * with no sign because they never changed the balance.
 */
export default function TransactionList({ items, emptyText = 'No transactions yet.' }) {
  if (!items.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 12px', borderRadius: 14, background: colors.soft, border: '1px dashed #e7dbd2', color: colors.muted }}>
        <div aria-hidden="true" style={{ fontSize: 28 }}>🧾</div>
        {emptyText}
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      {items.map((tx) => {
        const meta = TYPE_META[tx.type] || TYPE_META.topup;
        const moved = tx.balance_after_paisa !== null && tx.balance_after_paisa !== undefined;
        const sign = !moved ? '' : tx.direction === 'credit' ? '+' : '−';
        const amountColor = !moved ? colors.muted : tx.direction === 'credit' ? colors.credit : colors.debit;
        const title = tx.type === 'ngo_payment' && tx.ngo_name ? `Paid ${tx.ngo_name}` : meta.title;
        return (
          <li key={tx.reference} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, background: colors.soft, border: '1px solid #f1e8e1', opacity: moved ? 1 : 0.8 }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: meta.bg, color: meta.fg, fontWeight: 900, fontSize: 18 }}>
              {meta.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <strong style={{ color: colors.ink, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{title}</strong>
                <StatusBadge status={tx.status} />
                {tx.is_simulated && <SandboxTag />}
              </div>
              <div style={{ marginTop: 2, color: colors.muted, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatDateTime(tx.created_at)} · <span style={{ fontFamily: 'monospace' }}>{tx.payment_reference || tx.reference}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, color: amountColor, fontSize: 15, textDecoration: tx.status === 'refunded' ? 'line-through' : 'none' }}>
                {sign}{formatTaka(tx.amount_paisa)}
              </div>
              {moved && <div style={{ color: colors.muted, fontSize: 11 }}>Bal. {formatTaka(tx.balance_after_paisa)}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
