'use client';

import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0); // 0=intro, 1=glow, 2=fadeout

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);   // Start glow pulse
    const t2 = setTimeout(() => setPhase(2), 3800);   // Begin fade-out
    const t3 = setTimeout(() => onComplete(), 4600);   // Fully remove
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#050810',
      opacity: phase === 2 ? 0 : 1,
      transition: 'opacity 0.8s ease-out',
      overflow: 'hidden'
    }}>
      {/* Animated Grid Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,243,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,243,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        animation: 'gridScroll 8s linear infinite'
      }} />

      {/* Radial Glow Pulse */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: phase >= 1
          ? 'radial-gradient(circle, rgba(0,243,255,0.12) 0%, rgba(0,100,255,0.06) 40%, transparent 70%)'
          : 'transparent',
        transition: 'all 1.5s ease',
        animation: phase >= 1 ? 'breathe 3s ease-in-out infinite' : 'none'
      }} />

      {/* Horizontal Scan Line */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,243,255,0.3) 30%, rgba(0,243,255,0.8) 50%, rgba(0,243,255,0.3) 70%, transparent 100%)',
        animation: 'scanLine 2.5s ease-in-out infinite',
        boxShadow: '0 0 20px rgba(0,243,255,0.4), 0 0 60px rgba(0,243,255,0.15)'
      }} />

      {/* Orbiting Ring */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        border: '1px solid rgba(0,243,255,0.08)',
        animation: 'orbitSpin 12s linear infinite',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 1s ease'
      }}>
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '50%',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#00f3ff',
          boxShadow: '0 0 12px #00f3ff, 0 0 30px rgba(0,243,255,0.5)'
        }} />
      </div>

      {/* Second Orbiting Ring */}
      <div style={{
        position: 'absolute',
        width: '420px',
        height: '420px',
        borderRadius: '50%',
        border: '1px solid rgba(0,243,255,0.04)',
        animation: 'orbitSpin 18s linear infinite reverse',
        opacity: phase >= 1 ? 0.7 : 0,
        transition: 'opacity 1.2s ease'
      }}>
        <div style={{
          position: 'absolute',
          bottom: '-3px',
          left: '30%',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#ff00b3',
          boxShadow: '0 0 10px #ff00b3, 0 0 25px rgba(255,0,179,0.4)'
        }} />
      </div>

      {/* Main Logo Text */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        transform: phase >= 1 ? 'scale(1)' : 'scale(0.85)',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* GKAS */}
        <div style={{
          fontSize: 'clamp(42px, 8vw, 72px)',
          fontWeight: 900,
          letterSpacing: '12px',
          color: '#ffffff',
          textShadow: '0 0 40px rgba(0,243,255,0.3), 0 0 80px rgba(0,243,255,0.1)',
          lineHeight: 1,
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
        }}>
          GKAS<span style={{
            background: 'linear-gradient(135deg, #00f3ff, #0090ff, #ff00b3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>FLOWS</span>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 'clamp(10px, 1.5vw, 13px)',
          fontWeight: 600,
          letterSpacing: '6px',
          color: 'rgba(142, 146, 151, 0.8)',
          marginTop: '16px',
          textTransform: 'uppercase',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease 0.4s'
        }}>
          GLOBAL TACTICAL RADAR
        </div>

        {/* Animated Underline */}
        <div style={{
          margin: '20px auto 0',
          height: '2px',
          width: phase >= 1 ? '200px' : '0px',
          background: 'linear-gradient(90deg, transparent, #00f3ff, #ff00b3, transparent)',
          transition: 'width 1s ease 0.3s',
          borderRadius: '2px',
          boxShadow: '0 0 15px rgba(0,243,255,0.4)'
        }} />
      </div>

      {/* Loading Indicator */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 0.5s ease 0.8s'
      }}>
        {/* Dot Loader */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#00f3ff',
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              boxShadow: '0 0 8px rgba(0,243,255,0.6)'
            }} />
          ))}
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '3px',
          color: 'rgba(142,146,151,0.5)',
          textTransform: 'uppercase'
        }}>
          INITIALIZING GLOBAL RADAR
        </div>
      </div>

      {/* Corner Decorations */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
        const isTop = corner.includes('top');
        const isLeft = corner.includes('left');
        return (
          <div key={corner} style={{
            position: 'absolute',
            [isTop ? 'top' : 'bottom']: '24px',
            [isLeft ? 'left' : 'right']: '24px',
            width: '40px',
            height: '40px',
            borderTop: isTop ? '2px solid rgba(0,243,255,0.2)' : 'none',
            borderBottom: !isTop ? '2px solid rgba(0,243,255,0.2)' : 'none',
            borderLeft: isLeft ? '2px solid rgba(0,243,255,0.2)' : 'none',
            borderRight: !isLeft ? '2px solid rgba(0,243,255,0.2)' : 'none',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'opacity 0.5s ease 0.6s'
          }} />
        );
      })}

      {/* CSS Keyframes */}
      <style>{`
        @keyframes gridScroll {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes scanLine {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes orbitSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
