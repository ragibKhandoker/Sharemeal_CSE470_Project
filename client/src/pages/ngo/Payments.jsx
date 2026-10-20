import React, { useCallback, useEffect, useState } from 'react';
import NgoLayout from '../../components/ngo/NgoLayout';
import Notice from '../../components/common/Notice';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';
import {
  Card, colors, formatDateTime, formatTaka, Pagination, Spinner, StatusBadge
} from '../../components/wallet/walletUi';

const PAGE_SIZE = 10;

const SummaryTile = ({ label, count, amount, accent }) => (
  <div style={{ flex: '1 1 180px', background: '#fff', border: `1px solid ${colors.line}`, borderTop: `4px solid ${accent}`, borderRadius: 16, padding: 16 }}>
    <div style={{ color: colors.muted, fontSize: 13, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 900, color: colors.ink, margin: '4px 0 2px' }}>{formatTaka(amount)}</div>
    <div style={{ color: colors.muted, fontSize: 13 }}>{count} {count === 1 ? 'payment' : 'payments'}</div>
  </div>
);

export default function Payments() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page) => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await walletService.getNgoPayments(token, page, PAGE_SIZE);
      setData(response.data);
      setPagination(response.pagination);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  const summary = data?.summary;

  return (
    <NgoLayout title="Payments">
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header>
          <h2 style={{ margin: 0, color: colors.ink }}>Wallet payments</h2>
          <p style={{ margin: '6px 0 0', color: colors.muted }}>Payments receivers made to your NGO from their ShareMeal wallets.</p>
        </header>

        <Notice tone="info" title="Recorded payments, not yet paid out">
          These amounts are recorded in ShareMeal&apos;s internal ledger. Payouts to your bank or bKash/Nagad/Rocket
          account are not available yet, so this money has <strong>not</strong> been transferred to you.
          While ShareMeal runs in sandbox mode, payments may be funded with test money.
        </Notice>

        {error && <Notice tone="error" title="Could not load payments" onClose={() => setError('')}>{error}</Notice>}

        {!data && loading ? <Card><Spinner label="Loading payments…" /></Card> : summary && (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SummaryTile label="Total recorded" count={summary.total_count} amount={summary.total_paisa} accent="var(--brand-primary)" />
              <SummaryTile label="Completed" count={summary.completed_count} amount={summary.completed_paisa} accent="#16a34a" />
              <SummaryTile label="Pending" count={summary.pending_count} amount={summary.pending_paisa} accent="#d97706" />
              <SummaryTile label="Failed / refunded" count={summary.failed_refunded_count} amount={summary.failed_refunded_paisa} accent="#dc2626" />
            </div>

            <Card>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: colors.ink, fontSize: 17 }}>Payment history</h3>
                <span style={{ color: colors.muted, fontSize: 13 }}>Awaiting payout: <strong style={{ color: colors.ink }}>{formatTaka(summary.unsettled_paisa)}</strong></span>
              </div>

              {data.payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', borderRadius: 14, background: colors.soft, border: '1px dashed #e7dbd2', color: colors.muted }}>
                  <div aria-hidden="true" style={{ fontSize: 28 }}>💳</div>
                  No wallet payments yet.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, opacity: loading ? 0.6 : 1 }}>
                  {data.payments.map((payment) => (
                    <li key={payment.reference} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 14, background: colors.soft, border: '1px solid #f1e8e1' }}>
                      <span aria-hidden="true" style={{ flexShrink: 0, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#dcfce7', color: colors.credit, fontWeight: 900, fontSize: 18 }}>↓</span>
                      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong style={{ color: colors.ink }}>{payment.receiver_name || 'Receiver'}</strong>
                          <StatusBadge status={payment.status} />
                        </div>
                        <div style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                          {formatDateTime(payment.created_at)} · <span style={{ fontFamily: 'monospace' }}>{payment.reference}</span>
                        </div>
                        {payment.description && <div style={{ color: colors.ink, fontSize: 13, marginTop: 4 }}>“{payment.description}”</div>}
                        {payment.status === 'refunded' && payment.refund_reason && (
                          <div style={{ color: '#3730a3', fontSize: 12, marginTop: 4 }}>Refunded: {payment.refund_reason}</div>
                        )}
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: payment.status === 'completed' ? colors.credit : colors.muted, textDecoration: payment.status === 'refunded' ? 'line-through' : 'none' }}>
                          {formatTaka(payment.amount_paisa)}
                        </div>
                        <div style={{ color: colors.muted, fontSize: 11 }}>{payment.settlement_status === 'settled' ? 'Paid out' : 'Not paid out'}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={pagination.page} pages={pagination.pages} disabled={loading} onChange={load} />
            </Card>
          </>
        )}
      </div>
    </NgoLayout>
  );
}
