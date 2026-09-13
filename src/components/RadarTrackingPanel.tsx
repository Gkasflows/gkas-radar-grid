import React, { useEffect, useState } from 'react';

export default function RadarTrackingPanel() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setRotation(prev => (prev + 1) % 360);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="dashboard-widget" style={{ flex: 1, minHeight: '300px' }}>
      <div className="widget-header">
        <span style={{ color: '#00f3ff' }}>⌖</span> RADAR TRACKING SYSTEMS
      </div>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '1/1', 
          maxWidth: '240px', 
          borderRadius: '50%',
          border: '1px solid rgba(0, 243, 255, 0.4)',
          background: 'radial-gradient(circle, rgba(0,243,255,0.05) 0%, transparent 70%)'
        }}>
          {/* Concentric rings */}
          <div style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%', borderRadius: '50%', border: '1px solid rgba(0, 243, 255, 0.2)' }} />
          <div style={{ position: 'absolute', top: '12.5%', left: '12.5%', width: '75%', height: '75%', borderRadius: '50%', border: '1px dashed rgba(0, 243, 255, 0.15)' }} />
          
          {/* Crosshairs */}
          <div style={{ position: 'absolute', top: '0', left: '50%', width: '1px', height: '100%', background: 'rgba(0, 243, 255, 0.2)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '1px', background: 'rgba(0, 243, 255, 0.2)' }} />
          
          {/* Radar Sweep */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            width: '50%',
            height: '50%',
            background: 'conic-gradient(from 180deg at 0 100%, transparent 0deg, rgba(0, 243, 255, 0.4) 90deg)',
            transformOrigin: '0 100%',
            transform: `rotate(${rotation}deg)`
          }} />
          
          {/* Mock Blips */}
          <div style={{ position: 'absolute', top: '30%', left: '60%', width: '4px', height: '4px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 8px #fff' }} />
          <div style={{ position: 'absolute', top: '70%', left: '40%', width: '4px', height: '4px', background: '#00f3ff', borderRadius: '50%', boxShadow: '0 0 8px #00f3ff' }} />
        </div>
      </div>
    </div>
  );
}
