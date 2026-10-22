import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldAlert, Check, Sparkles, User, Lock } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (userVal, passVal) => {
    setUsername(userVal);
    setPassword(passVal);
    setError('');
  };

  return (
    <div style={{ padding: '3.5rem 0' }}>
      <div className="container" style={{ maxWidth: '480px' }}>
        <div className="card card-glass" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
            }}>
              <LogIn size={24} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sign In to Terminal</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              ATM Face Verification & ATmega Controller
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.5rem'
            }}>
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. alice or alice@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to ATM Account'}
            </button>
          </form>

          {/* QUICK DEMO FILL BUTTONS */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              <Sparkles size={14} color="var(--accent-cyan)" />
              <span>Click to autofill pre-configured demo credentials:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickFill('alice', 'CustomerPass123!')}
              >
                <span>👤 <strong>Alice Walker</strong> (Customer with Enrolled Face)</span>
                <span className="badge badge-success">Enrolled</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickFill('bob', 'CustomerPass123!')}
              >
                <span>👤 <strong>Bob Martinez</strong> (New Customer - No Face Enrolled)</span>
                <span className="badge badge-warning">Unenrolled</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickFill('admin', 'AdminPass123!')}
              >
                <span>🛡️ <strong>System Admin</strong> (Audit & COM Port Management)</span>
                <span className="badge badge-info">Admin</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
              Register Customer & Enroll Face
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
