import React from 'react';
import { Link } from 'react-router-dom';

const NOTICE_TONES = {
  success: { icon: '✓', title: 'Done', accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7', text: '#14532d' },
  warning: { icon: '!', title: 'Heads up', accent: '#d97706', bg: '#fffbeb', border: '#fde68a', iconBg: '#fef3c7', text: '#78350f' },
  error: { icon: '×', title: 'Something went wrong', accent: '#dc2626', bg: '#fef2f2', border: '#fecaca', iconBg: '#fee2e2', text: '#7f1d1d' },
  info: { icon: 'i', title: 'Note', accent: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe', text: '#1e3a8a' }
};

/**
 * Inline notification banner with an icon, title, optional action link and
 * optional dismiss button.
 */
export default function Notice({ tone = 'info', title, children, action, onClose }) {
  const t = NOTICE_TONES[tone];
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px 14px 16px',
        background: t.bg, border: `1px solid ${t.border}`, borderLeft: `4px solid ${t.accent}`,
        borderRadius: 14, boxShadow: '0 6px 18px rgba(44, 35, 32, 0.06)'
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', background: t.iconBg, color: t.accent, fontWeight: 900, fontSize: 16 }}>
        {t.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: t.text, fontSize: 15 }}>{title || t.title}</div>
        <div style={{ marginTop: 2, color: t.text, opacity: 0.85, fontSize: 14, lineHeight: 1.45 }}>{children}</div>
        {action && (
          <Link to={action.to} style={{ display: 'inline-block', marginTop: 8, padding: '6px 12px', borderRadius: 999, background: t.accent, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            {action.label}
          </Link>
        )}
      </div>
      {onClose && (
        <button type="button" aria-label="Dismiss notification" onClick={onClose} style={{ flexShrink: 0, width: 28, height: 28, display: 'grid', placeItems: 'center', padding: 0, border: 0, borderRadius: 8, background: 'transparent', color: t.text, fontSize: 18, cursor: 'pointer', opacity: 0.6 }}>
          ×
        </button>
      )}
    </div>
  );
}
