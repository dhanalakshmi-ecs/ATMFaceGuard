import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verificationApi, transactionApi } from '../services/api';
import { 
  CreditCard, 
  Camera, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  ExternalLink
} from 'lucide-react';

export const DashboardPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atmActionStatus, setAtmActionStatus] = useState({ loading: false, msg: '', error: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('100');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await refreshUser();
      const res = await verificationApi.getHistory(5);
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTransaction = async (type) => {
    setAtmActionStatus({ loading: true, msg: '', error: '' });
    try {
      const amt = parseFloat(withdrawAmount);
      if (isNaN(amt) || amt <= 0) {
        setAtmActionStatus({ loading: false, msg: '', error: 'Enter a valid positive dollar amount.' });
        return;
      }

      const res = await transactionApi.simulate(type, amt);
      if (res.success) {
        setAtmActionStatus({ loading: false, msg: res.message, error: '' });
        await refreshUser();
      }
    } catch (err) {
      setAtmActionStatus({ loading: false, msg: '', error: err.message });
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* WELCOME BANNER & CTA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>
                Welcome, {user?.full_name}
              </h1>
              <span className="badge badge-info">{user?.account_type || 'Savings'}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Customer ID: <strong className="font-mono text-white">{user?.customer_id}</strong> | 
              Account: <strong className="font-mono text-white">{user?.account_number}</strong>
            </p>
          </div>

          <Link to="/verify" className="btn btn-cyber" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
            <Camera size={20} />
            <span>Launch ATM Face Verification</span>
          </Link>
        </div>

        {/* METRICS & CARDS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          {/* SYNTHETIC BALANCE CARD */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--accent-cyan)' }}><CreditCard size={24} /></div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Simulated ATM Balance
              </span>
            </div>

            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
              ${Number(user?.simulated_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Card Link: <span className="font-mono">{user?.account_number}</span>
            </div>
          </div>

          {/* BIOMETRIC ENROLLMENT STATUS CARD */}
          <div className="card" style={{
            border: `1px solid ${user?.has_face_enrolled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ color: user?.has_face_enrolled ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                <ShieldCheck size={24} />
              </div>
              <span className={`badge ${user?.has_face_enrolled ? 'badge-success' : 'badge-warning'}`}>
                {user?.has_face_enrolled ? 'Biometrics Enrolled' : 'Enrollment Required'}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {user?.has_face_enrolled ? 'Face Template Active' : 'Face Not Yet Enrolled'}
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {user?.has_face_enrolled 
                ? 'Your 512-dimensional FaceNet embedding is safely registered for ATM authorization.'
                : 'You must enroll your face to successfully authenticate at the ATM terminal.'}
            </p>

            {!user?.has_face_enrolled && (
              <Link to="/profile" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Complete Face Enrollment
              </Link>
            )}
          </div>

          {/* QUICK ATM ACTION SIMULATION */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Simulated ATM Actions
            </h3>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Simulate cash operations after biometric verification.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="number"
                className="form-input"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount ($)"
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={atmActionStatus.loading}
                onClick={() => handleSimulateTransaction('WITHDRAWAL')}
                style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Withdraw
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={atmActionStatus.loading}
                onClick={() => handleSimulateTransaction('DEPOSIT')}
                style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Deposit
              </button>
            </div>

            {atmActionStatus.msg && (
              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                ✅ {atmActionStatus.msg}
              </div>
            )}
            {atmActionStatus.error && (
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>
                ⚠️ {atmActionStatus.error}
              </div>
            )}
          </div>
        </div>

        {/* RECENT VERIFICATION LOGS */}
        <div className="card card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Verification Audit Logs</h3>
            </div>
            <Link to="/verify" className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              New Verification
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading audit logs...
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No verification attempts recorded yet. Click "Launch ATM Face Verification" above to begin.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Result Code</th>
                    <th>Audit Description</th>
                    <th>Match Score</th>
                    <th>Serial Port</th>
                    <th>Delivery Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.result_code === 'A' ? (
                          <span className="badge badge-success">Authorized</span>
                        ) : item.result_code === 'B' ? (
                          <span className="badge badge-danger">Mismatch</span>
                        ) : (
                          <span className="badge badge-warning">Unusable Face</span>
                        )}
                      </td>
                      <td>
                        <strong className="font-mono">{item.result_code}</strong>
                      </td>
                      <td style={{ maxWidth: '300px' }}>{item.result_description}</td>
                      <td className="font-mono">
                        {item.similarity_score !== null ? `${(item.similarity_score * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="font-mono">{item.serial_port || 'COM17'}</td>
                      <td>
                        <span style={{
                          color: item.serial_delivery_status === 'delivered' ? '#34d399' : '#f87171',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}>
                          {item.serial_delivery_status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
