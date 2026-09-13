import React, { useState, useEffect, useRef } from 'react';

interface CommandConsoleProps {
  logs: string[];
}

export default function CommandConsole({ logs }: CommandConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[SYSTEM_INIT] Global Kinetic Awareness System (GKAS) Online",
    "[SECURE_LINK] Orbital satellite array connected.",
    "[DATA_FEED] Establishing real-time ADS-B transponder telemetry...",
    "[STATUS] Nominal operations. Awaiting commands..."
  ]);

  // Simulate incoming logs if none are passed
  useEffect(() => {
    if (logs && logs.length > 0) {
      setConsoleLogs(prev => [...prev, ...logs].slice(-50));
    }
  }, [logs]);

  useEffect(() => {
    // Mock intermittent network logs
    const interval = setInterval(() => {
      const mockEvents = [
        "[TCP/IP] Heartbeat acknowledged from node Alpha-09.",
        "[SATCOM] Tracking new orbital trajectory delta...",
        "[RADAR] Sweeping sector 7G. No anomalies detected.",
        "[SECURITY] Firewalls cycling keys. Encryption level: MAX",
        "[SYS_WARN] High bandwidth consumption on port 443.",
        "[OP_COMMS] 'Vanguard Actual, this is Outpost 4. Holding position.'"
      ];
      const newLog = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      setConsoleLogs(prev => {
        const next = [...prev, `[${new Date().toISOString().split('T')[1].substring(0, 8)}] ${newLog}`];
        return next.slice(-50); // Keep last 50
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  return (
    <div className="glass-panel" style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      zIndex: 900,
      borderTop: '1px solid var(--color-border-glass)',
      borderBottom: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderRadius: '16px 16px 0 0',
      padding: '16px 32px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        borderBottom: '1px solid var(--color-border-glass)',
        paddingBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="animate-pulse-glow" style={{ width: '8px', height: '8px', backgroundColor: '#00ff88', borderRadius: '50%' }} />
          <span style={{ fontSize: '11px', color: 'var(--color-neon-cyan)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Secure Command Terminal //
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>ENCRYPTION: RSA-4096</div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>UPLINK: ACTIVE</div>
        </div>
      </div>
      
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: '#00ff88',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {consoleLogs.map((log, i) => (
          <div key={i} style={{ 
            opacity: i === consoleLogs.length - 1 ? 1 : 0.7,
            textShadow: i === consoleLogs.length - 1 ? '0 0 5px #00ff88' : 'none'
          }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
