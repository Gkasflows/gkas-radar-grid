'use client';

import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0); 

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);    // Initialize immediately
    const t2 = setTimeout(() => setPhase(2), 5200);   // Begin massive cinematic fade out
    const t3 = setTimeout(() => onComplete(), 6800);  // Unmount after transition
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  // Tactical data uplink generator for the corner HUD
  const [coords, setCoords] = useState("00.0000°N, 000.0000°E");
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setCoords(`${(Math.random() * 90).toFixed(4)}°N, ${(Math.random() * 180).toFixed(4)}°E`);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: phase === 2 ? 'transparent' : '#000000',
      opacity: phase === 2 ? 0 : 1,
      transform: phase === 2 ? 'scale(1.15)' : 'scale(1)',
      filter: phase === 2 ? 'blur(20px)' : 'blur(0px)',
      transition: 'all 1.6s cubic-bezier(0.8, 0, 0.2, 1)',
      overflow: 'hidden',
      color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Massive Cinematic Ambient Deep-Space Glow */}
      <div style={{
        position: 'absolute',
        width: '120vw',
        height: '120vh',
        background: 'radial-gradient(circle at 50% 50%, rgba(15, 25, 45, 0.4) 0%, transparent 65%)',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 3s ease'
      }} />

      {/* Gigantic slow-rotating architectural radar ring representing global uplink */}
      <div style={{
        position: 'absolute',
        width: '140vh',
        height: '140vh',
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: '50%',
        animation: 'spin 80s linear infinite',
      }}>
        {/* Subtle structural crosshairs */}
        <div style={{ position: 'absolute', top: 0, left: '50%', width: '1px', height: '100%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent, rgba(255,255,255,0.08))' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'linear-gradient(to right, rgba(255,255,255,0.08), transparent, rgba(255,255,255,0.08))' }} />
      </div>

      <div style={{
        position: 'absolute',
        width: '60vh',
        height: '60vh',
        border: '1px solid rgba(255,255,255,0.02)',
        borderRadius: '50%',
        animation: 'spin 40s linear infinite reverse',
      }} />

      {/* Central Monolithic UI */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ overflow: 'hidden', paddingBottom: '10px' }}>
          {/* Logo Cinematic Upward Mask Reveal */}
          <div style={{
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 200,
            letterSpacing: '24px',
            color: '#fff',
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(100px)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'all 2.2s cubic-bezier(0.16, 1, 0.3, 1)',
            textShadow: '0 0 40px rgba(255,255,255,0.3)'
          }}>
            GKAS<span style={{ fontWeight: 800 }}>FLOWS</span>
          </div>
        </div>
        
        {/* Razor-thin horizontal glass divider */}
        <div style={{
           marginTop: '10px',
           height: '1px',
           width: phase >= 1 ? '120%' : '0%',
           background: 'rgba(255,255,255,0.15)',
           transition: 'width 2.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
           boxShadow: '0 0 10px rgba(255,255,255,0.2)'
        }} />

        {/* Minimal Subtitle */}
        <div style={{
          marginTop: '24px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '10px',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'all 2s ease 1.2s'
        }}>
          Planetary Flight Architecture
        </div>
      </div>

      {/* Top Left Enterprise HUD Elements */}
      <div style={{ 
        position: 'absolute', 
        top: '40px', 
        left: '40px', 
        fontSize: '10px', 
        color: 'rgba(255,255,255,0.3)', 
        letterSpacing: '3px', 
        fontFamily: 'monospace', 
        opacity: phase >= 1 ? 1 : 0, 
        transition: 'opacity 2.5s ease 1s' 
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
            <span>SYS.CORE</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>[ONLINE]</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <span>DATALINK</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>[SECURE]</span>
        </div>
        <div style={{ marginTop: '30px', color: 'rgba(255,255,255,0.15)' }}>
            SEQ: {coords}
        </div>
      </div>

      {/* Bottom Right Enterprise Signoff */}
      <div style={{ 
        position: 'absolute', 
        bottom: '40px', 
        right: '40px', 
        fontSize: '10px', 
        color: 'rgba(255,255,255,0.2)', 
        letterSpacing: '4px', 
        fontFamily: 'monospace', 
        opacity: phase >= 1 ? 1 : 0, 
        transition: 'opacity 2.5s ease 1.5s', 
        textAlign: 'right' 
      }}>
        <div>KERNEL v9.4.12_PROD</div>
        <div style={{ marginTop: '10px' }}>GKAS AEROSPACE DIVISION</div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
