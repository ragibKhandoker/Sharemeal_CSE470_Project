import React, { useEffect } from 'react';

export const colors = {
  ink: '#2c2320',
  muted: '#786d66',
  line: '#eee5df',
  soft: '#fcf9f6',
  credit: '#15803d',
  debit: '#b91c1c'
};

const takaFormatter = new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formats integer paisa as "৳1,234.50". */
export const formatTaka = (paisa) => `৳${takaFormatter.format((Number(paisa) || 0) / 100)}`;

export const formatDateTime = (value) => (value
  ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

/**
 * Validates a taka amount typed by the user. Returns paisa, or an error string.
 * The server re-validates everything; this only gives instant feedback.
 */
export const parseAmountInput = (text, { min, max }) => {
  const value = String(text || '').trim();
  if (!value) return { error: 'Enter an amount.' };
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return { error: 'Use numbers only, with up to 2 decimal places.' };
  const paisa = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  if (paisa < min) return { error: `Minimum amount is ${formatTaka(min)}.` };
  if (paisa > max) return { error: `Maximum amount is ${formatTaka(max)}.` };
  return { paisa };
};

const STATUS_STYLES = {
  completed: { label: 'Completed', bg: '#dcfce7', fg: '#166534' },
  pending: { label: 'Pending', bg: '#fef3c7', fg: '#92400e' },
  failed: { label: 'Failed', bg: '#fee2e2', fg: '#991b1b' },
  cancelled: { label: 'Cancelled', bg: '#f3f4f6', fg: '#4b5563' },
  refunded: { label: 'Refunded', bg: '#e0e7ff', fg: '#3730a3' }
};

export const StatusBadge = ({ status }) => {
  const style = STATUS_STYLES[status] || { label: status, bg: '#f3f4f6', fg: '#4b5563' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 999, background: style.bg, color: style.fg, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {style.label}
    </span>
  );
};

export const SandboxTag = () => (
  <span title="Simulated sandbox money — not real funds" style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 6, border: '1px dashed #d97706', color: '#92400e', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
    TEST MONEY
  </span>
);

export const Card = ({ children, style }) => (
  <section style={{ background: '#fff', border: `1px solid ${colors.line}`, borderRadius: 18, padding: 18, boxShadow: '0 8px 24px rgba(44, 35, 32, 0.05)', minWidth: 0, ...style }}>
    {children}
  </section>
);

export const buttonStyles = {
  primary: { border: 0, borderRadius: 10, padding: '11px 16px', background: 'var(--brand-primary)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  secondary: { border: `1px solid ${colors.line}`, borderRadius: 10, padding: '10px 16px', background: '#fff', color: colors.ink, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  disabled: { opacity: 0.55, cursor: 'not-allowed' }
};

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10,
  border: `1px solid #e2d6cd`, fontSize: 15, color: colors.ink, background: '#fff'
};

export const FieldError = ({ children }) => (children
  ? <div role="alert" style={{ marginTop: 6, color: colors.debit, fontSize: 13, fontWeight: 600 }}>{children}</div>
  : null);

/** Dialog shell. `busy` blocks closing while a request is in flight. */
export const WalletModal = ({ title, onClose, busy = false, children }) => {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(28, 22, 20, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${colors.line}` }}>
          <h3 style={{ margin: 0, fontSize: 18, color: colors.ink }}>{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} style={{ border: 0, background: 'transparent', fontSize: 22, color: colors.muted, cursor: busy ? 'not-allowed' : 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};

export const DetailRow = ({ label, children, strong }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px dashed ${colors.line}`, fontSize: 14 }}>
    <span style={{ color: colors.muted }}>{label}</span>
    <span style={{ color: colors.ink, fontWeight: strong ? 800 : 600, textAlign: 'right', wordBreak: 'break-word' }}>{children}</span>
  </div>
);

export const Spinner = ({ label = 'Loading…' }) => (
  <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, color: colors.muted, padding: '18px 0' }}>
    <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: '3px solid #eadfd7', borderTopColor: 'var(--brand-primary)', animation: 'wallet-spin 0.8s linear infinite' }} />
    {label}
    <style>{'@keyframes wallet-spin { to { transform: rotate(360deg); } }'}</style>
  </div>
);

export const Pagination = ({ page, pages, onChange, disabled }) => (pages > 1 ? (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
    <button type="button" onClick={() => onChange(page - 1)} disabled={disabled || page <= 1} style={{ ...buttonStyles.secondary, padding: '7px 12px', ...(page <= 1 ? buttonStyles.disabled : {}) }}>← Prev</button>
    <span style={{ color: colors.muted, fontSize: 14 }}>Page {page} of {pages}</span>
    <button type="button" onClick={() => onChange(page + 1)} disabled={disabled || page >= pages} style={{ ...buttonStyles.secondary, padding: '7px 12px', ...(page >= pages ? buttonStyles.disabled : {}) }}>Next →</button>
  </div>
) : null);
