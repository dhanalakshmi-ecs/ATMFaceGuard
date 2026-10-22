import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { faceApi } from '../services/api';
import { useWebcam } from '../hooks/useWebcam';
import { 
  User, 
  ShieldCheck, 
  Camera, 
  Lock, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  Layers
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-enrollment state
  const [showReEnroll, setShowReEnroll] = useState(false);
  const [password, setPassword] = useState('');
  const [reEnrollSamples, setReEnrollSamples] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Webcam hook
  const { videoRef, isActive, startCamera, stopCamera, captureFrame } = useWebcam(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      await refreshUser();
      const res = await faceApi.getStatus();
      if (res.success && res.data) {
        setEnrollment(res.data);
      }
    } catch (e) {
      console.warn('Could not fetch enrollment details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReEnroll = () => {
    setShowReEnroll(true);
    setReEnrollSamples([]);
    setStatusMsg({ text: '', type: '' });
    setPassword('');
    setTimeout(() => startCamera(), 200);
  };

  const handleCloseReEnroll = () => {
    setShowReEnroll(false);
    stopCamera();
    setReEnrollSamples([]);
    setPassword('');
  };

  const handleCaptureReEnrollSample = () => {
    const frame = captureFrame();
    if (!frame) {
      setStatusMsg({ text: 'Unable to capture frame. Ensure camera is active.', type: 'error' });
      return;
    }

    setReEnrollSamples(prev => {
      const next = [...prev, frame];
      if (next.length >= 3) {
        setStatusMsg({ text: '3 samples captured. Enter password below to confirm update.', type: 'info' });
      }
      return next;
    });
  };

  const handleSubmitReEnroll = async (e) => {
    e.preventDefault();
    if (!password) {
      setStatusMsg({ text: 'Current account password is required to update biometric data.', type: 'error' });
      return;
    }

    if (reEnrollSamples.length === 0) {
      setStatusMsg({ text: 'Please capture at least one face sample.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg({ text: '', type: '' });

    try {
      const res = await faceApi.reEnroll(password, reEnrollSamples);
      if (res.success) {
        setStatusMsg({ text: res.message, type: 'success' });
        await fetchProfileData();
        setTimeout(() => handleCloseReEnroll(), 2000);
      }
    } catch (err) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '850px' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer Profile & Security</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage identity verification templates and synthetic account credentials
          </p>
        </div>

        {/* PROFILE CARD */}
        <div className="card card-glass" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
            }}>
              <User size={32} color="#ffffff" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{user?.full_name}</h2>
                <span className="badge badge-info">{user?.role}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Customer ID: <strong className="font-mono text-white">{user?.customer_id}</strong>
              </div>
            </div>

            <span className={`badge ${user?.is_active ? 'badge-success' : 'badge-danger'}`}>
              {user?.is_active ? 'Account Active' : 'Deactivated'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.875rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Mail size={14} />
                <span>Email Address</span>
              </div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{user?.email}</div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Phone size={14} />
                <span>Phone Number</span>
              </div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{user?.phone}</div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <CreditCard size={14} />
                <span>Masked Account Number</span>
              </div>
              <div className="font-mono" style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                {user?.account_number}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <Layers size={14} />
                <span>Account Type</span>
              </div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{user?.account_type}</div>
            </div>
          </div>
        </div>

        {/* BIOMETRICS DETAILS CARD */}
        <div className="card card-glass" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={20} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Face Biometrics Record</h3>
            </div>

            <span className={`badge ${user?.has_face_enrolled ? 'badge-success' : 'badge-warning'}`}>
              {user?.has_face_enrolled ? 'Enrolled' : 'Not Enrolled'}
            </span>
          </div>

          {enrollment ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              fontSize: '0.85rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Model Architecture</span>
                <div className="font-mono" style={{ fontWeight: 600 }}>{enrollment.model_name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Averaged Samples</span>
                <div style={{ fontWeight: 600 }}>{enrollment.num_samples} Sample Angle(s)</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Quality Score</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                  {enrollment.quality_score ? `${enrollment.quality_score.toFixed(1)} / 100` : 'Optimal'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Last Enrolled</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {enrollment.updated_at ? new Date(enrollment.updated_at).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              No face template on file. You will not be able to pass ATM verification until you enroll your face.
            </p>
          )}

          {!showReEnroll ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenReEnroll}
            >
              <Camera size={16} />
              <span>{user?.has_face_enrolled ? 'Re-Enroll Face Biometrics' : 'Enroll Face Now'}</span>
            </button>
          ) : (
            /* RE-ENROLLMENT MODAL / SECTION */
            <div style={{
              background: '#040711',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Authorized Biometric Re-Enrollment
                </h4>
                <button
                  type="button"
                  onClick={handleCloseReEnroll}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  Cancel
                </button>
              </div>

              {statusMsg.text && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: statusMsg.type === 'success' ? '#34d399' : '#fca5a5',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {statusMsg.text}
                </div>
              )}

              {/* CAMERA PREVIEW */}
              <div className="camera-viewport" style={{ maxHeight: '280px' }}>
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                <div className="hud-reticle" />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)'
                }}>
                  Samples: {reEnrollSamples.length} / 3
                </div>
              </div>

              {/* CAPTURE BUTTON */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '1rem 0' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCaptureReEnrollSample}
                  disabled={reEnrollSamples.length >= 3 || isSubmitting}
                  style={{ fontSize: '0.85rem' }}
                >
                  <Camera size={16} />
                  <span>Capture Sample ({reEnrollSamples.length + 1}/3)</span>
                </button>
                {reEnrollSamples.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setReEnrollSamples([])}
                    title="Reset"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>

              {/* PASSWORD CONFIRMATION */}
              <form onSubmit={handleSubmitReEnroll}>
                <div className="form-group">
                  <label className="form-label">
                    Confirm Account Password (Required for Biometric Changes)
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter current password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-cyber"
                  disabled={isSubmitting || reEnrollSamples.length === 0}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {isSubmitting ? 'Updating Biometric Embeddings...' : 'Authenticate & Save New Face Template'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
