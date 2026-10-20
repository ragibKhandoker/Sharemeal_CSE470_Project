import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthHeroPanel from '../../components/auth/AuthHeroPanel';
import LoginForm from '../../components/auth/LoginForm';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (credentials) => {
    setError('');
    setLoading(true);

    try {
      const data = await login(credentials);
      const role = data.user?.role || 'donor';

      if (data.user?.password_change_required) {
        navigate('/set-new-password');
      } else if (redirectTarget) {
        navigate(redirectTarget);
      } else if (role === 'donor') {
        navigate('/donor/profile');
      } else if (role === 'ngo') {
        navigate('/ngo/dashboard');
      } else if (role === 'receiver') {
        navigate('/receiver/dashboard');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
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
          : err.message || 'Login failed';

      setError({
        message: serverMsg || fallback,
        notFound: serverData?.userExists === false || err.response?.status === 404 || /no account|not found/i.test(serverMsg || ''),
        userExists: serverData?.userExists === true || /incorrect password/i.test(serverMsg || ''),
        field: serverData?.field || null
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Reusable Left Hero Panel */}
      <AuthHeroPanel
        title="Welcome back!"
        subtitle="Your community is waiting. Log back in to rescue food and feed people."
      />

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <Link to="/" className="auth-back-link">
          ← Back to home
        </Link>

        <LoginForm
          title="Log in"
          subtitle="Good to see you again."
          onSubmit={handleLoginSubmit}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
};

export default Login;
