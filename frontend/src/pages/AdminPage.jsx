import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { 
  ShieldCheck, 
  Users, 
  Activity, 
  Sliders, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  UserCheck,
  UserX,
  Cpu
} from 'lucide-react';

export const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedOutcome, setSelectedOutcome] = useState(''); // '' for All, 'A', 'B', 'C'
  const [threshold, setThreshold] = useState(0.65);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchAdminData();
  }, [selectedOutcome]);

  const fetchAdminData = async () => {
    setLoading(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getLogs(selectedOutcome || null, 50)
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
        if (statsRes.data.current_threshold) {
          setThreshold(statsRes.data.current_threshold);
        }
      }
      if (usersRes.success) setUsers(usersRes.data);
      if (logsRes.success) setLogs(logsRes.data);
    } catch (err) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await adminApi.toggleUserStatus(userId);
      if (res.success) {
        setStatusMsg({ text: res.message, type: 'success' });
        fetchAdminData();
      }
    } catch (err) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  const handleUpdateThreshold = async () => {
    try {
      const res = await adminApi.updateThreshold(parseFloat(threshold));
      if (res.success) {
        setStatusMsg({ text: res.message, type: 'success' });
        fetchAdminData();
      }
    } catch (err) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Security & Audit Console</h1>
              <span className="badge badge-info font-mono">SUPERVISOR</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Monitor system biometric verification metrics, user access permissions, and threshold sensitivity
            </p>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={fetchAdminData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>Refresh Audit Data</span>
          </button>
        </div>

        {statusMsg.text && (
          <div style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: statusMsg.type === 'success' ? '#34d399' : '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            {statusMsg.text}
          </div>
        )}

        {/* METRICS ROW */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem'
          }}>
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Customers
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {stats.total_customers}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                {stats.total_enrolled_faces} Enrolled Faces
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Verifications
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {stats.total_verifications}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                Success Rate: {stats.success_rate_percent}%
              </div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 600 }}>
                Outcome A (Authorized)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: '#34d399' }}>
                {stats.outcomes?.authorized_A || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched 'A\n'</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>
                Outcome B (Mismatch)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: '#f87171' }}>
                {stats.outcomes?.failed_B || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched 'B\n'</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>
                Outcome C (Unusable)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.25rem', color: '#fbbf24' }}>
                {stats.outcomes?.unusable_C || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched 'C\n'</div>
            </div>
          </div>
        )}

        {/* THRESHOLD SENSITIVITY CONFIGURATION */}
        <div className="card card-glass" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <Sliders size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              FaceNet Biometric Match Threshold Configuration
            </h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Adjust the required cosine similarity score to qualify as <strong>Outcome A (Authorized)</strong>. 
            Higher values require closer resemblance (lower false acceptance); lower values permit slight angle/expression variations.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>0.30 (Permissive)</span>
                <span>Current: <strong className="font-mono text-cyan-400">{threshold}</strong> ({(threshold * 100).toFixed(0)}%)</span>
                <span>0.95 (Strict)</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-cyber"
              onClick={handleUpdateThreshold}
            >
              Save New Threshold
            </button>
          </div>
        </div>

        {/* REGISTERED USERS MANAGEMENT TABLE */}
        <div className="card card-glass" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Users size={20} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Customer Accounts</h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Masked Account</th>
                  <th>Biometrics</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-mono font-bold text-cyan-400">{u.customer_id}</td>
                    <td>{u.full_name}</td>
                    <td className="font-mono">{u.username}</td>
                    <td>{u.email}</td>
                    <td className="font-mono">{u.account_number}</td>
                    <td>
                      {u.has_face_enrolled ? (
                        <span className="badge badge-success">Enrolled</span>
                      ) : (
                        <span className="badge badge-warning">Unenrolled</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleUser(u.id)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VERIFICATION AUDIT TRAIL */}
        <div className="card card-glass">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Activity size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Verification Audit Logs</h3>
            </div>

            {/* Outcome Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  background: selectedOutcome === '' ? 'var(--accent-cyan)' : 'transparent',
                  color: selectedOutcome === '' ? '#000' : 'var(--text-primary)'
                }}
                onClick={() => setSelectedOutcome('')}
              >
                All
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  background: selectedOutcome === 'A' ? '#10b981' : 'transparent',
                  color: selectedOutcome === 'A' ? '#000' : 'var(--text-primary)'
                }}
                onClick={() => setSelectedOutcome('A')}
              >
                Outcome A
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  background: selectedOutcome === 'B' ? '#ef4444' : 'transparent',
                  color: selectedOutcome === 'B' ? '#fff' : 'var(--text-primary)'
                }}
                onClick={() => setSelectedOutcome('B')}
              >
                Outcome B
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  background: selectedOutcome === 'C' ? '#f59e0b' : 'transparent',
                  color: selectedOutcome === 'C' ? '#000' : 'var(--text-primary)'
                }}
                onClick={() => setSelectedOutcome('C')}
              >
                Outcome C
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Outcome</th>
                  <th>Customer</th>
                  <th>Description</th>
                  <th>Score</th>
                  <th>Serial Port</th>
                  <th>Delivery</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No verification logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td className="font-mono text-muted">{l.id}</td>
                      <td>
                        {l.result_code === 'A' ? (
                          <span className="badge badge-success font-mono">A (Auth)</span>
                        ) : l.result_code === 'B' ? (
                          <span className="badge badge-danger font-mono">B (Fail)</span>
                        ) : (
                          <span className="badge badge-warning font-mono">C (Invalid)</span>
                        )}
                      </td>
                      <td>
                        {l.customer_name ? (
                          <div>
                            <strong>{l.customer_name}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.customer_id}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unknown / Unmatched</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '260px' }}>{l.result_description}</td>
                      <td className="font-mono">
                        {l.similarity_score !== null ? `${(l.similarity_score * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="font-mono">{l.serial_port || 'COM17'}</td>
                      <td>
                        <span style={{
                          color: l.serial_delivery_status === 'delivered' ? '#34d399' : '#f87171',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}>
                          {l.serial_delivery_status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
