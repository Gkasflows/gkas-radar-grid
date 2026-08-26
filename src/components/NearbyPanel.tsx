import React, { useState } from 'react';
import { LiveFlight } from '../services/flightService';
import { Airport } from '../components/FlightradarRightPanel';

interface NearbyPanelProps {
  countryName: string;
  countryCode: string;
  flights: LiveFlight[];
  airports: Airport[];
  onClose: () => void;
  onFlightClick: (flight: LiveFlight) => void;
  onAirportClick: (airport: Airport) => void;
}

export default function NearbyPanel({ countryName, countryCode, flights, airports, onClose, onFlightClick, onAirportClick }: NearbyPanelProps) {
  const [activeTab, setActiveTab] = useState<'flights' | 'airports'>('flights');

  return (
    <div style={{
      position: 'absolute', top: '76px', left: '16px',
      zIndex: 1000, width: '320px', height: 'calc(100vh - 92px)', 
      backgroundColor: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', color: '#fff',
      fontFamily: '"Inter", -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'transparent', border: 'none', color: '#8E9297',
          fontSize: '16px', cursor: 'pointer'
        }}>✕</button>
        <div style={{ fontSize: '10px', color: '#8E9297', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Regional Scanner</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#00f3ff', marginTop: '4px' }}>{countryName}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button 
          onClick={() => setActiveTab('flights')}
          style={{ 
            flex: 1, padding: '12px', background: 'transparent', border: 'none', 
            color: activeTab === 'flights' ? '#00f3ff' : '#8E9297', 
            fontWeight: activeTab === 'flights' ? 700 : 500,
            borderBottom: activeTab === 'flights' ? '2px solid #00f3ff' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Live Flights ({flights.length})
        </button>
        <button 
          onClick={() => setActiveTab('airports')}
          style={{ 
            flex: 1, padding: '12px', background: 'transparent', border: 'none', 
            color: activeTab === 'airports' ? '#00f3ff' : '#8E9297', 
            fontWeight: activeTab === 'airports' ? 700 : 500,
            borderBottom: activeTab === 'airports' ? '2px solid #00f3ff' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          Airports ({airports.length})
        </button>
      </div>

      {/* List Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {activeTab === 'flights' && flights.map((f, i) => (
          <div key={i} onClick={() => onFlightClick(f)} style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>✈️ {f.callsign || f.icao24}</div>
              <div style={{ fontSize: '11px', color: '#8E9297', marginTop: '2px' }}>{f.airline || 'Unknown Airline'}</div>
            </div>
            <div style={{ fontSize: '10px', color: '#00f3ff', fontWeight: 600 }}>{f.baro_altitude ? `${Math.round(f.baro_altitude * 3.28)} ft` : ''}</div>
          </div>
        ))}
        {activeTab === 'flights' && flights.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8E9297', fontSize: '12px' }}>No live flights detected over this region.</div>
        )}

        {activeTab === 'airports' && airports.map((a, i) => (
          <div key={i} onClick={() => onAirportClick(a)} style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>🏛️ {a.name || a.city}</div>
              <div style={{ fontSize: '11px', color: '#8E9297', marginTop: '2px' }}>{a.city}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#00f3ff', fontWeight: 700 }}>{a.iata}</div>
          </div>
        ))}
        {activeTab === 'airports' && airports.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8E9297', fontSize: '12px' }}>No airports found in this region.</div>
        )}
      </div>
    </div>
  );
}
