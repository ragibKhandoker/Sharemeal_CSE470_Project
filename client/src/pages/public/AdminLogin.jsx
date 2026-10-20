import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ email, password });
      if (data.user?.password_change_required) {
        navigate('/set-new-password');
      } else if (data.user?.role === 'admin') {
        navigate('/admin/users');
      } else {
        setError('Access denied: Account does not have Super Admin privileges.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Super Admin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#181311', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '440px', background: '#241c19', borderRadius: '24px', padding: '36px', border: '1px solid #3a2e29', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', color: '#fff' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-deep) 100%)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 8px 20px rgba(var(--brand-primary-rgb), 0.3)' }}>
            👑
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>Super Admin Portal</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Restricted access for system management &amp; user verification
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', padding: '12px', borderRadius: 12, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
              SUPER ADMIN EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', background: '#1a1412', border: '1px solid #3d312a', borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                PASSWORD
              </label>
              <Link
                to="/request-password-reset"
                state={email.includes('@') ? { email: email.trim() } : undefined}
                title="Another Super Admin must approve your request"
                style={{ color: 'var(--brand-primary)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
              >
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', background: '#1a1412', border: '1px solid #3d312a', borderRadius: 12, padding: '12px 42px 12px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, fontSize: '16px', cursor: 'pointer', opacity: 0.8 }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: 'var(--brand-primary)', color: '#fff', border: 0, borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 6px 16px rgba(var(--brand-primary-rgb), 0.3)' }}
          >
            {loading ? 'Authenticating...' : 'Access Admin Panel →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
            ← Back to Public User Login
          </Link>
        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
