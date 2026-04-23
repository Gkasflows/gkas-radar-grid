import React, { useState, useEffect } from 'react';
import { LiveFlight } from '../services/flightService';

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  coords: [number, number];
  imageUrl: string;
}

interface RightPanelProps {
  flights: LiveFlight[];
  airports: Airport[];
  onFlightClick: (flight: LiveFlight) => void;
  onAirportClick: (airport: Airport) => void;
  selectedFlightId: string | null;
  selectedAirportIata: string | null;
  onToggle?: (isOpen: boolean) => void;
  isPlaybackMode?: boolean;
}
// NATIVE VIRTUAL DOM SCROLL ENGINE (Zero External Dependencies)
// Completely bypasses Next.js Turbopack transpilation failures while effortlessly handling 10,000+ items at 60 FPS.
const VirtualList = ({ items, itemHeight, renderItem }: { items: any[], itemHeight: number, renderItem: (item: any, index: number) => React.ReactNode }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 150 : 800; 

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
  const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + 3);
  
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <div key={i} style={{ position: 'absolute', top: `${i * itemHeight}px`, width: '100%', height: `${itemHeight}px`, padding: '4px 8px', boxSizing: 'border-box' }}>
        {renderItem(items[i], i)}
      </div>
    );
  }

  return (
    <div 
      style={{ overflowY: 'auto', height: '100%', width: '100%', overflowX: 'hidden' }}
      onScroll={e => setScrollTop((e.target as any).scrollTop)}
    >
      <div style={{ height: `${items.length * itemHeight}px`, position: 'relative', width: '100%' }}>
        {visibleItems}
      </div>
    </div>
  );
};

