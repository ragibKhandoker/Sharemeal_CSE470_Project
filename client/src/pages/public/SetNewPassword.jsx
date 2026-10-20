import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ShareMealLoading from '../../components/common/ShareMealLoading';
import { API_BASE_URL } from '../../utils/constants';
import { authCardStyles } from './RequestPasswordReset';
import '../../App.css';

// Same rules as the server: 8+ characters with a letter and a number.
const checkPassword = (value) => {
  const password = value.trim();
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.';
  return '';
};

const passwordStrength = (value) => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 2) return { label: 'Weak', color: '#dc2626', width: '30%' };
  if (score <= 3) return { label: 'Fair', color: '#d97706', width: '65%' };
  return { label: 'Strong', color: '#16a34a', width: '100%' };
};

/**
 * Shown after logging in with an admin-issued temporary password. The
 * session cannot use any other page or API until a new password is set.
 */
export const SetNewPassword = () => {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <ShareMealLoading />;
  if (!user || !token) return <Navigate to="/login" replace />;
  if (!user.password_change_required) return <Navigate to="/" replace />;

  const finish = (notice) => {
    logout();
    navigate('/login', { replace: true, state: { notice } });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitError('');
    const problem = checkPassword(newPassword);
    if (problem) {
      setFieldError(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }
    setFieldError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/set-new-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        finish('Your new password is saved. Please log in with it.');
      } else if (res.status === 401) {
        setSessionExpired(true);
        setSubmitError(data.message || 'Your temporary session has expired. Log in again with your temporary password.');
      } else {
        setSubmitError(data.message || 'Could not save your new password. Please try again.');
      }
    } catch (requestError) {
      setSubmitError('Could not reach ShareMeal. Check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = passwordStrength(newPassword);

  return (
    <div style={authCardStyles.page}>
      <div style={authCardStyles.card}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={authCardStyles.badge} aria-hidden="true">🔑</div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#2c2320' }}>Set a new password</h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b5d56' }}>Hi {user.name || 'there'}, one more step before you continue.</p>
        </div>

        <div role="note" style={authCardStyles.info}>
          You signed in with a <strong>temporary password</strong>. It can&apos;t be used as your permanent password, so please choose a new one now. You can&apos;t open other pages until you do.
        </div>

        {submitError && <div role="alert" style={authCardStyles.error}>{submitError}</div>}

        {sessionExpired ? (
          <button type="button" onClick={() => finish('Log in again with your latest temporary password.')} style={authCardStyles.primaryButton}>
            Back to Login
          </button>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="new-password" style={authCardStyles.label}>New password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters, letters and numbers"
                value={newPassword}
                onChange={(event) => { setNewPassword(event.target.value); setFieldError(''); }}
                style={{ ...authCardStyles.input, paddingRight: '64px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#6b5d56' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {newPassword && (
              <div style={{ marginTop: '8px' }} aria-live="polite">
                <div style={{ height: '6px', borderRadius: '999px', background: '#f1ebe7', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: '12px', color: strength.color, marginTop: '4px', fontWeight: 600 }}>{strength.label}</div>
              </div>
            )}

            <label htmlFor="confirm-password" style={{ ...authCardStyles.label, marginTop: '16px' }}>Confirm new password</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              value={confirmPassword}
              onChange={(event) => { setConfirmPassword(event.target.value); setFieldError(''); }}
              style={authCardStyles.input}
            />
            {fieldError && <div role="alert" style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{fieldError}</div>}

            <button type="submit" disabled={submitting} style={{ ...authCardStyles.primaryButton, marginTop: '22px', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Saving…' : 'Save new password'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button type="button" onClick={() => finish('')} style={{ ...authCardStyles.muted, background: 'transparent', border: 0, cursor: 'pointer' }}>
                Log out
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SetNewPassword;
