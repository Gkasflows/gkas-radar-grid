import React from 'react';

export default function AtmosphericDataPanel() {
  return (
    <div className="dashboard-widget" style={{ flex: 1, minHeight: '300px' }}>
      <div className="widget-header">
        <span style={{ color: '#00f3ff' }}>📊</span> ATMOSPHERIC DATA
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        
        {/* Ring Charts Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
          {[
            { label: 'OXYGEN', val: 89 },
            { label: 'NITROGEN', val: 66 },
            { label: 'ARGON', val: 33 },
            { label: 'CO2', val: 60 }
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                position: 'relative', width: '40px', height: '40px', borderRadius: '50%', 
                border: '3px solid rgba(0, 243, 255, 0.1)',
                borderTopColor: '#00f3ff', borderRightColor: stat.val > 50 ? '#00f3ff' : 'rgba(0,243,255,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                transform: 'rotate(-45deg)'
              }}>
                <span style={{ transform: 'rotate(45deg)', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}>{stat.val}%</span>
              </div>
              <span style={{ fontSize: '8px', color: '#8E9297', letterSpacing: '1px' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Line Chart Mockup 1 */}
        <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
          <div style={{ fontSize: '9px', color: '#00f3ff', marginBottom: '4px' }}>UPPER ATMOSPHERE IONIZATION</div>
          <svg width="100%" height="40" preserveAspectRatio="none">
            <polyline fill="rgba(0,243,255,0.1)" stroke="#00f3ff" strokeWidth="1.5" points="0,40 20,20 40,30 60,10 80,25 100,5 120,30 140,20 160,40" vectorEffect="non-scaling-stroke"/>
          </svg>
        </div>

        {/* Line Chart Mockup 2 */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ fontSize: '9px', color: '#ffaa00', marginBottom: '4px' }}>THERMAL RADIATION SHIELD</div>
          <svg width="100%" height="40" preserveAspectRatio="none">
            <polyline fill="rgba(255,170,0,0.1)" stroke="#ffaa00" strokeWidth="1.5" points="0,30 30,10 50,35 70,20 90,15 120,30 150,5 180,20" vectorEffect="non-scaling-stroke"/>
          </svg>
        </div>

      </div>
    </div>
  );
}
