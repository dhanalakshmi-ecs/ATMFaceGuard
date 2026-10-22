import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';
import { AdminPage } from './pages/AdminPage';
import { HardwarePage } from './pages/HardwarePage';
import { ProfilePage } from './pages/ProfilePage';
import { Shield } from 'lucide-react';

// Protected Route Wrapper for Authenticated Customers
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Verifying terminal security credentials...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Admin Route Wrapper for Supervisory Privileges
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Verifying supervisor access level...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', borderColor: 'var(--accent-red)' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Administrative security privileges are required to access this console.
          </p>
          <a href="/dashboard" className="btn btn-secondary">
            Return to Customer Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export const App = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/verify" 
            element={
              <ProtectedRoute>
                <VerificationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            } 
          />
          <Route 
            path="/hardware" 
            element={
              <AdminRoute>
                <HardwarePage />
              </AdminRoute>
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <footer style={{
        background: '#040711',
        borderTop: '1px solid rgba(148, 163, 184, 0.08)',
        padding: '2rem 0',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <strong>ATM AI Face Verification & Serial ATmega Authorization System</strong>
            <div style={{ marginTop: '0.2rem' }}>
              Educational Biometric Security Prototype • Python Flask • FaceNet • ATmega328P / Arduino Uno
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
            <Shield size={14} color="#10b981" />
            <span>Synthetic Banking Simulation Only • No Real Financial Transactions</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
