import React, { useState, useEffect } from 'react';
import { Airport } from './FlightradarRightPanel';
import { LiveFlight } from '../services/flightService';

interface AirportSidePanelProps {
  airport: Airport | null;
  onClose: () => void;
  liveFlights?: LiveFlight[];
  onFlightClick?: (flight: LiveFlight) => void;
}

const AIRPORT_PHOTOS = [
  '1534067980894-39f50ec46be2', '1520105330366-07faca16bc92', '1515904859663-8a16ac5602d1',
  '1511210850239-0bd9f1fa021b', '1501625902095-2c8fe5f6a9e1', '1554559530-18e38dccb119',
  '1540194419-75a7c299edde', '1479869502010-84c424076bc1', '1512401725515-ccddce7cce86',
  '1436491865332-7a61a109cc05'
];

const getAirportImage = (iata: string) => {
  let hash = 0;
  for (let i = 0; i < iata.length; i++) hash = (hash << 5) - hash + iata.charCodeAt(i);
  const index = Math.abs(hash) % AIRPORT_PHOTOS.length;
  return `https://images.unsplash.com/photo-${AIRPORT_PHOTOS[index]}?q=80&w=1000&auto=format&fit=crop`;
};

export default function AirportSidePanel({ airport, onClose, liveFlights = [], onFlightClick }: AirportSidePanelProps) {
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures'>('arrivals');
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cachedAirport, setCachedAirport] = useState<Airport | null>(null);

  const [touchStartY, setTouchStartY] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (airport) {
      setCachedAirport(airport);
      setIsAnimating(true);
      setIsExpanded(false);
      if (isMobile) {
        setTimeout(() => setIsOpen(true), 4000); 
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => setIsOpen(true)));
      }
    } else {
      setIsOpen(false);
      setIsExpanded(false);
      const timer = setTimeout(() => setIsAnimating(false), 400); // Transition match
      return () => clearTimeout(timer);
    }
  }, [airport?.iata, isMobile]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartY(e.changedTouches[0].clientY);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;
    if (diff < -30) {
      setIsExpanded(true);
    } else if (diff > 30) {
      if (isExpanded) setIsExpanded(false);
      else {
         setIsOpen(false);
         setTimeout(onClose, 400); 
      }
    }
  };

  const displayAirport = airport || cachedAirport;

  // Authentically extract REAL flights from the global live data arrays
  const flightsData = React.useMemo(() => {
    if (!displayAirport) return [];

    let activeSet = [];
    if (activeTab === 'arrivals') {
      activeSet = liveFlights.filter(f => f.dest_iata === displayAirport.iata);
    } else {
      activeSet = liveFlights.filter(f => f.origin_iata === displayAirport.iata);
    }

    return activeSet.map(f => {
       // Estimate status visually based on altitude/velocity telemetry
       let statusStr = 'In Air';
       let color = '#38bdf8'; // Cyan
       
       if (f.on_ground || (f.baro_altitude && f.baro_altitude < 500 && f.velocity && f.velocity < 50)) {
          statusStr = activeTab === 'arrivals' ? 'Landed' : 'Taxiing'; 
          color = '#10B981'; // Green
       } else if (f.velocity && f.velocity < 10) {
          statusStr = 'Delayed'; 
          color = '#EF4444'; // Red
       } else if (f.vertical_rate && f.vertical_rate > 10 && activeTab === 'departures') {
          statusStr = 'Climbing';
          color = '#F59E0B'; // Yellow
       } else if (f.vertical_rate && f.vertical_rate < -10 && activeTab === 'arrivals') {
          statusStr = 'Descending';
          color = '#8b5cf6'; // Purple
       }

       return {
         time: 'LIVE', 
         flight: f.callsign?.substring(0, 8) || f.icao24.toUpperCase().substring(0, 6),
         airline: f.airline || 'Private/Unknown',
         status: statusStr,
         color: color,
         rawFlight: f // Pass the actual flight object for the Click interaction!
       };
    });
  }, [displayAirport?.iata, activeTab, liveFlights]);

  if (!displayAirport || (!airport && !isAnimating)) return null;

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
      transform: `translateX(${isOpen ? '0' : '-356px'})`,
      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 1000, width: '340px', height: 'calc(100vh - 92px)', backgroundColor: 'rgba(10, 15, 30, 0.45)', backdropFilter: 'blur(24px) saturate(150%)',
      border: '1px solid rgba(0, 243, 255, 0.25)', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', overflow: 'visible', fontFamily: '"Inter", -apple-system, sans-serif', color: '#fff'
    }}>
      {/* SLIDE TOGGLE BUTTON Desktop */}
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

      {/* MOBILE GRIP */}
      {isMobile && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', position: 'absolute', top: 0, left: 0, zIndex: 1010 }}>
          <div style={{ flex: 1 }}></div>
          <div style={{ width: '64px', height: '6px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '9999px', margin: '0 auto', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}></div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setIsOpen(false); setTimeout(onClose, 400); }} style={{ color: '#00f3ff', fontSize: '12px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>✕ Hide</button>
          </div>
        </div>
      )}

      {/* 1. PHOTO AND X BUTTON */}
      <div style={{ 
        height: '180px', 
        width: '100%', 
        backgroundColor: '#2A2B30',
        backgroundImage: `url("${getAirportImage(displayAirport.iata)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '32px', height: '32px',
          borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(4px)'
        }}>
          ✕
        </button>
        <div style={{
          position: 'absolute', bottom: '0', left: '0', right: '0',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
          padding: '24px 16px 12px 16px',
          color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#8E9297' }}>GLOBAL AIRPORT</div>
            <div style={{ fontSize: '20px', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{displayAirport.name}</div>
          </div>
        </div>
      </div>

      {/* 2. AIRPORT INFO & RADAR */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(47, 49, 54, 0.6)', backgroundColor: '#1A1D24' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(42, 43, 48, 0.6)', borderRadius: '8px', border: '1px solid rgba(54, 57, 63, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#00f3ff' }}>
            {displayAirport.iata}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{displayAirport.city}</div>
            <div style={{ fontSize: '12px', color: '#8E9297', fontWeight: 500 }}>{displayAirport.country}</div>
          </div>
        </div>

        {/* HIGH-TECH MINIATURE RADAR SWEEP */}
        <div style={{ 
          position: 'relative', width: '100%', height: '140px', backgroundColor: 'rgba(0,0,0,0.4)', 
          borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.1)', overflow: 'hidden', 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
           {/* Static bounds */}
           <div style={{ position: 'absolute', width: '280px', height: '280px', borderRadius: '50%', border: '1px solid rgba(0, 243, 255, 0.05)' }} />
           <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '1px dashed rgba(0, 243, 255, 0.1)' }} />
           <div style={{ position: 'absolute', width: '90px', height: '90px', borderRadius: '50%', border: '1px solid rgba(0, 243, 255, 0.2)' }} />
           
           {/* Crosshairs */}
           <div style={{ position: 'absolute', width: '1px', height: '100%', backgroundColor: 'rgba(0,243,255,0.1)' }} />
           <div style={{ position: 'absolute', height: '1px', width: '100%', backgroundColor: 'rgba(0,243,255,0.1)' }} />

           {/* Center Airport blip */}
           <div style={{ position: 'absolute', width: '6px', height: '6px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #fff, 0 0 20px #00f3ff' }} />

           {/* Sweeping Cone */}
           <div style={{
             position: 'absolute',
             width: '400px',
             height: '400px',
             borderRadius: '50%',
             background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 243, 255, 0.15) 95%, rgba(0, 243, 255, 0.8) 100%)',
             animation: 'panelRadarSpin 2.5s linear infinite',
           }} />

           <div style={{ position: 'absolute', top: '8px', left: '10px', fontSize: '9px', color: '#00f3ff', fontWeight: 800, letterSpacing: '1px' }}>SECTOR SCAN: ACTIVE</div>
           <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>ATC LOCK</div>
           
           <style>{`
             @keyframes panelRadarSpin {
               0% { transform: rotate(0deg); }
               100% { transform: rotate(360deg); }
             }
           `}</style>
        </div>
      </div>

      {/* 3. TABS (Departures / Arrivals) */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(47, 49, 54, 0.6)', backgroundColor: 'rgba(42, 43, 48, 0.4)' }}>
        <button 
          onClick={() => setActiveTab('arrivals')}
          style={{
            flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
            borderBottom: activeTab === 'arrivals' ? '2px solid #00f3ff' : '2px solid transparent',
            color: activeTab === 'arrivals' ? '#fff' : '#8E9297',
            fontWeight: 600, cursor: 'pointer', fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          🛬 Arrivals
        </button>
        <button 
          onClick={() => setActiveTab('departures')}
          style={{
            flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
            borderBottom: activeTab === 'departures' ? '2px solid #00f3ff' : '2px solid transparent',
            color: activeTab === 'departures' ? '#fff' : '#8E9297',
            fontWeight: 600, cursor: 'pointer', fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          🛫 Departures
        </button>
      </div>

      {/* 4. LIVE FLIGHT BOARD */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0', backgroundColor: 'transparent' }}>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: '#8E9297', fontWeight: 600 }}>TIME</span>
            <span style={{ fontSize: '12px', color: '#8E9297', fontWeight: 600 }}>FLIGHT</span>
            <span style={{ fontSize: '12px', color: '#8E9297', fontWeight: 600 }}>STATUS</span>
          </div>

          {/* FLIGHT LIST ANIMATED ROWS */}
          {flightsData.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#8E9297', fontSize: '13px' }}>
              No active tracker targets detected on this sector.
            </div>
          ) : flightsData.slice(0, 50).map((f, i) => (
            <div 
              key={i} 
              onClick={() => onFlightClick && onFlightClick(f.rawFlight)}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '10px', marginBottom: '8px', 
                backgroundColor: 'rgba(42, 43, 48, 0.4)', borderRadius: '6px',
                border: '1px solid rgba(54, 57, 63, 0.4)',
                cursor: 'pointer',
                transition: 'border 0.2s, background-color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.border = '1px solid #00f3ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(42, 43, 48, 0.4)'; e.currentTarget.style.border = '1px solid rgba(54, 57, 63, 0.4)'; }}
            >
              {/* TIME */}
              <div style={{ fontSize: '12px', fontWeight: 600, width: '40px' }}>
                {f.time}
              </div>
              
              {/* FLIGHT/AIRLINE */}
              <div style={{ flex: 1, marginLeft: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{f.flight}</div>
                <div style={{ fontSize: '10px', color: '#8E9297' }}>{f.airline}</div>
              </div>

              {/* STATUS DOT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: f.color, boxShadow: `0 0 6px ${f.color}` }}></div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: f.color }}>{f.status}</div>
              </div>
            </div>
          ))}
          
        </div>

        {/* METRICS (Coordinates etc) */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(47, 49, 54, 0.6)', backgroundColor: 'transparent' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Airport Metrics</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#8E9297', textTransform: 'uppercase', marginBottom: '2px' }}>Latitude</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{displayAirport.coords[1].toFixed(5)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#8E9297', textTransform: 'uppercase', marginBottom: '2px' }}>Longitude</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{displayAirport.coords[0].toFixed(5)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
