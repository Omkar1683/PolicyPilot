import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      const { data } = await authService.login(form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pp-page-enter" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--yellow)', border: 'var(--border)',
            padding: '0.375rem 1rem', marginBottom: '1.5rem', borderRadius: '2px'
          }}>
            <span style={{ fontSize: '1rem' }}>◈</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>POLICYPILOT</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            ENTER POLICY PILOT
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9375rem' }}>Sign in to your account</p>
        </div>

        {/* Form card */}
        <div className="pp-card" style={{ padding: '2rem', background: 'var(--white)' }}>
          <form onSubmit={handleSubmit} id="login-form">
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="pp-label" htmlFor="login-email">EMAIL</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className="pp-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label className="pp-label" htmlFor="login-password">PASSWORD</label>
              <input
                id="login-password"
                name="password"
                type="password"
                className="pp-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="pp-btn pp-btn-dark"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.9375rem', padding: '0.875rem', boxShadow: 'var(--shadow)' }}
            >
              {loading ? (
                <><div className="pp-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> SIGNING IN...</>
              ) : (
                'LOGIN →'
              )}
            </button>
          </form>

          <div className="pp-divider" style={{ margin: '1.5rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--gray-400)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'underline' }}>
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
