import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { faceApi } from '../services/api';
import { useWebcam } from '../hooks/useWebcam';
import { 
  UserPlus, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles,
  ArrowRight,
  Eye
} from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [step, setStep] = useState(1); // 1: Info Form, 2: Face Enrollment
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    date_of_birth: '',
    account_type: 'Savings',
    password: '',
    confirm_password: ''
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Face Enrollment State
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState({ loading: false, error: '', success: false });

  // Webcam hook (activated on Step 2)
  const { videoRef, isActive, error: camError, startCamera, captureFrame } = useWebcam(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Step 1: Submit user registration
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.confirm_password) {
      setFormError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(formData);
      // Advance to Face Enrollment Step
      setStep(2);
      setTimeout(() => startCamera(), 200);
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Capture a sample frame from webcam
  const handleCaptureSample = () => {
    const frame = captureFrame();
    if (!frame) {
      setEnrollmentStatus({ loading: false, error: 'Could not capture frame from webcam. Ensure camera is active.', success: false });
      return;
    }

    setCapturedSamples(prev => {
      const next = [...prev, frame];
      if (next.length >= 3) {
        // Automatically submit when 3 samples are collected
        handleCompleteEnrollment(next);
      }
      return next;
    });
  };

  const handleResetSamples = () => {
    setCapturedSamples([]);
    setEnrollmentStatus({ loading: false, error: '', success: false });
  };

  const handleCompleteEnrollment = async (samplesToUpload) => {
    const samples = samplesToUpload || capturedSamples;
    if (samples.length === 0) {
      setEnrollmentStatus({ loading: false, error: 'Please capture at least one face sample.', success: false });
      return;
    }

    setEnrollmentStatus({ loading: true, error: '', success: false });

    try {
      const res = await faceApi.enroll(samples);
      if (res.success) {
        setEnrollmentStatus({ loading: false, error: '', success: true });
        setTimeout(() => {
          navigate('/dashboard');
        }, 1800);
      } else {
        setEnrollmentStatus({ loading: false, error: res.message || 'Face enrollment failed.', success: false });
      }
    } catch (err) {
      setEnrollmentStatus({ 
        loading: false, 
        error: err.message || 'Face enrollment failed. Ensure only one clear face is centered with good lighting.', 
        success: false 
      });
    }
  };

  const handleSkipEnrollment = () => {
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: step === 1 ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: step === 1 ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
            border: `1px solid ${step === 1 ? 'var(--accent-cyan)' : 'var(--accent-emerald)'}`,
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <span>1</span>
            <span>Customer Account</span>
          </div>

          <div style={{ width: '40px', height: '2px', background: step === 2 ? 'var(--accent-emerald)' : 'var(--border-color)' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: step === 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.1)',
            color: step === 2 ? 'var(--accent-emerald)' : 'var(--text-muted)',
            border: `1px solid ${step === 2 ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <span>2</span>
            <span>Biometric Face Enrollment</span>
          </div>
        </div>

        {/* STEP 1: REGISTRATION FORM */}
        {step === 1 && (
          <div className="card card-glass">
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Customer Registration</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Create your synthetic ATM banking profile
              </p>
            </div>

            {formError && (
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
                marginBottom: '1.25rem'
              }}>
                <AlertTriangle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStep1Submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    name="username"
                    className="form-input"
                    placeholder="e.g. jdoe24"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="e.g. john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    name="phone"
                    className="form-input"
                    placeholder="e.g. +1 555-0192"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    className="form-input"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select
                    name="account_type"
                    className="form-select"
                    value={formData.account_type}
                    onChange={handleInputChange}
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Checking">Checking Account</option>
                    <option value="Premium">Premium Tier Account</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-input"
                    placeholder="Min 8 chars, 1 uppercase, 1 digit"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirm_password"
                    className="form-input"
                    placeholder="Re-enter password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.25rem'
              }}>
                ℹ️ <strong>Customer ID</strong> and synthetic <strong>Account Number</strong> will be generated automatically and securely salted with bcrypt.
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.85rem' }}
              >
                {isSubmitting ? 'Creating Profile...' : 'Continue to Biometric Face Enrollment'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                Sign in to existing account
              </Link>
            </div>
          </div>
        )}

        {/* STEP 2: FACE ENROLLMENT WIZARD */}
        {step === 2 && (
          <div className="card card-glass">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'inline-flex',
                padding: '0.4rem 0.8rem',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '0.5rem'
              }}>
                STEP 2 OF 2
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Enroll Face Biometrics</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Capture 3 clear face samples (Center, Slight Left, Slight Right)
              </p>
            </div>

            {camError && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {camError}
              </div>
            )}

            {enrollmentStatus.error && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                ⚠️ {enrollmentStatus.error}
              </div>
            )}

            {enrollmentStatus.success && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#34d399',
                fontSize: '0.9rem',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                ✅ Face Biometrics Enrolled Successfully! Redirecting to Dashboard...
              </div>
            )}

            {/* CAMERA VIEWPORT WITH RETICLE */}
            <div className="camera-viewport">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <div className="hud-reticle" />
              <div className="hud-scanline" />

              {/* Sample indicator badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(6, 182, 212, 0.4)'
              }}>
                Samples: {capturedSamples.length} / 3
              </div>
            </div>

            {/* CAPTURE BUTTONS & SAMPLES PREVIEW */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCaptureSample}
                  disabled={capturedSamples.length >= 3 || enrollmentStatus.loading}
                  style={{ padding: '0.75rem 1.75rem' }}
                >
                  <Camera size={18} />
                  <span>
                    {capturedSamples.length === 0 
                      ? 'Capture Sample 1 (Facing Center)' 
                      : capturedSamples.length === 1 
                      ? 'Capture Sample 2 (Slight Left)' 
                      : capturedSamples.length === 2 
                      ? 'Capture Sample 3 (Slight Right)' 
                      : 'All 3 Samples Captured'}
                  </span>
                </button>

                {capturedSamples.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResetSamples}
                    disabled={enrollmentStatus.loading}
                    title="Retake Samples"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>

              {/* THUMBNAILS PREVIEW */}
              {capturedSamples.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  {capturedSamples.map((img, i) => (
                    <div key={i} style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid var(--accent-emerald)'
                    }}>
                      <img src={img} alt={`Sample ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.7)',
                        fontSize: '0.65rem',
                        textAlign: 'center',
                        color: '#fff'
                      }}>
                        Sample {i+1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {capturedSamples.length > 0 && capturedSamples.length < 3 && (
                <button
                  type="button"
                  className="btn btn-cyber"
                  onClick={() => handleCompleteEnrollment()}
                  disabled={enrollmentStatus.loading}
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  {enrollmentStatus.loading ? 'Computing Face Embeddings...' : `Enroll with ${capturedSamples.length} Captured Sample(s)`}
                </button>
              )}

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleSkipEnrollment}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Skip face enrollment for now (Enroll later in Profile)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
