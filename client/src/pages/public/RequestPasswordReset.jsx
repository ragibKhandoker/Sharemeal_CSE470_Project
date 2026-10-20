import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/constants';
import '../../App.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const authCardStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #fef3ec 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    background: '#ffffff',
    borderRadius: '24px',
    padding: 'clamp(24px, 6vw, 36px)',
    boxShadow: '0 20px 60px rgba(44,35,32,0.08)',
    border: '1px solid rgba(44,35,32,0.06)',
    boxSizing: 'border-box'
  },
  badge: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ea580c 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    margin: '0 auto 16px',
    boxShadow: '0 8px 24px rgba(var(--brand-primary-rgb), 0.35)'
  },
  label: { display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' },
  input: {
    width: '100%',
    height: '46px',
    padding: '0 14px',
    borderRadius: '12px',
    border: '1px solid rgba(44,35,32,0.15)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  primaryButton: {
    width: '100%',
    height: '48px',
    background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ea580c 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)'
  },
  error: { background: '#fef2f2', color: '#991b1b', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', border: '1px solid #fecaca', lineHeight: 1.5 },
  success: { background: '#ecfdf5', color: '#065f46', padding: '16px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', border: '1px solid #a7f3d0', lineHeight: 1.6 },
  info: { background: '#eff6ff', color: '#1e3a8a', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', border: '1px solid #bfdbfe', lineHeight: 1.5 },
  muted: { color: '#6b5d56', fontSize: '13px', textDecoration: 'none' }
};

/**
 * Logged-out users ask the admin team to reset their password. The response
 * is the same whether or not the email is registered.
 */
export const RequestPasswordReset = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [requestCode, setRequestCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(requestCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setCodeCopied(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError('Enter the email address registered on your account, e.g. name@example.com.');
      return;
    }
    setFieldError('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: value, reason: reason.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not send your request. Please try again.');
      setSentMessage(data.message);
      setRequestCode(data.requestCode || '');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={authCardStyles.page}>
      <div style={authCardStyles.card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={authCardStyles.badge} aria-hidden="true">🔐</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#2c2320' }}>Request Password Reset</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b5d56', lineHeight: 1.5 }}>
            Send a request to the ShareMeal admin team. After approval, an admin will privately give you a temporary password.
          </p>
        </div>

        {sentMessage ? (
          <div>
            <div role="status" style={authCardStyles.success}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Request sent</strong>
              {sentMessage}
            </div>

            {requestCode && (
              <div style={{ border: '2px dashed #f59e0b', background: '#fffbeb', borderRadius: '14px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', letterSpacing: '0.5px' }}>YOUR SECRET REQUEST CODE</div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
                  <code style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '2px', color: '#2c2320' }}>{requestCode}</code>
                  <button type="button" onClick={copyCode} style={{ border: 0, borderRadius: '8px', padding: '6px 10px', background: codeCopied ? '#10b981' : '#2c2320', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    {codeCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: '12.5px', color: '#78350f', lineHeight: 1.5 }}>
                  <strong>Write this code down now.</strong> It is shown only once. You need it to open the admin&apos;s temporary message. Don&apos;t share it with anyone.
                </div>
              </div>
            )}

            <div style={authCardStyles.info}>
              <strong>Next steps:</strong> after an admin approves your request, open <strong>Check Reset Message</strong> with your email and this code to get your temporary password. Log in with it and set a new password.
            </div>
            <Link to="/reset-message" state={{ email: email.trim() }} style={{ ...authCardStyles.primaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              Check Reset Message
            </Link>
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <Link to="/login" style={authCardStyles.muted}>Back to Login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && <div role="alert" style={authCardStyles.error}>{error}</div>}

            <label htmlFor="reset-email" style={authCardStyles.label}>Registered email address</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setFieldError(''); }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'reset-email-error' : undefined}
              style={{ ...authCardStyles.input, borderColor: fieldError ? '#f87171' : 'rgba(44,35,32,0.15)' }}
            />
            {fieldError && <div id="reset-email-error" style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{fieldError}</div>}

            <label htmlFor="reset-reason" style={{ ...authCardStyles.label, marginTop: '14px' }}>
              Reason <span style={{ fontWeight: 400, color: '#6b5d56' }}>(short note for the admin)</span>
            </label>
            <textarea
              id="reset-reason"
              rows={3}
              maxLength={500}
              placeholder="e.g. I forgot my password"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              style={{ ...authCardStyles.input, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
            />

            <button type="submit" disabled={loading} style={{ ...authCardStyles.primaryButton, marginTop: '20px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Sending request…' : 'Send request to admin'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/login" style={authCardStyles.muted}>← Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RequestPasswordReset;
