import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/constants';
import { authCardStyles } from './RequestPasswordReset';
import '../../App.css';

const STATUS_TEXT = {
  pending: { tone: 'info', title: 'Waiting for approval', text: 'Your request has not been approved yet. Please check again later.' },
  rejected: { tone: 'error', title: 'Request declined', text: 'An admin declined this request. You can send a new password reset request.' },
  completed: { tone: 'info', title: 'Already completed', text: 'This reset is finished and your new password is set. Log in with it.' },
  viewed: { tone: 'info', title: 'Message already opened', text: 'This temporary message can be opened only once and has already been read. If you lost the password, send a new request or ask an admin to send a new message.' },
  expired: { tone: 'error', title: 'Temporary password expired', text: 'The temporary password has expired. Send a new password reset request.' },
  approved_offline: { tone: 'info', title: 'Approved', text: 'Your request was approved. The admin team will give you the temporary password in person.' }
};

/**
 * Opens the admin's one-time temporary message (temporary password + note)
 * with the user's email and secret request code. Nothing is stored in the
 * browser; leaving the page discards the password.
 */
export const CheckResetMessage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!email.trim() || !code.trim()) {
      setError('Enter your registered email address and your request code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not open the message. Please try again.');
      setCode('');
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const ready = result?.status === 'ready';
  const statusInfo = result && !ready ? STATUS_TEXT[result.status] : null;

  return (
    <div style={authCardStyles.page}>
      <div style={authCardStyles.card}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={authCardStyles.badge} aria-hidden="true">📨</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#2c2320' }}>Check Reset Message</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b5d56', lineHeight: 1.5 }}>
            Open the temporary message the admin sent you, using your email and the secret code you got when you sent your request.
          </p>
        </div>

        {ready ? (
          <div>
            <div role="status" style={{ border: '2px solid #a7f3d0', background: '#ecfdf5', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', marginBottom: '8px' }}>🔑 Your temporary password</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                <code style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '10px', background: '#ffffff', border: '1px dashed #10b981', fontSize: '20px', fontWeight: 900, letterSpacing: '1px', color: '#0f172a', textAlign: 'center', overflowWrap: 'anywhere' }}>
                  {result.temporaryPassword}
                </code>
                <button type="button" onClick={copy} style={{ border: 0, borderRadius: '10px', padding: '0 14px', background: copied ? '#10b981' : '#065f46', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              {result.note && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#065f46', lineHeight: 1.5 }}>
                  <strong>Message from admin:</strong> “{result.note}”
                </div>
              )}
            </div>
            <div role="alert" style={{ ...authCardStyles.info, background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412' }}>
              <strong>This message is shown only once</strong> and has now been deleted. Copy the password before leaving this page.
              {result.expiresAt && <> It works until <strong>{new Date(result.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>.</>}
              {' '}After logging in you must set a new password.
            </div>
            <Link to="/login" state={{ notice: 'Log in with your temporary password, then choose a new password.' }} style={{ ...authCardStyles.primaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Go to Login →
            </Link>
          </div>
        ) : (
          <>
            {statusInfo && (
              <div role="status" style={statusInfo.tone === 'error' ? authCardStyles.error : authCardStyles.info}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{statusInfo.title}</strong>
                {statusInfo.text}
              </div>
            )}
            {error && <div role="alert" style={authCardStyles.error}>{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="message-email" style={authCardStyles.label}>Registered email address</label>
              <input id="message-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} style={authCardStyles.input} />

              <label htmlFor="message-code" style={{ ...authCardStyles.label, marginTop: '14px' }}>Secret request code</label>
              <input
                id="message-code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="e.g. K7MPX-3RQWD"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                style={{ ...authCardStyles.input, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}
              />
              <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '6px' }}>
                After 5 wrong codes the message is destroyed and you will need a new request.
              </div>

              <button type="submit" disabled={loading} style={{ ...authCardStyles.primaryButton, marginTop: '20px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Opening…' : 'Open my message'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              <Link to="/request-password-reset" style={authCardStyles.muted}>Send a new request</Link>
              <Link to="/login" style={authCardStyles.muted}>Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckResetMessage;
