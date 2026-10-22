import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Camera, 
  Cpu, 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  UserCheck, 
  Layers 
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div style={{ padding: '3rem 0 5rem' }}>
      <div className="container">
        {/* HERO SECTION */}
        <div style={{
          textAlign: 'center',
          maxWidth: '850px',
          margin: '0 auto 4rem',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}>
            <ShieldCheck size={16} />
            <span>AI BIOMETRIC VERIFICATION & SERIAL ATMEGA328P PROTOCOL</span>
          </div>

          <h1 style={{
            fontSize: '3rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Next-Generation ATM Face Verification Terminal
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2.5rem'
          }}>
            End-to-end security architecture featuring high-precision FaceNet embeddings, 
            instant liveness evaluation, and deterministic hardware authorization signaled 
            to an ATmega328P microcontroller over serial protocol.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 1.85rem', fontSize: '1rem' }}>
              <span>Sign In to Terminal</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ padding: '0.85rem 1.85rem', fontSize: '1rem' }}>
              <span>Register New Customer</span>
            </Link>
          </div>
        </div>

        {/* 3 OUTCOME CODES EXPLAINER */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Deterministic Tri-State Authorization Protocol
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Strict outcome codes mapped synchronously from Python neural engine to ATmega firmware
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Outcome A */}
            <div className="card" style={{ borderTop: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-success font-mono" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                  CODE A
                </span>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>GREEN LED ON</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
                Authorized Face
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Authenticated customer whose live camera embedding matches enrolled template with score &ge; threshold.
                Green LED lights up, single confirmation beep sounds, and verified details are unlocked.
              </p>
            </div>

            {/* Outcome B */}
            <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-danger font-mono" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                  CODE B
                </span>
                <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>RED LED ON (2 BEEPS)</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
                Authorization Failed
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Face is detected but fails identity matching (score &lt; threshold) or identity fails authorization.
                Red LED lights up with 2 warning beeps. Never reveals personal data of other customers.
              </p>
            </div>

            {/* Outcome C */}
            <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge badge-warning font-mono" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                  CODE C
                </span>
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>RED LED ON (3 BEEPS)</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f8fafc' }}>
                Unauthorized / Invalid Face
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                No face detected, multiple faces in view, image too blurry, bad lighting, or liveness failure.
                Red LED lights up with 3 warning beeps. Protects against improper camera inputs.
              </p>
            </div>
          </div>
        </div>

        {/* ARCHITECTURE HIGHLIGHTS */}
        <div className="card card-glass" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
            Full-Stack Architecture & Embedded Link
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ color: 'var(--accent-cyan)' }}><Camera size={24} /></div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>MTCNN & FaceNet</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  512-dimensional unit-normalized embeddings with cosine similarity matching and blur detection.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ color: 'var(--accent-emerald)' }}><Cpu size={24} /></div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>PySerial Hardware Controller</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Default COM17 (9600 baud) with selectable COM ports, safe diagnostic pings, and timeout fail-safe.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ color: 'var(--accent-amber)' }}><Lock size={24} /></div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Enterprise Privacy</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Bcrypt salted passwords, JWT bearer tokens, masked account displays, and rate-limited attempt locks.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ color: '#a855f7' }}><Layers size={24} /></div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Simulated ATM Operations</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Interactive deposit, withdrawal, balance inquiry, and audit logs with synthetic accounts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DEMO ACCOUNTS HELPER */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          borderRadius: '12px',
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Pre-Configured Demo Credentials:</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Customer: <code className="font-mono text-emerald-400">alice</code> / <code className="font-mono">CustomerPass123!</code> | 
              Admin: <code className="font-mono text-cyan-400">admin</code> / <code className="font-mono">AdminPass123!</code>
            </div>
          </div>
          <Link to="/login" className="btn btn-cyber" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            Jump to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
