import React, { useEffect, useState } from 'react';

/**
 * Shows an admin-generated temporary password exactly once. Nothing is stored
 * in the browser; closing the dialog discards the password for good.
 */
export const TempPasswordModal = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!result) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const expires = result.expiresAt
    ? new Date(result.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 5000 }}>
      <div role="dialog" aria-modal="true" aria-label="Temporary password" style={{ width: '100%', maxWidth: '440px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>🔑 Temporary password created</h3>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6b5d56', lineHeight: 1.5 }}>
          For <strong>{result.user?.name}</strong>{result.user?.email ? ` (${result.user.email})` : ''}.
        </p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '14px' }}>
          <code style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px dashed #94a3b8', fontSize: '18px', fontWeight: 800, letterSpacing: '1px', color: '#0f172a', textAlign: 'center', overflowWrap: 'anywhere' }}>
            {result.temporaryPassword}
          </code>
          <button type="button" onClick={copy} style={{ border: 0, borderRadius: '10px', padding: '0 14px', background: copied ? '#10b981' : 'var(--brand-primary)', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div role="alert" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: '10px', padding: '12px', fontSize: '12.5px', lineHeight: 1.55, marginBottom: '16px' }}>
          <strong>Shown only once.</strong> Share it with the user privately (in person or by phone), never in a public chat.
          {expires && <> It expires on <strong>{expires}</strong>.</>} The user must set a new password when they log in.
          If it gets lost, use <strong>New temporary password</strong> to replace it.
        </div>

        <button type="button" onClick={onClose} style={{ width: '100%', border: 0, borderRadius: '12px', padding: '12px', background: '#2c2320', color: '#ffffff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
          I have shared it — close
        </button>
      </div>
    </div>
  );
};

export default TempPasswordModal;
