import React, { useState, useEffect, useRef } from 'react';

interface FlightradarTopNavProps {
  searchQuery: string;
  onSearch: (term: string) => void;
  flightCount: number;
  isHeatmapActive: boolean;
  toggleHeatmap: () => void;
  onReset: () => void;
  globalAirports?: any[];
  globalFlights?: any[];
  onFlightSelect?: (flight: any) => void;
  onAirportSelect?: (airport: any) => void;
  onWeatherChase?: (type: 'rain' | 'snow' | 'thunder') => void;
  onOpenCountries?: () => void;
}

export default function FlightradarTopNav({
  searchQuery, onSearch, flightCount, isHeatmapActive, toggleHeatmap, onReset,
  globalAirports, globalFlights, onFlightSelect, onAirportSelect, onWeatherChase, onOpenCountries
}: FlightradarTopNavProps) {
  const [currentTime, setCurrentTime] = useState('');
  const [isUtc, setIsUtc] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (isUtc) {
        setCurrentTime(`${now.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(now.getUTCMilliseconds()).padStart(3, '0')}`);
      } else {
        setCurrentTime(`${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(now.getMilliseconds()).padStart(3, '0')}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 47);
    return () => clearInterval(interval);
  }, [isUtc]);

  return (
    <div className="glass-panel" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '70px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', zIndex: 1000,
      borderBottom: '2px solid var(--color-border-glass)',
      borderTop: 'none', borderLeft: 'none', borderRight: 'none',
      borderRadius: '0 0 16px 16px'
    }}>
      
      {/* LEFT: Master Branding */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div onClick={onReset} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '2px solid var(--color-neon-cyan)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', boxShadow: '0 0 15px rgba(0,243,255,0.4)' }}>
            <div className="animate-pulse-glow" style={{ width: '20px', height: '20px', backgroundColor: 'var(--color-neon-cyan)', borderRadius: '50%' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 900, letterSpacing: '2px', color: '#fff' }}>
              GKAS <span className="text-cyan">ORBITAL</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '-4px' }}>
              Global Tracking Command Center
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: High Level Metrics */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '2px' }}>ACTIVE ASSETS</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--color-neon-cyan)', fontWeight: 700 }}>
            {flightCount.toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '2px' }}>NETWORK STATUS</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: '#00ff88', fontWeight: 700 }}>
            SECURE
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '2px' }}>THREAT LEVEL</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--color-neon-amber)', fontWeight: 700 }}>
            NOMINAL
          </div>
        </div>
      </div>

      {/* RIGHT: Search & Chronometer */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' }}>
        
        {/* Search Terminal */}
        <div style={{ position: 'relative', width: '300px' }}>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ENTER QUERY PARAMS..."
            style={{
              width: '100%', height: '36px',
              backgroundColor: 'rgba(0, 243, 255, 0.05)',
              border: '1px solid var(--color-neon-cyan)',
              borderRadius: '4px',
              padding: '0 16px',
              color: 'var(--color-neon-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px', outline: 'none',
              boxShadow: 'inset 0 0 10px rgba(0,243,255,0.1)'
            }}
          />
        </div>

        {/* Master Chronometer */}
        <div 
          onClick={() => setIsUtc(!isUtc)}
          style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', 
            cursor: 'pointer', fontFamily: 'var(--font-mono)' 
          }}
        >
          <div style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>
            {currentTime}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-neon-cyan)', letterSpacing: '2px' }}>
            {isUtc ? 'SYSTEM UTC' : 'LOCAL TIME'}
          </div>
        </div>

      </div>
    </div>
  );
}
