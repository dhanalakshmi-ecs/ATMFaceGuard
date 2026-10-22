import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hardwareApi } from '../services/api';
import { 
  ShieldCheck, 
  Camera, 
  LayoutDashboard, 
  Cpu, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Settings, 
  Activity 
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hwStatus, setHwStatus] = useState({ is_connected: false, port: 'COM17' });

  // Periodically check hardware status for the header pill
  useEffect(() => {
    let isMounted = true;
    const fetchHw = async () => {
      try {
        const res = await hardwareApi.getStatus();
        if (isMounted && res.success && res.status) {
          setHwStatus(res.status);
        }
      } catch {
        // Soft fail
      }
    };

    fetchHw();
    const interval = setInterval(fetchHw, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      background: 'rgba(11, 15, 25, 0.92)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
          }}>
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              ATM<span style={{ color: '#10b981' }}>FaceGuard</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '0.05em' }}>
              AI BIOMETRIC & ATMEGA328P
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                className="btn btn-secondary"
                style={{ 
                  background: isActive('/dashboard') ? 'var(--bg-surface-hover)' : 'transparent',
                  borderColor: isActive('/dashboard') ? 'var(--accent-cyan)' : 'transparent',
                  padding: '0.5rem 0.85rem'
                }}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              <Link 
                to="/verify" 
                className="btn btn-cyber"
                style={{ padding: '0.5rem 1rem' }}
              >
                <Camera size={16} />
                <span>ATM Verification</span>
              </Link>

              {isAdmin && (
                <>
                  <Link 
                    to="/admin" 
                    className="btn btn-secondary"
                    style={{ 
                      background: isActive('/admin') ? 'var(--bg-surface-hover)' : 'transparent',
                      borderColor: isActive('/admin') ? 'var(--accent-cyan)' : 'transparent',
                      padding: '0.5rem 0.85rem'
                    }}
                  >
                    <Activity size={16} />
                    <span>Admin Audit</span>
                  </Link>

                  <Link 
                    to="/hardware" 
                    className="btn btn-secondary"
                    style={{ 
                      background: isActive('/hardware') ? 'var(--bg-surface-hover)' : 'transparent',
                      borderColor: isActive('/hardware') ? 'var(--accent-cyan)' : 'transparent',
                      padding: '0.5rem 0.85rem'
                    }}
                  >
                    <Cpu size={16} />
                    <span>Hardware Settings</span>
                  </Link>
                </>
              )}

              <Link 
                to="/profile" 
                className="btn btn-secondary"
                style={{ 
                  background: isActive('/profile') ? 'var(--bg-surface-hover)' : 'transparent',
                  borderColor: isActive('/profile') ? 'var(--accent-cyan)' : 'transparent',
                  padding: '0.5rem 0.85rem'
                }}
              >
                <User size={16} />
                <span>{user?.username}</span>
              </Link>

              <button 
                onClick={handleLogout} 
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.85rem', color: '#f87171' }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                <UserPlus size={16} />
                <span>Register</span>
              </Link>
            </>
          )}

          {/* Hardware Connection Pill */}
          <Link 
            to={isAdmin ? "/hardware" : "#"}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: hwStatus.is_connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${hwStatus.is_connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              fontSize: '0.75rem',
              fontWeight: 600,
              marginLeft: '0.5rem'
            }}
            title={hwStatus.is_connected ? `ATmega connected on ${hwStatus.port}` : `Hardware disconnected on ${hwStatus.port}`}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: hwStatus.is_connected ? '#10b981' : '#ef4444',
              boxShadow: hwStatus.is_connected ? '0 0 8px #10b981' : '0 0 8px #ef4444'
            }}></span>
            <span className="font-mono">{hwStatus.port || 'COM17'}</span>
            <span style={{ color: hwStatus.is_connected ? '#34d399' : '#f87171' }}>
              {hwStatus.is_connected ? 'ONLINE' : 'STANDBY'}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
};
