import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthHeroPanel from '../../components/auth/AuthHeroPanel';
import RoleSelector from '../../components/auth/RoleSelector';
import SignupForm from '../../components/auth/SignupForm';

export const Signup = () => {
  const [searchParams] = useSearchParams();
  const queryRole = searchParams.get('role');
  const queryStep = searchParams.get('step');
  const redirectTarget = searchParams.get('redirect');

  const [step, setStep] = useState(queryStep ? parseInt(queryStep, 10) : (queryRole ? 2 : 1));
  const [role, setRole] = useState(queryRole || 'donor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSignupSubmit = async (formData) => {
    setError('');
    setLoading(true);

    try {
      const data = await register(formData);
      const userRole = data.user?.role || role;

      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (userRole === 'donor') {
        navigate('/donor/profile');
      } else if (userRole === 'receiver') {
        navigate('/receiver/dashboard');
      } else if (userRole === 'ngo') {
        navigate('/ngo/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const serverData = err.response?.data;
      const serverMsg =
        serverData?.message ||
        (Array.isArray(serverData?.errors) ? serverData.errors.map(e => e.msg).join(', ') : null);
      const fallback =
        err.response?.status === 500
          ? 'Server Error (500): Could not connect to the database. Ensure server/.env has DATABASE_URL and the backend is running on port 5001.'
          : err.message || 'Registration failed';

      const isDuplicate = serverData?.userExists || err.response?.status === 409 || /already\s+(exist|registered)/i.test(serverMsg || '');
      setError({
        message: serverMsg || fallback,
        userExists: isDuplicate,
        field: serverData?.field || (serverMsg && /phone|mobile/i.test(serverMsg) ? 'phone' : serverMsg && /email/i.test(serverMsg) ? 'email' : null)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Reusable Left Hero Panel */}
      <AuthHeroPanel
        title="Join the movement."
        subtitle="Turn surplus into someone's meal. Sign up in under a minute."
      />

      {/* Right Form Panel */}
      <div className={`auth-form-panel${step === 2 ? ' auth-form-panel--signup' : ''}`}>
        {step === 1 ? (
          <Link to="/" className="auth-back-link">
            ← Back to home
          </Link>
        ) : (
          <button type="button" onClick={() => setStep(1)} className="auth-back-link">
            ← Change role
          </button>
        )}

        {/* Progress Stepper */}
        <div className="auth-stepper">
          <div className={`auth-step-pill ${step >= 1 ? 'active' : ''}`}>
            <div className="auth-step-num">1</div>
            <span>Choose role</span>
          </div>
          <div className="auth-step-arrow">→</div>
          <div className={`auth-step-pill ${step >= 2 ? 'active' : ''}`}>
            <div className="auth-step-num">2</div>
            <span>Your details</span>
          </div>
        </div>

        {/* STEP 1: Role Selector */}
        {step === 1 && (
          <RoleSelector
            role={role}
            setRole={setRole}
            onContinue={() => setStep(2)}
          />
        )}

        {/* STEP 2: Signup Form */}
        {step === 2 && (
          <SignupForm
            role={role}
            onSubmit={handleSignupSubmit}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  );
};

export default Signup;
