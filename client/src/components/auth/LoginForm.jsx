import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

export const LoginForm = ({ onSubmit, loading, error, title = "Log in", subtitle = "Good to see you again." }) => {
  const [searchParams] = useSearchParams();
  const initialIdentifier = searchParams.get('identifier') || searchParams.get('phone') || searchParams.get('email') || '';
  const [phone, setPhone] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Shown after setting a new password (Set New Password page).
  const notice = useLocation().state?.notice;
  // Prefill the reset request page when the user typed an email address.
  const forgotState = phone.includes('@') ? { email: phone.trim() } : undefined;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ phone: phone, email: phone, password });
  };

  const errorMessage = typeof error === 'string' ? error : (error?.message || '');
  const isNotFound = (error && typeof error === 'object' && error.notFound) || /no\s+account|not\s+found/i.test(errorMessage);
  const isWrongPassword = (error && typeof error === 'object' && error.userExists) || /incorrect password/i.test(errorMessage);

  return (
    <div>
      <div className="auth-form-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {notice && !errorMessage && (
        <div role="status" style={{ marginBottom: 16, padding: '12px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: 13, borderRadius: 10, fontWeight: 600 }}>
          ✅ {notice}
        </div>
      )}

      {isNotFound ? (
        <div style={{
          marginBottom: 16,
          padding: '14px 16px',
          background: 'var(--brand-soft)',
          border: '1.5px solid var(--brand-soft-border)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(var(--brand-primary-rgb), 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>👤</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand-primary-deep)', marginBottom: '4px' }}>
                No Account Found
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brand-primary-dark)', lineHeight: 1.4, marginBottom: '10px' }}>
                {errorMessage || 'No account was found with this phone number or email. You can create a new account in under a minute.'}
              </div>
              <Link
                to={`/signup`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--brand-primary)',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(var(--brand-primary-rgb), 0.2)'
                }}
              >
                Sign Up Free →
              </Link>
            </div>
          </div>
        </div>
      ) : isWrongPassword ? (
        <div style={{
          marginBottom: 16,
          padding: '14px 16px',
          background: '#fff1f2',
          border: '1.5px solid #fecdd3',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#9f1239', marginBottom: '4px' }}>
                Incorrect Password
              </div>
              <div style={{ fontSize: '13px', color: '#be123c', lineHeight: 1.4, marginBottom: '10px' }}>
                {errorMessage || 'Account exists for this user, but the password entered was incorrect.'}
              </div>
              <Link
                to="/request-password-reset"
                state={forgotState}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#e11d48',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                🔑 Reset Password →
              </Link>
            </div>
          </div>
        </div>
      ) : errorMessage ? (
        <div style={{ marginBottom: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, borderRadius: 10 }}>
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="auth-input-group">
          <label>Phone Number or Email Address <span className="required">*</span></label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">📞</span>
            <input
              type="text"
              placeholder="01712345678 or name@email.com"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-input-group">
          <label>Password <span className="required">*</span></label>
          <div className="auth-input-wrapper" style={{ position: 'relative' }}>
            <span className="auth-input-icon">🔒</span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 0,
                fontSize: '16px',
                cursor: 'pointer',
                opacity: 0.8
              }}
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0', fontSize: 13, color: '#6b5d56' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" style={{ accentColor: 'var(--brand-primary-dark)' }} />
            Remember me
          </label>
          <Link
            to="/request-password-reset"
            state={forgotState}
            style={{
              color: 'var(--brand-primary-dark)',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none'
            }}
          >
            Request Password Reset
          </Link>
        </div>

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading ? 'Logging In...' : 'Log In →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: 13, color: '#6b5d56' }}>
        Already requested a reset?{' '}
        <Link to="/reset-message" state={forgotState} style={{ color: 'var(--brand-primary-dark)', fontWeight: 600, textDecoration: 'none' }}>
          📨 Check Reset Message
        </Link>
      </p>

      <p className="auth-switch-text">
        Don't have an account?{' '}
        <Link to="/signup" className="auth-switch-link">
          Sign up free
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
