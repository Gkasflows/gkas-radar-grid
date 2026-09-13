import React from 'react';

export default function CargoVolumePanel() {
  const cargoData = [
    { id: 'CX-77', status: 'NOMINAL', volume: 85 },
    { id: 'AX-90', status: 'LOADING', volume: 42 },
    { id: 'BR-12', status: 'DELAYED', volume: 15 },
    { id: 'ZQ-88', status: 'IN TRANSIT', volume: 94 },
    { id: 'MM-44', status: 'NOMINAL', volume: 76 }
  ];

  return (
    <div className="dashboard-widget" style={{ flex: 1, minHeight: '300px' }}>
      <div className="widget-header">
        <span style={{ color: '#00f3ff' }}>📦</span> CARGO VOLUME & LOGISTICS
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 3fr', fontSize: '10px', color: '#8ba3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
          <span>MANIFEST</span>
          <span>STATUS</span>
          <span>VOLUME CAPACITY</span>
        </div>

        {/* Data Rows */}
        {cargoData.map((item) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 3fr', alignItems: 'center', fontSize: '11px', color: '#fff' }}>
            <span style={{ color: '#00f3ff', fontFamily: 'monospace' }}>{item.id}</span>
            <span style={{ 
              color: item.status === 'DELAYED' ? '#ff0055' : item.status === 'LOADING' ? '#ffaa00' : '#00ff88',
              fontSize: '9px', fontWeight: 'bold'
            }}>
              {item.status}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${item.volume}%`, height: '100%', background: item.volume > 80 ? '#00f3ff' : item.volume < 30 ? '#ff0055' : '#ffaa00' }} />
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', width: '24px', textAlign: 'right' }}>{item.volume}%</span>
            </div>
          </div>
        ))}

        {/* Secondary Bar Chart */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '9px', color: '#8ba3b8', marginBottom: '8px' }}>GLOBAL DISTRIBUTION NETWORK</div>
          <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'flex-end' }}>
            {[40, 70, 30, 90, 50, 80, 20, 60, 100, 45, 75, 35].map((val, i) => (
              <div key={i} style={{ flex: 1, height: `${val}%`, background: 'rgba(0, 243, 255, 0.6)', borderTop: '1px solid #00f3ff' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
