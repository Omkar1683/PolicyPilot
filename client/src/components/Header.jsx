import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDrawerOpen(false);
  };

  const navLinks = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/documents', label: 'Documents' },
        { to: '/chat', label: 'Chat' },
      ]
    : [];

  return (
    <>
      <header className="pp-header">
        <div className="pp-header-inner">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="pp-logo">
            <div className="pp-logo-icon">◈</div>
            <span>POLICY<span style={{ color: 'var(--yellow)', WebkitTextStroke: '1.5px var(--ink)' }}>PILOT</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="pp-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `pp-nav-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <button onClick={handleLogout} className="pp-btn pp-btn-dark pp-btn-sm" style={{ marginLeft: '0.5rem' }}>
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="pp-nav-link">Login</Link>
                <Link to="/register" className="pp-btn pp-btn-primary pp-btn-sm" style={{ marginLeft: '0.25rem' }}>
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="pp-btn pp-btn-ghost pp-btn-icon"
            style={{ display: 'none' }}
            id="hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <style>{`
            @media (max-width: 768px) {
              #hamburger-btn { display: flex !important; }
            }
          `}</style>
        </div>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div className="pp-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="pp-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>MENU</span>
              <button className="pp-btn pp-btn-ghost pp-btn-icon" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `pp-nav-link${isActive ? ' active' : ''}`}
                style={{ display: 'block', padding: '0.875rem 1rem', fontSize: '1rem', borderBottom: '1.5px solid var(--gray-200)' }}
                onClick={() => setDrawerOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            {!user && (
              <>
                <NavLink to="/login" className="pp-nav-link" style={{ display: 'block', padding: '0.875rem 1rem' }} onClick={() => setDrawerOpen(false)}>Login</NavLink>
                <NavLink to="/register" className="pp-nav-link" style={{ display: 'block', padding: '0.875rem 1rem' }} onClick={() => setDrawerOpen(false)}>Register</NavLink>
              </>
            )}
            {user && (
              <button onClick={handleLogout} className="pp-btn pp-btn-dark" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}>
                Logout
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
