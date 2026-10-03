import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill all fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await authService.register(form);
      login(data.token, data.user);
      toast.success('Account created! Welcome to PolicyPilot.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pp-page-enter" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
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
            CREATE ACCOUNT
          </h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9375rem' }}>Start understanding your policies today</p>
        </div>

        <div className="pp-card" style={{ padding: '2rem', background: 'var(--white)' }}>
          <form onSubmit={handleSubmit} id="register-form">
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="pp-label" htmlFor="reg-name">FULL NAME</label>
              <input
                id="reg-name"
                name="name"
                type="text"
                className="pp-input"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="pp-label" htmlFor="reg-email">EMAIL</label>
              <input
                id="reg-email"
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
              <label className="pp-label" htmlFor="reg-password">PASSWORD</label>
              <input
                id="reg-password"
                name="password"
                type="password"
                className="pp-input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              id="register-submit-btn"
              className="pp-btn pp-btn-dark"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.9375rem', padding: '0.875rem', boxShadow: 'var(--shadow)' }}
            >
              {loading ? (
                <><div className="pp-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> CREATING ACCOUNT...</>
              ) : (
                'CREATE ACCOUNT →'
              )}
            </button>
          </form>

          <div className="pp-divider" style={{ margin: '1.5rem 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--gray-400)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'underline' }}>
              Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
