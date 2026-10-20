import React, { useState } from 'react';
import { API_BASE_URL } from '../../utils/constants';

export const PasswordResetRequestModal = ({ isOpen, onClose, user, token }) => {
  const [reason, setReason] = useState('Routine security update');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestCode, setRequestCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const identifier = user?.email || user?.phone || user?.name || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/auth/request-reset`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          identifier,
          reason: reason.trim() || 'User requested password change from profile'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit request');
      }

      setRequestCode(data.requestCode || '');
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setRequestCode('');
    setError('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 25, 23, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f4f0ec',
            border: 'none',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#6b5d56'
          }}
        >
          ✕
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 16px auto'
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#1c1917' }}>
              Request Sent to Super Admin!
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b5d56', lineHeight: '1.6' }}>
              Your request for a password reset/change has been dispatched to Super Admin.
              Once approved, open <strong>Check Reset Message</strong> on the login page with your email and the code below to get your <strong>temporary password</strong>.
            </p>
            {requestCode && (
              <div style={{ border: '2px dashed #f59e0b', background: '#fffbeb', borderRadius: '12px', padding: '12px', margin: '0 0 18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e' }}>YOUR SECRET REQUEST CODE (shown once)</div>
                <code style={{ display: 'block', fontSize: '22px', fontWeight: 900, letterSpacing: '2px', color: '#1c1917', margin: '6px 0' }}>{requestCode}</code>
                <div style={{ fontSize: '12px', color: '#78350f' }}>Write it down now. Don&apos;t share it with anyone.</div>
              </div>
            )}
            <button
              onClick={handleClose}
              style={{
                background: 'var(--brand-primary)',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fff1ec, var(--brand-soft))',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                🔐
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#1c1917' }}>
                  Request Password Change
                </h3>
                <span style={{ fontSize: '12px', color: '#8c7d75' }}>
                  Super Admin Authorization Required
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#fbf8f5',
                border: '1px solid #eeddd4',
                borderRadius: '14px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#6b5d56',
                lineHeight: '1.5',
                marginBottom: '20px'
              }}
            >
              ℹ️ In ShareMeal, password modifications are secured via Super Admin verification. After approval, the admin team shares a one-time temporary password with you privately; you then choose a new password.
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                  Account Identifier
                </label>
                <input
                  type="text"
                  readOnly
                  value={user?.email || user?.phone || user?.name || ''}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e0d8d3',
                    background: '#f4f0ec',
                    color: '#6b5d56',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                  Reason for Password Reset / Change
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Want to update to a stronger password, or forgot current credentials"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e0d8d3',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    background: '#f4f0ec',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '11px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#574c45',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'var(--brand-primary)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '11px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Send Request to Super Admin →'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequestModal;
