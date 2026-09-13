import React from 'react';

export default function SatelliteFeedPanel() {
  return (
    <div className="dashboard-widget" style={{ flex: 1, minHeight: '300px' }}>
      <div className="widget-header">
        <span style={{ color: '#00f3ff' }}>🛰️</span> SATELLITE FEED / GEO
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', position: 'relative' }}>
        
        <div style={{ 
          flex: 1, 
          background: 'url("https://upload.wikimedia.org/wikipedia/commons/e/ec/Physical_World_Map_blank.svg") no-repeat center center',
          backgroundSize: 'contain',
          opacity: 0.4,
          position: 'relative',
          filter: 'invert(1) sepia(1) hue-rotate(180deg) brightness(2) contrast(2)'
        }}>
          {/* Simulated satellite connection lines */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <path d="M 50,50 Q 150,20 250,80 T 350,150" fill="transparent" stroke="rgba(255, 170, 0, 0.5)" strokeWidth="1" strokeDasharray="4 2" />
            <path d="M 100,100 Q 200,150 250,80" fill="transparent" stroke="rgba(0, 243, 255, 0.5)" strokeWidth="1" strokeDasharray="4 2" />
            
            <circle cx="50" cy="50" r="3" fill="#ffaa00" />
            <circle cx="100" cy="100" r="3" fill="#00f3ff" />
            <circle cx="250" cy="80" r="4" fill="#fff" className="animate-pulse-glow" />
            <circle cx="350" cy="150" r="3" fill="#ffaa00" />
          </svg>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
          <div style={{ background: 'rgba(0,243,255,0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(0,243,255,0.2)' }}>
            <div style={{ color: '#8ba3b8' }}>LEO / MEO / GEO</div>
            <div style={{ color: '#00f3ff', fontWeight: 'bold' }}>NOMINAL LINK</div>
          </div>
          <div style={{ background: 'rgba(255,170,0,0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,170,0,0.2)' }}>
            <div style={{ color: '#8ba3b8' }}>SIGNAL STR</div>
            <div style={{ color: '#ffaa00', fontWeight: 'bold' }}>94.2% [SECURE]</div>
          </div>
        </div>

      </div>
    </div>
  );
}
