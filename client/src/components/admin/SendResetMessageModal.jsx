import React, { useEffect, useState } from 'react';

const NOTE_LIMIT = 300;

/**
 * Admin dialog to approve a password reset request (or resend it) as a
 * temporary message. The temporary password is generated on the server and
 * sealed with the user's request code, so the admin never sees it.
 */
export const SendResetMessageModal = ({ request, regenerate, busy, onSend, onClose }) => {
  const [note, setNote] = useState('');

  // Start with an empty note for each request.
  useEffect(() => { setNote(''); }, [request?.id, regenerate]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  if (!request) return null;
  const sealed = request.has_message_code;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 5000 }}>
      <div role="dialog" aria-modal="true" aria-label="Send temporary message" style={{ width: '100%', maxWidth: '460px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
          {regenerate ? '🔄 Send a new temporary message' : '📨 Approve & send temporary message'}
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#6b5d56', lineHeight: 1.5 }}>
          To <strong>{request.user_name}</strong>{request.user_email ? ` (${request.user_email})` : ''}.
        </p>

        {sealed ? (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: '10px', padding: '12px', fontSize: '12.5px', lineHeight: 1.55, marginBottom: '14px' }}>
            A random temporary password is created and locked inside a one-time message that only the user can open with their secret request code
            (<strong>Check Reset Message</strong> on the login page). <strong>You will not see the password.</strong>
            {regenerate && ' The previous temporary password and message stop working.'}
          </div>
        ) : (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: '10px', padding: '12px', fontSize: '12.5px', lineHeight: 1.55, marginBottom: '14px' }}>
            This request has no secret code (it was made before temporary messages existed), so a message can&apos;t be sent.
            The temporary password will be shown to you once; give it to the user in person.
          </div>
        )}

        {sealed && (
          <>
            <label htmlFor="reset-note" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
              Note to the user <span style={{ fontWeight: 400, color: '#6b5d56' }}>(optional)</span>
            </label>
            <textarea
              id="reset-note"
              rows={3}
              maxLength={NOTE_LIMIT}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Please set a strong new password after logging in."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2d6cd', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>{note.length}/{NOTE_LIMIT}</div>
            <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: '#b91c1c' }}>Never write a password in the note.</p>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} disabled={busy} style={{ flex: 1, border: 0, borderRadius: '10px', padding: '11px', background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={() => onSend(note.trim())} disabled={busy} style={{ flex: 2, border: 0, borderRadius: '10px', padding: '11px', background: '#10b981', color: '#ffffff', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Sending…' : sealed ? (regenerate ? 'Send new message' : 'Approve & send') : 'Approve & show password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendResetMessageModal;
