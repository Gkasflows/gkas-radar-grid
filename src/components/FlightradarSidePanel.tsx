import React, { useState, useEffect } from 'react';
import { LiveFlight } from '../services/flightService';

interface FlightradarSidePanelProps {
  flight: LiveFlight | null;
  onClose: () => void;
  onPointClick?: (lat: number, lon: number, iata: string) => void;
}

// Photo resolution algorithm relocated securely securely back to flightService.ts

export default function FlightradarSidePanel({ flight, onClose, onPointClick }: FlightradarSidePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cachedFlight, setCachedFlight] = useState<LiveFlight | null>(null);

  // Swipe drag states map
  const [touchStartY, setTouchStartY] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (flight) {
      setCachedFlight(flight);
      setIsAnimating(true);
      setIsExpanded(false); // Reset to partial view natively first
      // Wait for globe tracking pan to finish before showing details safely explicitly smartly 
      if (isMobile) {
        setTimeout(() => setIsOpen(true), 4000); 
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => setIsOpen(true)));
      }
    } else {
      setIsOpen(false);
      setIsExpanded(false);
      const timer = setTimeout(() => setIsAnimating(false), 300); // 0.3s transition match
      return () => clearTimeout(timer);
    }
  }, [flight?.icao24, isMobile]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartY(e.changedTouches[0].clientY);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;
    if (diff < -30) {
      // Swiped UP gracefully
      setIsExpanded(true);
    } else if (diff > 30) {
      // Swiped DOWN gracefully
      if (isExpanded) setIsExpanded(false);
      else {
         setIsOpen(false);
         // Important: Dispatch closure perfectly reliably without visual crash
         setTimeout(onClose, 300); 
      }
    }
  };

  const displayFlight = flight || cachedFlight;

  // Fully unmount ONLY when no flight exists and the animation has completely finished
  if (!displayFlight || (!flight && !isAnimating)) return null;

  return (
    <div 
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      style={isMobile ? {
      position: 'fixed', zIndex: 1000, transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
      bottom: isOpen ? '0px' : '-100%', left: '0px', width: '100%', 
      height: isExpanded ? '100vh' : '40vh',
      backgroundColor: 'rgba(10, 15, 30, 0.45)', backdropFilter: 'blur(24px) saturate(150%)', borderTop: '1px solid rgba(0, 243, 255, 0.25)',
      borderRadius: isExpanded ? '0' : '24px 24px 0 0', display: 'flex', flexDirection: 'column', color: '#fff',
      overflow: 'hidden', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)', fontFamily: '"Inter", -apple-system, sans-serif'
    } : {
      position: 'absolute', top: '76px', left: '16px',
      transform: `translateX(${isOpen ? '0' : '-336px'})`,
      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 1000, width: '320px', height: 'calc(100vh - 92px)', backgroundColor: 'rgba(10, 15, 30, 0.45)', backdropFilter: 'blur(24px) saturate(150%)',
      border: '1px solid rgba(0, 243, 255, 0.25)', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', overflow: 'visible', fontFamily: '"Inter", -apple-system, sans-serif', color: '#fff'
    }}>
      {/* SLIDE TOGGLE BUTTON - Desktop Only */}
      {!isMobile && (
        <div 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute', right: '-36px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '140px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0, 243, 255, 0.4)',
            borderLeft: 'none', borderRadius: '0 16px 16px 0', color: '#00f3ff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1000,
            boxShadow: '4px 0 15px rgba(0,243,255,0.2)', transition: 'background 0.2s', fontSize: '14px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 243, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.95)'}
        >
          {isOpen ? '◀' : '▶'}
        </div>
      )}

      {/* SWIPE HANDLE - Mobile Only */}
      {isMobile && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', position: 'absolute', top: 0, left: 0, zIndex: 1010 }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ width: '64px', height: '6px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '9999px', margin: '0 auto', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}></div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setIsOpen(false); setTimeout(onClose, 300); }} style={{ color: '#00f3ff', fontSize: '12px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>✕ Hide</button>
          </div>
        </div>
      )}
      {/* 1. PHOTO AND X BUTTON */}
      <div style={{ 
        height: '180px', 
        width: '100%', 
        backgroundColor: '#2A2B30',
        backgroundImage: `url("${displayFlight.imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        {/* Close Button FR24 style */}
        {!isMobile && (
          <button onClick={onClose} style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '32px', height: '32px',
            borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)',
            border: 'none', color: '#fff', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}>
            ✕
          </button>
        )}
        <div style={{
          position: 'absolute', bottom: '12px', left: '16px', right: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600 }}>{displayFlight.model || 'AIRCRAFT'} • {displayFlight.type}</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{displayFlight.icao24.toUpperCase()}</div>
          </div>
          <button style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '4px', padding: '4px 10px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
            3D View
          </button>
        </div>
      </div>

      {/* 2. AIRLINE & FLIGHT INFO */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2F3136' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#8E9297', textTransform: 'uppercase', fontWeight: 600 }}>{displayFlight.airline || 'Unknown Airline'}</div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{displayFlight.callsign || 'N/A'}</div>
          </div>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#fff', borderRadius: '4px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '8px', color: '#000', fontWeight: 'bold' }}>LOGO</span>
          </div>
        </div>

        {/* 2b. Capacity & Model Hardware Data Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#8E9297', textTransform: 'uppercase' }}>Passengers (Est)</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#00f3ff' }}>{displayFlight.passengers || 'N/A'} <span style={{fontSize: '9px', color: '#8E9297', fontWeight: 400}}>/ {displayFlight.capacity || '?'}</span></div>
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#8E9297', textTransform: 'uppercase' }}>Aircraft Model</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayFlight.model || 'Unknown'}</div>
          </div>
        </div>

        {/* 3. ROUTE (FROM -> TO) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(42, 43, 48, 0.5)', borderRadius: '8px', padding: '10px' }}>
          {/* Origin Target */}
          <div 
            onClick={() => onPointClick && displayFlight.origin_coords && onPointClick(displayFlight.origin_coords.lat, displayFlight.origin_coords.lon, displayFlight.origin_iata)}
            style={{ textAlign: 'left', width: '35%', cursor: 'pointer' }}
            title="Click to locate Origin on map"
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>{displayFlight.origin_iata || 'N/A'}</div>
            <div style={{ fontSize: '9px', color: '#8E9297', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{displayFlight.origin || 'Unknown'}</div>
            <div style={{ fontSize: '8px', color: '#4F545C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayFlight.origin_airport || ''}</div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            <div style={{ flex: 1, height: '2px', backgroundColor: 'rgba(79, 84, 92, 0.6)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#2A2B30', padding: '0 4px', fontSize: '10px', color: '#8E9297', borderRadius: '4px' }}>
                ✈
              </div>
            </div>
          </div>

          {/* Destination Target */}
          <div 
            onClick={() => onPointClick && displayFlight.dest_coords && onPointClick(displayFlight.dest_coords.lat, displayFlight.dest_coords.lon, displayFlight.dest_iata)}
            style={{ textAlign: 'right', width: '35%', cursor: 'pointer' }}
            title="Click to locate Destination on map"
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>{displayFlight.dest_iata || 'N/A'}</div>
            <div style={{ fontSize: '9px', color: '#8E9297', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{displayFlight.destination || 'Unknown'}</div>
            <div style={{ fontSize: '8px', color: '#4F545C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayFlight.dest_airport || ''}</div>
          </div>
        </div>
      </div>

      {/* 4. SCROLLABLE TELEMETRY DATA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0', backgroundColor: 'transparent' }}>
        
        {/* Section: Live SVG HUD Details */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#00f3ff', letterSpacing: '1px', marginBottom: '16px', textTransform: 'uppercase' }}>Live Telemetry HUD</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            {/* HUD 1: Altitude Curve */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Calibrated Altitude</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFB020' }}>
                  {displayFlight.baro_altitude ? `${Math.round(displayFlight.baro_altitude * 3.28084).toLocaleString()} ft` : 'N/A'}
                </span>
              </div>
              <svg width="100%" height="32" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {displayFlight.baro_altitude && (
                  <path 
                    d={`M 0 32 Q 50 ${32 - Math.min((displayFlight.baro_altitude * 3.28 / 40000) * 32, 28)} 100 ${32 - Math.min((displayFlight.baro_altitude * 3.28 / 40000) * 32, 28)} L 300 ${32 - Math.min((displayFlight.baro_altitude * 3.28 / 40000) * 32, 28)} L 300 32 Z`} 
                    fill="url(#altGradient)" 
                    opacity="0.8" 
                  />
                )}
                {displayFlight.baro_altitude && (
                  <circle cx="280" cy={32 - Math.min((displayFlight.baro_altitude * 3.28 / 40000) * 32, 28)} r="2.5" fill="#FFB020" filter="drop-shadow(0 0 3px #FFB020)" />
                )}
                <defs>
                  <linearGradient id="altGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FFB020" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FFB020" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* HUD 2: Ground Speed Bar */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Ground Speed</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#00f3ff' }}>
                  {displayFlight.velocity ? `${Math.round(displayFlight.velocity * 1.94384)} kts` : 'N/A'}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min((displayFlight.velocity || 0) * 1.94 / 600 * 100, 100)}%`, 
                  height: '100%', 
                  backgroundColor: '#00f3ff', 
                  boxShadow: '0 0 8px #00f3ff' 
                }}></div>
              </div>
            </div>

            {/* HUD 3: Track Compass */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="32" height="32" viewBox="0 0 40 40" style={{ transform: `rotate(${displayFlight.true_track || 0}deg)` }}>
                  <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                  <path d="M20 4 L24 20 L20 16 L16 20 Z" fill="#00f3ff" filter="drop-shadow(0 0 3px #00f3ff)" />
                  <circle cx="20" cy="20" r="2" fill="#fff" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase' }}>Heading</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{displayFlight.true_track ? `${Math.round(displayFlight.true_track)}°` : 'N/A'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '1px' }}>Vertical Speed</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: (displayFlight.vertical_rate || 0) < 0 ? '#10b981' : '#f43f5e' }}>
                  {displayFlight.vertical_rate ? `${Math.round(displayFlight.vertical_rate * 196.85)} fpm` : 'N/A'}
                </span>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', marginTop: '6px', marginBottom: '1px' }}>Squawk</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', letterSpacing: '1px' }}>
                  {displayFlight.squawk || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic location (Lat/Lon) */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '2px' }}>Latitude</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#00f3ff' }}>{displayFlight.latitude ? displayFlight.latitude.toFixed(5) : 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '2px' }}>Longitude</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#00f3ff' }}>{displayFlight.longitude ? displayFlight.longitude.toFixed(5) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: '#8E9297' }}>
          Flight data provided by OpenSky Network & GKASFLOWS
        </div>
      </div>
    </div>
  );
}
