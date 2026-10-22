import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verificationApi, hardwareApi } from '../services/api';
import { useWebcam } from '../hooks/useWebcam';
import { HardwareSimulator } from '../components/HardwareSimulator';
import { 
  Camera, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowLeft,
  Cpu, 
  User, 
  Clock, 
  Lock
} from 'lucide-react';

export const VerificationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Webcam hook
  const { videoRef, isActive, error: camError, startCamera, stopCamera, captureFrame, captureBurst } = useWebcam(true);

  // Verification Processing States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [hardwareState, setHardwareState] = useState({
    port: 'COM17',
    isConnected: false,
    lastCode: null,
    statusText: 'Standby'
  });
  const [watchdogTimer, setWatchdogTimer] = useState(0);

  // Fetch initial hardware status
  useEffect(() => {
    const fetchHw = async () => {
      try {
        const res = await hardwareApi.getStatus();
        if (res.success && res.status) {
          setHardwareState(prev => ({
            ...prev,
            port: res.status.port || 'COM17',
            isConnected: res.status.is_connected,
            lastCode: res.status.last_command
          }));
        }
      } catch (e) {
        console.warn('Hardware status query failed:', e);
      }
    };
    fetchHw();
  }, []);

  // Watchdog countdown effect matching ATmega firmware (5s for A, 4s for B/C)
  useEffect(() => {
    let interval = null;
    if (watchdogTimer > 0) {
      interval = setInterval(() => {
        setWatchdogTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [watchdogTimer]);

  // Execute ATM Face Verification Event (Debounced / Single Action)
  const handleStartVerification = async () => {
    if (isVerifying) return; // Guard against multiple simultaneous clicks

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // 1. Capture a longer burst while the user turns slightly for liveness
      const frames = await captureBurst(15, 200);
      if (!frames || frames.length === 0) {
        throw new Error('Camera failed to supply image frame. Please ensure camera is active and unobstructed.');
      }

      const primaryImage = frames[0];
      const additionalFrames = frames.slice(1);

      // 2. Submit to backend
      const response = await verificationApi.submitFrame(primaryImage, additionalFrames);
      
      if (response.success && response.data) {
        const resultData = response.data;
        setVerificationResult(resultData);

        // Update hardware state mirror
        const resultCode = resultData.code;
        setHardwareState(prev => ({
          ...prev,
          lastCode: resultCode,
          statusText: resultCode === 'A' ? 'AUTHORIZED' : resultCode === 'B' ? 'FAILED' : 'UNAUTHORIZED',
          isConnected: resultData.serial_status?.delivered ?? prev.isConnected
        }));

        // Set watchdog auto-reset timer (5s for A, 4s for B/C)
        setWatchdogTimer(resultCode === 'A' ? 5 : 4);
      } else {
        throw new Error(response.message || 'Verification failed on server.');
      }
    } catch (err) {
      // Handle client-side error
      const fallbackResult = {
        outcome: 'C',
        code: 'C',
        status: 'CLIENT_ERROR',
        title: 'Verification Error',
        message: err.message || 'An error occurred during frame capture or server communication.',
        serial_status: { delivered: false, error: 'Request failed before serial dispatch.' },
        timestamp: new Date().toISOString()
      };
      setVerificationResult(fallbackResult);
      setHardwareState(prev => ({ ...prev, lastCode: 'C' }));
      setWatchdogTimer(4);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRetry = () => {
    setVerificationResult(null);
    setWatchdogTimer(0);
  };

  const getReticleClass = () => {
    if (!verificationResult) return '';
    if (verificationResult.outcome === 'A') return 'reticle-authorized';
    return 'reticle-failed';
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* HEADER BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
              <ArrowLeft size={16} />
              <span>Dashboard</span>
            </Link>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>ATM Biometric Face Terminal</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Turn slightly left and right during the camera scan
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-info font-mono">
              Active User: {user?.username} ({user?.customer_id})
            </span>
          </div>
        </div>

        {/* MAIN TERMINAL GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* LEFT COLUMN: LIVE CAMERA & HUD */}
          <div>
            <div className="camera-viewport">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <div className={`hud-reticle ${getReticleClass()}`} />
              {isVerifying && <div className="hud-scanline" />}

              {/* Status pill overlay */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0, 0, 0, 0.75)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isActive ? '#10b981' : '#ef4444'
                }} />
                <span>{isActive ? 'CAMERA LIVE' : 'CAMERA OFFLINE'}</span>
              </div>

              {/* Active analysis banner */}
              {isVerifying && (
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  background: 'rgba(6, 182, 212, 0.9)',
                  color: '#ffffff',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)'
                }}>
                  SCANNING BIOMETRICS & RUNNING FACENET INFERENCE...
                </div>
              )}
            </div>

            {camError && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.85rem'
              }}>
                {camError}
              </div>
            )}

            {/* ACTION CONTROLS */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                className="btn btn-cyber"
                disabled={isVerifying || !isActive}
                onClick={handleStartVerification}
                style={{ flex: 1, padding: '0.85rem 1.5rem', fontSize: '1rem' }}
              >
                <Camera size={20} />
                <span>{isVerifying ? 'Analyzing Biometrics...' : 'Verify Face & Authorize'}</span>
              </button>

              {verificationResult && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRetry}
                  disabled={isVerifying}
                  style={{ padding: '0.85rem 1.25rem' }}
                >
                  <RefreshCw size={18} />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: OUTCOME CARD & HARDWARE MIRROR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* HARDWARE MIRROR */}
            <HardwareSimulator 
              port={hardwareState.port}
              isConnected={hardwareState.isConnected}
              lastCode={hardwareState.lastCode}
              state={hardwareState.statusText}
              timeoutRemaining={watchdogTimer}
            />

            {/* INITIAL INSTRUCTIONS CARD */}
            {!verificationResult && !isVerifying && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Verification Checklist
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    Position face inside the dashed oval reticle.
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    Ensure even ambient lighting without harsh backlighting.
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    Only one person must be visible in front of the ATM.
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    Turn your head slightly left and right when scanning.
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    Serial command (A, B, or C) is transmitted automatically.
                  </li>
                </ul>
              </div>
            )}

            {/* === RESULT OUTCOME A or B: AUTHORIZED KNOWN FACE === */}
            {verificationResult && (verificationResult.outcome === 'A' || verificationResult.outcome === 'B') && (
              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '2px solid #10b981',
                boxShadow: 'var(--shadow-glow-green)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge badge-success font-mono" style={{ fontSize: '0.85rem' }}>
                    OUTCOME {verificationResult.outcome} : KNOWN FACE {verificationResult.outcome === 'A' ? '1' : '2'} (AUTHORIZED)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.8rem', fontWeight: 700 }}>
                    <CheckCircle2 size={16} />
                    <span>SIGNAL '{verificationResult.outcome}\n' SENT</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  Access Granted (Known Face {verificationResult.outcome})
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#a7f3d0', marginBottom: '1.25rem' }}>
                  {verificationResult.message}
                </p>

                {/* VERIFIED CUSTOMER PROFILE UNLOCKED */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    AUTHENTICATED ACCOUNT DETAILS:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Account Holder</div>
                      <strong style={{ color: '#fff' }}>{verificationResult.verified_user?.full_name}</strong>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Customer ID</div>
                      <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                        {verificationResult.verified_user?.customer_id}
                      </strong>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Masked Account</div>
                      <strong className="font-mono" style={{ color: '#fff' }}>
                        {verificationResult.verified_user?.masked_account}
                      </strong>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Simulated Balance</div>
                      <strong style={{ color: '#34d399' }}>
                        ${Number(verificationResult.verified_user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* BIOMETRIC & SERIAL AUDIT STATS */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>Match Score: <strong className="text-white">{verificationResult.similarity_score}%</strong> (Threshold: {verificationResult.threshold}%)</div>
                  <div>Serial Port: <strong className="font-mono text-white">{verificationResult.serial_status?.port || 'COM17'}</strong></div>
                </div>
              </div>
            )}

            {/* === RESULT OUTCOME C: UNAUTHORIZED / UNKNOWN FACE / INVALID === */}
            {verificationResult && verificationResult.outcome === 'C' && verificationResult.status === 'DENIED' && (
              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '2px solid #ef4444',
                boxShadow: 'var(--shadow-glow-red)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge badge-danger font-mono" style={{ fontSize: '0.85rem' }}>
                    OUTCOME C : UNAUTHORIZED
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.8rem', fontWeight: 700 }}>
                    <XCircle size={16} />
                    <span>SIGNAL 'C\n' SENT</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  Access Denied
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: '1.25rem' }}>
                  {verificationResult.message}
                </p>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem'
                }}>
                  🔒 <strong>Security Notice:</strong> The presented face was not recognized as an enrolled authorized customer (or camera quality was insufficient). Physical board output: Red LED active with 3 error beeps.
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>Match Score: <strong className="text-white">{verificationResult.similarity_score !== undefined ? `${verificationResult.similarity_score}%` : '—'}</strong></div>
                  <div>Serial Port: <strong className="font-mono text-white">{verificationResult.serial_status?.port || 'COM17'}</strong></div>
                </div>
              </div>
            )}

            {/* === RESULT OUTCOME C: UNAUTHORIZED / NO VALID FACE === */}
            {verificationResult && verificationResult.outcome === 'C' && verificationResult.status !== 'DENIED' && (
              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(120, 53, 15, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '2px solid #f59e0b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge badge-warning font-mono" style={{ fontSize: '0.85rem' }}>
                    OUTCOME C : INVALID
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>
                    <AlertTriangle size={16} />
                    <span>SIGNAL 'C\n' SENT</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  {verificationResult.title || 'Cannot Proceed'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#fde68a', marginBottom: '1.25rem' }}>
                  {verificationResult.message}
                </p>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem'
                }}>
                  ⚠️ Verification aborted due to video quality or liveness failure. Please ensure your face is well-lit, steady, and that no other individuals are within the camera frame.
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <div>Signal Dispatched: <strong className="font-mono text-white">'C\n'</strong></div>
                  <div>Target Board: <strong className="font-mono text-white">{hardwareState.port}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
