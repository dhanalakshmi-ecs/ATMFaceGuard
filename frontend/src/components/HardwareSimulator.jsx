import React from 'react';
import { Cpu, Radio, Volume2 } from 'lucide-react';

export const HardwareSimulator = ({ 
  port = 'COM17', 
  isConnected = false, 
  lastCode = null, 
  state = 'IDLE',
  timeoutRemaining = 0
}) => {
  const isGreenActive = lastCode === 'A' || lastCode === 'B' || state.includes('AUTHORIZED');
  const isRedActive = lastCode === 'C' || state.includes('UNAUTHORIZED') || state.includes('FAILED');

  return (
    <div className="card card-glass" style={{ border: '1px solid rgba(148, 163, 184, 0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--accent-cyan)'
          }}>
            <Cpu size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>ATmega328P Indicator Mirror</h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hardware Target: <span className="font-mono text-cyan-400">{port}</span> (9600 Baud)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge ${isConnected ? 'badge-success' : 'badge-warning'}`}>
            <Radio size={12} />
            {isConnected ? 'USB LINKED' : 'STANDBY'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: '#040711',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* GREEN LED */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isGreenActive ? '#10b981' : '#1e293b',
            boxShadow: isGreenActive ? '0 0 25px #10b981, 0 0 40px rgba(16, 185, 129, 0.8)' : 'none',
            border: `2px solid ${isGreenActive ? '#34d399' : '#334155'}`,
            transition: 'all 0.3s ease'
          }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isGreenActive ? '#34d399' : 'var(--text-muted)' }}>
            PIN 12 (GREEN)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Known Face A & B</div>
        </div>

        {/* RED LED */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isRedActive ? '#ef4444' : '#1e293b',
            boxShadow: isRedActive ? '0 0 25px #ef4444, 0 0 40px rgba(239, 68, 68, 0.8)' : 'none',
            border: `2px solid ${isRedActive ? '#f87171' : '#334155'}`,
            transition: 'all 0.3s ease'
          }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isRedActive ? '#f87171' : 'var(--text-muted)' }}>
            PIN 11 (RED)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unauthorized (C)</div>
        </div>

        {/* BUZZER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: (isGreenActive || isRedActive) ? '#f59e0b' : '#1e293b',
            boxShadow: (isGreenActive || isRedActive) ? '0 0 20px #f59e0b' : 'none',
            border: `2px solid ${(isGreenActive || isRedActive) ? '#fbbf24' : '#334155'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            <Volume2 size={14} color={(isGreenActive || isRedActive) ? '#ffffff' : '#64748b'} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: (isGreenActive || isRedActive) ? '#fbbf24' : 'var(--text-muted)' }}>
            PIN 8 (BUZZER)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {lastCode === 'A' ? '1 Beep (Face A)' : lastCode === 'B' ? '2 Beeps (Face B)' : lastCode === 'C' ? '3 Beeps (Unauthorized)' : 'Silent'}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        <div>Last Signal: <strong className="font-mono text-white">{lastCode ? `'${lastCode}'` : 'None'}</strong></div>
        {timeoutRemaining > 0 && (
          <div style={{ color: 'var(--accent-amber)' }}>
            Watchdog Auto-Reset: {timeoutRemaining}s
          </div>
        )}
      </div>
    </div>
  );
};
