import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import AuthHeroPanel from '../../components/auth/AuthHeroPanel';
import LoginForm from '../../components/auth/LoginForm';

export const NgoLogin = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleNgoLoginSubmit = async (credentials) => {
    setError('');
    setLoading(true);

    try {
      const data = await login(credentials);
      if (data.user?.password_change_required) {
        navigate('/set-new-password');
      } else if (data.user?.role === 'ngo' || data.user?.role === 'admin') {
        navigate('/ngo/dashboard');
      } else {
        setError('This portal is restricted to authorized NGO partners.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'NGO login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Reusable Left Hero Panel with NGO branding */}
      <AuthHeroPanel
        brandName="ShareMeal NGO Partner"
        title="NGO Distribution Portal"
        subtitle="Private management portal for managing incoming food claims & distribution logs."
        bgGradient="linear-gradient(147.83deg, #059669 7.73%, #047857 58.45%, #064e3b 92.26%)"
        badgeText="Verified Partner Portal"
        iconEmoji="📦"
      />

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <Link to="/" className="auth-back-link">
          ← Back to home
        </Link>

        <LoginForm
          title="NGO Partner Sign In"
          subtitle="Access your organization dashboard & active food claims."
          onSubmit={handleNgoLoginSubmit}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default NgoLogin;
