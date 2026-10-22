import React, { useState, useEffect } from 'react';
import { hardwareApi } from '../services/api';
import { 
  Cpu, 
  RefreshCw, 
  Radio, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  Send,
  Zap,
  Info
} from 'lucide-react';

export const HardwarePage = () => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('COM7');
  const [baudrate, setBaudrate] = useState(9600);
  const [status, setStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchHardwareData();
  }, []);

  const fetchHardwareData = async () => {
    setLoading(true);
    setActionMsg({ text: '', type: '' });
    try {
      const [portsRes, statusRes] = await Promise.all([
        hardwareApi.getPorts(),
        hardwareApi.getStatus()
      ]);

      if (portsRes.success) {
        setPorts(portsRes.ports || []);
        if (portsRes.current_port) setSelectedPort(portsRes.current_port);
      }

      if (statusRes.success) {
        setStatus(statusRes.status);
        if (statusRes.status?.port) setSelectedPort(statusRes.status.port);
        if (statusRes.status?.baudrate) setBaudrate(statusRes.status.baudrate);
      }
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setActionMsg({ text: '', type: '' });
    setLoading(true);
    try {
      const res = await hardwareApi.connect(selectedPort, baudrate);
      setActionMsg({ text: res.message, type: 'success' });
      fetchHardwareData();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
      fetchHardwareData();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionMsg({ text: '', type: '' });
    setLoading(true);
    try {
      const res = await hardwareApi.disconnect();
      setActionMsg({ text: res.message, type: 'success' });
      fetchHardwareData();
    } catch (err) {
      setActionMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPing = async () => {
    setTestResult(null);
    setActionMsg({ text: '', type: '' });
    try {
      const res = await hardwareApi.test();
      setTestResult(res.data);
      setActionMsg({ 
        text: `Diagnostic probe test returned: ${res.data?.firmware_response || 'Acknowledged'}`, 
        type: 'success' 
      });
    } catch (err) {
      setActionMsg({ text: `Probe failed: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>ATmega Serial Communication Controller</h1>
              <span className="badge badge-info font-mono">PYSERIAL</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Configure USB serial connection parameters to Arduino Uno / ATmega328P
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchHardwareData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            <span>Scan Ports</span>
          </button>
        </div>

        {actionMsg.text && (
          <div style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: actionMsg.type === 'success' ? '#34d399' : '#fca5a5',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            {actionMsg.text}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* LEFT: CONTROLS & SETTINGS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card card-glass">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Serial Interface Settings
              </h3>

              <div className="form-group">
                <label className="form-label">Target Serial Port</label>
                <select
                  className="form-select font-mono"
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                >
                  {ports.map((p) => (
                    <option key={p.port} value={p.port}>
                      {p.port} — {p.description} {p.is_active_device ? '★ (Active Device)' : ''}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Default is <strong>COM7</strong>. Selectable list includes COM1-COM10 and any live system ports.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Baud Rate</label>
                <select
                  className="form-select font-mono"
                  value={baudrate}
                  onChange={(e) => setBaudrate(parseInt(e.target.value))}
                >
                  <option value={9600}>9600 Baud (Firmware Standard)</option>
                  <option value={19200}>19200 Baud</option>
                  <option value={38400}>38400 Baud</option>
                  <option value={57600}>57600 Baud</option>
                  <option value={115200}>115200 Baud</option>
                </select>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                {status?.is_connected ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDisconnect}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    Disconnect {status.port}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConnect}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    Connect to {selectedPort}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-cyber"
                  onClick={handleTestPing}
                  disabled={loading || !status?.is_connected}
                  title="Sends safe ping 'P' to board. Never grants authorization."
                >
                  <Zap size={16} />
                  <span>Test Connection (Ping 'P')</span>
                </button>
              </div>
            </div>

            {/* TEST RESULT CARD */}
            {testResult && (
              <div className="card" style={{ border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Terminal size={18} color="var(--accent-cyan)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Firmware Diagnostic Probe Response</h4>
                </div>
                
                <pre style={{
                  background: '#020617',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#38bdf8',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT: LIVE TELEMETRY & HARDWARE WIRING */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* LIVE TELEMETRY */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Serial Telemetry</h3>
                <span className={`badge ${status?.is_connected ? 'badge-success' : 'badge-danger'}`}>
                  {status?.is_connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Configured Port:</span>
                  <strong className="font-mono">{status?.port || selectedPort}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Baud Rate:</span>
                  <strong className="font-mono">{status?.baudrate || baudrate}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Command Sent:</span>
                  <strong className="font-mono text-cyan-400">
                    {status?.last_command ? `'${status.last_command}\\n'` : 'None'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Sent Timestamp:</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {status?.last_sent_timestamp ? new Date(status.last_sent_timestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>

                {status?.last_error && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    fontSize: '0.75rem',
                    color: '#f87171'
                  }}>
                    {status.last_error}
                  </div>
                )}
              </div>
            </div>

            {/* ATMEGA328P WIRING REFERENCE */}
            <div className="card card-glass">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Info size={18} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>ATmega328P / Arduino Uno Pinout</h3>
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pin 12 (Digital):</span>
                  <strong style={{ color: '#34d399' }}>Green LED (220Ω Resistor)</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pin 11 (Digital):</span>
                  <strong style={{ color: '#f87171' }}>Red LED (220Ω Resistor)</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pin 8 (Digital):</span>
                  <strong style={{ color: '#fbbf24' }}>Active Buzzer Module</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GND (Power):</span>
                  <strong style={{ color: '#94a3b8' }}>Common Breadboard Ground</strong>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>USB Cable:</span>
                  <strong style={{ color: '#38bdf8' }}>Host PC USB &rarr; COM17</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
