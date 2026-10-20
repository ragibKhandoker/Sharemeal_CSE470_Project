import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import PasswordChecklist from './PasswordChecklist';
import { isStrongPassword } from '../../utils/passwordRules';

const normalizeBangladeshPhone = (value) => {
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (!/^(?:01[3-9]\d{8}|(?:\+880|00880|880)1[3-9]\d{8})$/.test(compact)) return '';
  if (compact.startsWith('+880')) return `0${compact.slice(4)}`;
  if (compact.startsWith('00880')) return `0${compact.slice(5)}`;
  if (compact.startsWith('880')) return `0${compact.slice(3)}`;
  return compact;
};
const isBangladeshPhone = (value) => /^01[3-9]\d{8}$/.test(normalizeBangladeshPhone(value));

export const SignupForm = ({ role, onSubmit, loading, error }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [nid, setNid] = useState('');
  const [nidPdf, setNidPdf] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  // Users must tick the Terms/Privacy box themselves; it starts unticked.
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState('');
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);

  // Duplicate user detection states
  const [phoneExistsMsg, setPhoneExistsMsg] = useState('');
  const [phoneFormatMsg, setPhoneFormatMsg] = useState('');
  const [emailExistsMsg, setEmailExistsMsg] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const roleLabels = {
    donor: 'I want to Donate',
    receiver: 'I want to Find Food',
    ngo: 'I am an NGO / Organization'
  };

  const handlePhoneBlur = async () => {
    const trimmed = normalizeBangladeshPhone(phone);
    if (!trimmed || !isBangladeshPhone(trimmed)) return;
    setCheckingPhone(true);
    try {
      const res = await authService.checkExists({ phone: trimmed });
      if (res.exists && (res.field === 'phone' || res.field === 'identifier')) {
        setPhoneExistsMsg('User already exists with this phone number. Please log in instead.');
      } else {
        setPhoneExistsMsg('');
      }
    } catch (e) {
      // background check silent fail
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleEmailBlur = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) return;
    setCheckingEmail(true);
    try {
      const res = await authService.checkExists({ email: trimmed });
      if (res.exists && (res.field === 'email' || res.field === 'identifier')) {
        setEmailExistsMsg('User already exists with this email address. Please log in instead.');
      } else {
        setEmailExistsMsg('');
      }
    } catch (e) {
      // background check silent fail
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formComplete) {
      setAttempted(true);
    setAgreeError('Please fill up the form first.');
      focusFirstProblem();
      return;
    }
    if (!isBangladeshPhone(phone)) {
      setPhoneFormatMsg('Enter a valid Bangladesh mobile number, such as 01712345678.');
      return;
    }
    setPhoneFormatMsg('');
    if (!isStrongPassword(password)) {
      setPasswordError('Please use a strong password: mix small and capital letters, a number and a symbol (at least 8 characters).');
      document.getElementById('signup-password')?.focus();
      return;
    }
    setPasswordError('');
    if (!agreed) {
      setAgreeError('Please tick the box to agree to the Terms of Service and Privacy Policy.');
      document.getElementById('agreeTerms')?.focus();
      return;
    }
    setAgreeError('');
    onSubmit({
      name,
      phone: normalizeBangladeshPhone(phone),
      email,
      address,
      nid,
      nidPdf,
      password,
      role,
      agreed
    });
  };

  // The Terms checkbox unlocks only after every required field is valid.
  // Each entry explains exactly what is still wrong, so users are never stuck.
  const formProblems = [
    !name.trim() && { id: 'signup-name', text: 'Full Name is empty' },
    !isBangladeshPhone(phone) && { id: 'signup-phone', text: phone.trim() ? 'Mobile Number must look like 01712345678' : 'Mobile Number is empty' },
    phoneExistsMsg && { id: 'signup-phone', text: 'This Mobile Number is already registered' },
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && { id: 'signup-email', text: email.trim() ? 'Email Address is not valid (e.g. name@gmail.com)' : 'Email Address is empty' },
    emailExistsMsg && { id: 'signup-email', text: 'This Email Address is already registered' },
    !nid.trim() && { id: 'signup-nid', text: 'NID / ID Number is empty' },
    !nidPdf && { id: 'signup-nid-doc', text: 'NID / ID Document is not uploaded' },
    !isStrongPassword(password) && { id: 'signup-password', text: password ? 'Password is not strong yet (see the checklist)' : 'Password is empty' },
    !confirmPassword && { id: 'signup-confirm-password', text: 'Confirm Password is empty' },
    confirmPassword && confirmPassword !== password && { id: 'signup-confirm-password', text: 'Passwords do not match' }
  ].filter(Boolean);
  const formComplete = formProblems.length === 0;
  // Only show problems for fields the user has already filled in or left,
  // or every problem once they try to agree / submit too early.
  const visibleProblems = attempted ? formProblems : formProblems.filter((problem) => touched[problem.id]);
  const markTouched = (e) => {
    const { id } = e.target;
    if (id && id.startsWith('signup-') && !touched[id]) setTouched((current) => ({ ...current, [id]: true }));
  };

  // If a required field is cleared after agreeing, the agreement is undone.
  useEffect(() => {
    if (!formComplete && agreed) setAgreed(false);
  }, [formComplete, agreed]);

  const focusFirstProblem = () => {
    const field = formProblems[0] && document.getElementById(formProblems[0].id);
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field.focus({ preventScroll: true });
    }
  };

  const handleAgreeClick = (e) => {
    if (formComplete) return;
    e.preventDefault();
    setAttempted(true);
    setAgreeError('Please fill up the form first.');
    focusFirstProblem();
  };

  const errorMessage = typeof error === 'string' ? error : (error?.message || '');
  const isDuplicateError = (error && typeof error === 'object' && error.userExists) || /already\s+(exist|registered)/i.test(errorMessage);
  const duplicateField = (error && typeof error === 'object' && error.field) || (errorMessage.toLowerCase().includes('email') ? 'email' : (errorMessage.toLowerCase().includes('phone') || errorMessage.toLowerCase().includes('mobile') ? 'phone' : null));

  const hasPhoneDuplicate = Boolean(phoneExistsMsg) || (isDuplicateError && duplicateField === 'phone');
  const hasEmailDuplicate = Boolean(emailExistsMsg) || (isDuplicateError && duplicateField === 'email');
  const hasAnyDuplicate = Boolean(phoneExistsMsg) || Boolean(emailExistsMsg) || isDuplicateError;

  return (
    <div>
      <div className="auth-form-header">
        <h1>Your details</h1>
        <div>
          <span className={`auth-selected-role-pill ${role}`}>
            Signing up as {roleLabels[role]}
          </span>
        </div>
      </div>

      {hasAnyDuplicate ? (
        <div style={{
          marginBottom: 16,
          padding: '14px 16px',
          background: '#fff7ed',
          border: '1.5px solid #fed7aa',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#9a3412', marginBottom: '4px' }}>
                User Already Exists
              </div>
              <div style={{ fontSize: '13px', color: '#c2410c', lineHeight: 1.4, marginBottom: '10px' }}>
                {phoneExistsMsg || emailExistsMsg || errorMessage || 'An account with this phone number or email address already exists. Please log in instead.'}
              </div>
              <Link
                to={`/login?identifier=${encodeURIComponent(phone || email || '')}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ea580c',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                }}
              >
                Log in to Your Account →
              </Link>
            </div>
          </div>
        </div>
      ) : errorMessage ? (
        <div style={{ marginBottom: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, borderRadius: 10 }}>
          {errorMessage}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        // A field counts as touched once the user leaves it (or picks a file),
        // so errors don't appear while they are still typing.
        onBlur={markTouched}
        onChange={(e) => { if (e.target.type === 'file') markTouched(e); }}
      >
        <div className="auth-grid-2">
        <div className="auth-input-group">
          <label>Full Name <span className="required">*</span></label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">👤</span>
            <input
              type="text"
              id="signup-name"
              placeholder="Abdur Rahman"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-input-group">
          <label>Mobile Number <span className="required">*</span></label>
          <div className="auth-input-wrapper" style={{ borderColor: hasPhoneDuplicate ? '#ef4444' : undefined, background: hasPhoneDuplicate ? '#fffbfb' : undefined }}>
            <span className="auth-input-icon">📞</span>
            <input
              id="signup-phone"
              type="tel"
              inputMode="tel"
              placeholder="01712345678 or +8801712345678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneFormatMsg('');
                if (phoneExistsMsg) setPhoneExistsMsg('');
              }}
              onBlur={handlePhoneBlur}
              required
            />
            {checkingPhone && <span style={{ fontSize: '11px', color: '#9c8e85', marginRight: '8px' }}>Checking...</span>}
          </div>
          {phoneFormatMsg && <div role="alert" style={{ marginTop: 6, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{phoneFormatMsg}</div>}
          {hasPhoneDuplicate && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⚠️ User already exists with this phone number.</span>
              <Link to={`/login?identifier=${encodeURIComponent(phone)}`} style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'underline' }}>
                Log in instead →
              </Link>
            </div>
          )}
        </div>

        </div>

        <div className="auth-grid-2">
        <div className="auth-input-group">
          <label>Email Address <span className="required">*</span></label>
          <div className="auth-input-wrapper" style={{ borderColor: hasEmailDuplicate ? '#ef4444' : undefined, background: hasEmailDuplicate ? '#fffbfb' : undefined }}>
            <span className="auth-input-icon">✉️</span>
            <input
              id="signup-email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailExistsMsg) setEmailExistsMsg('');
              }}
              onBlur={handleEmailBlur}
              required
            />
            {checkingEmail && <span style={{ fontSize: '11px', color: '#9c8e85', marginRight: '8px' }}>Checking...</span>}
          </div>
          {hasEmailDuplicate && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600, display: 'flex', flexWrap: 'wrap', gap: '4px 8px', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⚠️ User already exists with this email address.</span>
              <Link to={`/login?identifier=${encodeURIComponent(email)}`} style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'underline' }}>
                Log in instead →
              </Link>
            </div>
          )}
        </div>

        <div className="auth-input-group">
          <label>Address</label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">📍</span>
            <input
              type="text"
              placeholder="Street, City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        </div>

        <div className="auth-grid-2">
        <div className="auth-input-group">
          <label>NID / ID Number <span className="required">*</span></label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">🛡️</span>
            <input
              type="text"
              id="signup-nid"
              placeholder="1234567890123"
              value={nid}
              onChange={(e) => setNid(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-input-group">
          <label>NID / ID Document (PDF or Image) <span className="required">*</span></label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">📤</span>
            <input
              id="signup-nid-doc"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setNidPdf(e.target.files[0] || null)}
            />
          </div>
        </div>

        </div>

        <div className="auth-grid-2">
        <div className="auth-input-group">
          <label htmlFor="signup-password">Password <span className="required">*</span></label>
          <div className="auth-input-wrapper" style={{ position: 'relative' }}>
            <span className="auth-input-icon">🔒</span>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="e.g. Share@Meal2026"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError && isStrongPassword(e.target.value)) setPasswordError('');
              }}
              aria-invalid={Boolean(passwordError)}
              aria-describedby="password-rules"
              required
              style={{ paddingRight: '40px', borderColor: passwordError ? '#f87171' : undefined }}
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

        <div className="auth-input-group">
          <label htmlFor="signup-confirm-password">Confirm Password <span className="required">*</span></label>
          <div
            className="auth-input-wrapper"
            style={{ borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : undefined }}
          >
            <span className="auth-input-icon">🔁</span>
            <input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Type the password again"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(confirmPassword) && confirmPassword !== password}
              aria-describedby="confirm-password-status"
              required
            />
          </div>
          {confirmPassword && (
            <div id="confirm-password-status" aria-live="polite" style={{ marginTop: 4, fontSize: 11.5, fontWeight: 600, color: confirmPassword === password ? '#15803d' : '#dc2626' }}>
              {confirmPassword === password ? '✓ Passwords match' : '✕ Passwords do not match'}
            </div>
          )}
        </div>
        </div>

        <div className="signup-field-hint">
          Use a strong password: small and capital letters, numbers and symbols mixed (8+ characters).
        </div>
        <PasswordChecklist password={password} showErrors={Boolean(passwordError)} />
        {passwordError && (
          <div role="alert" style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12.5px', fontWeight: 600 }}>
            {passwordError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '14px 0 4px', fontSize: 12, color: '#6b5d56', opacity: formComplete ? 1 : 0.55 }}>
          <input
            type="checkbox"
            id="agreeTerms"
            checked={agreed}
            onClick={handleAgreeClick}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setAgreeError('');
            }}
            aria-disabled={!formComplete}
            aria-invalid={Boolean(agreeError)}
            aria-describedby="agree-hint"
            style={{ accentColor: 'var(--brand-primary)', marginTop: 2, cursor: formComplete ? 'pointer' : 'not-allowed' }}
          />
          <label htmlFor="agreeTerms" style={{ textTransform: 'none', fontWeight: 400, margin: 0, cursor: formComplete ? 'pointer' : 'not-allowed', lineHeight: 1.5 }}>
            I agree to ShareMeal's{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary-dark)', fontWeight: 600 }}>Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary-dark)', fontWeight: 600 }}>Privacy Policy</a>
          </label>
        </div>
        <div id="agree-hint" aria-live="polite" style={{ margin: '0 0 12px' }}>
          {!formComplete ? (
            visibleProblems.length > 0 ? (
              <div role={agreeError ? 'alert' : undefined} style={{ padding: '10px 12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '12.5px', lineHeight: 1.5 }}>
                <strong>{agreeError ? `⚠️ ${agreeError}` : '⚠️ Please fix:'}</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                  {visibleProblems.map((problem) => (
                    <li key={problem.text}>
                      <button
                        type="button"
                        onClick={() => document.getElementById(problem.id)?.focus()}
                        style={{ border: 0, padding: 0, background: 'transparent', color: 'inherit', font: 'inherit', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                      >
                        {problem.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#8c7e77' }}>Fill up the form to unlock this box.</div>
            )
          ) : !agreed ? (
            <div role={agreeError ? 'alert' : undefined} style={{ padding: '8px 12px', borderRadius: '10px', background: agreeError ? '#fef2f2' : '#ecfdf5', border: `1px solid ${agreeError ? '#fecaca' : '#a7f3d0'}`, color: agreeError ? '#991b1b' : '#065f46', fontSize: '12.5px', fontWeight: 600 }}>
              {agreeError ? `⚠️ ${agreeError}` : '✅ All set — now tick the box above to create your account.'}
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? 'Creating Account...' : 'Create Account →'}
        </button>
      </form>

      <p className="auth-switch-text">
        Already have an account?{' '}
        <Link to="/login" className="auth-switch-link">
          Log in
        </Link>
      </p>
    </div>
  );
};

export default SignupForm;