export default function FlightradarRightPanel({ flights, airports, onFlightClick, onAirportClick, selectedFlightId, selectedAirportIata, onToggle, isPlaybackMode }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'flights' | 'airports'>('flights');
  const [isMobile, setIsMobile] = useState(false);


  const [isOpen, setIsOpen] = useState(true);
  const handleToggle = (state: boolean) => {
     setIsOpen(state);
     if (onToggle) onToggle(state);
  };

  useEffect(() => {
    if (window.innerWidth < 768) handleToggle(false);
    else if (onToggle) onToggle(true);
  }, []);
  // SWIPE DOWN STATE
  const [touchStartY, setTouchStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchEndY - touchStartY > 20) { // Fluid 20px downward swipe
      handleToggle(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .right-panel-desktop { display: none !important; }
          .right-panel-mobile { display: flex !important; }
          
          .right-panel-container {
            position: fixed !important;
            z-index: 900 !important;
            transition: all 0.4s cubic-bezier(0.16,1,0.3,1) !important;
            bottom: ${isOpen ? '0px' : '-100%'} !important;
            left: 0px !important;
            width: 100% !important;
            height: 40vh !important;
            background-color: rgba(10, 15, 30, 0.45) !important;
            backdrop-filter: blur(24px) saturate(150%) !important;
            border-top: 1px solid rgba(0, 243, 255, 0.25) !important;
            border-radius: 24px 24px 0 0 !important;
            /* reset desktop transform */
            top: auto !important;
            right: auto !important;
            transform: none !important;
          }
        }
        @media (min-width: 769px) {
          .right-panel-mobile { display: none !important; }
          
          .right-panel-container {
            position: absolute !important;
            top: 76px !important;
            right: 16px !important;
            transform: translateX(${isOpen ? '0' : '316px'}) !important;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
            width: 300px !important;
            height: calc(100vh - 92px) !important;
            background-color: rgba(10, 15, 30, 0.45) !important;
            backdrop-filter: blur(24px) saturate(150%) !important;
            border: 1px solid rgba(0, 243, 255, 0.25) !important;
            border-radius: 16px !important;
            box-shadow: 0 4px 30px rgba(0,0,0,0.4) !important;
          }
        }
      `}</style>

      {/* MOBILE FLOATING BUTTON */}
      <div className="right-panel-mobile">
        {!isOpen && (
          <button 
            onClick={() => handleToggle(true)}
            style={{
              position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#00f3ff', padding: '12px 24px', borderRadius: '9999px',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              zIndex: 950, fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(0, 243, 255, 0.3)', cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              opacity: isPlaybackMode ? 0 : 1,
              pointerEvents: isPlaybackMode ? 'none' : 'auto',
              transition: 'opacity 0.4s ease, transform 0.4s ease'
            }}
          >
            <span style={{ fontSize: '16px' }}>🗺️</span> Open Tracker List
          </button>
        )}
      </div>

      <div className="right-panel-container" style={{
          color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'visible',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
      }}>
        {/* SLIDE TOGGLE BUTTON Desktop */}
        <div className="right-panel-desktop"
            onClick={() => handleToggle(!isOpen)}
            style={{
              position: 'absolute', left: '-36px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '140px',
              backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0, 243, 255, 0.4)',
              borderRight: 'none', borderRadius: '16px 0 0 16px', color: '#00f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              zIndex: 1000, boxShadow: '-4px 0 15px rgba(0,243,255,0.2)', transition: 'background 0.2s', fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 243, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.95)'}
        >
            {isOpen ? '▶' : '◀'}
        </div>

        {/* SWIPE HANDLE (Mobile Only) */}
        <div className="right-panel-mobile"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', position: 'relative', background: 'transparent' }}
        >
            <div style={{ flex: 1 }}></div>
            <div style={{ width: '64px', height: '6px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '9999px', margin: '0 auto' }}></div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => handleToggle(false)} style={{ color: '#00f3ff', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕ Hide</button>
            </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(47, 49, 54, 0.6)', backgroundColor: 'rgba(42, 43, 48, 0.4)' }}>
          <button 
            onClick={() => setActiveTab('flights')}
            style={{
              flex: 1, padding: '12px', border: 'none', backgroundColor: 'transparent',
              borderBottom: activeTab === 'flights' ? '2px solid #00f3ff' : '2px solid transparent',
              color: activeTab === 'flights' ? '#fff' : '#8E9297',
              fontWeight: 600, cursor: 'pointer', fontSize: '12px'
            }}
          >
            Active Flights ({flights.length})
          </button>
          <button 
            onClick={() => setActiveTab('airports')}
            style={{
              flex: 1, padding: '10px', border: 'none', backgroundColor: 'transparent',
              borderBottom: activeTab === 'airports' ? '2px solid #00f3ff' : '2px solid transparent',
              color: activeTab === 'airports' ? '#fff' : '#8E9297',
              fontWeight: 600, cursor: 'pointer', fontSize: '12px'
            }}
          >
            Global Airports
          </button>
        </div>

        {/* CONTENT LIST */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'flights' && (
            <VirtualList 
              items={flights} 
              itemHeight={66} 
              renderItem={(f: LiveFlight) => (
                <div 
                  onClick={() => {
                    onFlightClick(f);
                    if (window.innerWidth < 768) handleToggle(false);
                  }}
                  style={{
                    height: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: selectedFlightId === f.icao24 ? 'rgba(0, 243, 255, 0.15)' : 'rgba(42, 43, 48, 0.4)',
                    border: selectedFlightId === f.icao24 ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(54, 57, 63, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: 'rgba(54, 57, 63, 0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✈️</div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.callsign || 'N/A'}</div>
                    <div style={{ fontSize: '10px', color: '#8E9297', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.airline || 'Commercial'} | Alt: {Math.round((f.baro_altitude || 0) * 3.28)} ft</div>
                  </div>
                </div>
              )}
            />
          )}

          {activeTab === 'airports' && (
            <VirtualList 
              items={airports} 
              itemHeight={66} 
              renderItem={(a: Airport) => (
                <div 
                  onClick={() => {
                    onAirportClick(a);
                    if (window.innerWidth < 768) handleToggle(false);
                  }}
                  style={{
                    height: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: selectedAirportIata === a.iata ? 'rgba(0, 243, 255, 0.15)' : 'rgba(42, 43, 48, 0.4)',
                    border: selectedAirportIata === a.iata ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(54, 57, 63, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: 'rgba(54, 57, 63, 0.6)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#00f3ff' }}>
                    {a.iata}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ fontSize: '10px', color: '#8E9297', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}, {a.country}</div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </>
  );
}
