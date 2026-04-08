'use client';

import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0); 

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);    // Start the plane flight
    const t2 = setTimeout(() => setPhase(2), 4000);   // Begin smooth transition to map
    const t3 = setTimeout(() => onComplete(), 5600);  // Unmount completely
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
      background: phase === 2 ? 'transparent' : '#050810',
      opacity: phase === 2 ? 0 : 1,
      transform: phase === 2 ? 'scale(1.1)' : 'scale(1)',
      filter: phase === 2 ? 'blur(15px)' : 'blur(0px)',
      transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>

      {/* The Sleek Airplane Fly-By */}
      <div style={{
        position: 'absolute',
        top: 'calc(50% - 10px)',
        left: '-150px', // Start extremely far left
        width: '50px',
        height: '50px',
        zIndex: 50,
        animation: phase >= 1 ? 'flyAcross 3.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards' : 'none',
      }}>
        {/* Modern Airliner Jet Silhouette SVG rotated to fly straight Right */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ 
          width: '100%', 
          height: '100%', 
          transform: 'rotate(90deg)', 
          filter: 'drop-shadow(0 0 10px rgba(0, 243, 255, 0.8))' 
        }}>
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#ffffff" />
        </svg>

        {/* The glowing exhaust trail following the plane */}
        <div style={{
          position: 'absolute',
          top: '24px',
          right: '48px', // Trail shoots out the massive back
          width: '400px',
          height: '2px',
          background: 'linear-gradient(to left, rgba(0,243,255,1), rgba(255,0,179,0.5), transparent)',
          boxShadow: '0 0 10px rgba(0,243,255,0.4)',
          borderRadius: '2px'
        }} />
      </div>

      {/* Main Logo Container */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        textAlign: 'center',
        opacity: phase >= 1 ? 1 : 0,
        // Delay the fade-in slightly so the plane reveals it as it passes!
        transition: 'opacity 1.5s ease 1s, transform 1.5s ease 1s',
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(15px)'
      }}>
        {/* The Beautiful Re-added Colorful Logo */}
        <div style={{
          fontSize: 'clamp(42px, 8vw, 76px)',
          fontWeight: 900,
          letterSpacing: '12px',
          color: '#ffffff',
          textShadow: '0 0 40px rgba(0,243,255,0.2), 0 0 80px rgba(0,243,255,0.1)',
          lineHeight: 1,
        }}>
          GKAS<span style={{
            background: 'linear-gradient(135deg, #00f3ff, #0090ff, #ff00b3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>FLOWS</span>
        </div>

        {/* Smooth Clean Subtitle */}
        <div style={{
          marginTop: '20px',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '10px',
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          position: 'relative',
        }}>
          Global Tactical Radar
        </div>
      </div>

      <style>{`
        @keyframes flyAcross {
          0% { left: -300px; }
          100% { left: calc(100vw + 300px); }
        }
      `}</style>
    </div>
  );
}
