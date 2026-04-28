import React, { useState, useEffect, useRef } from 'react';
import { LiveFlight } from '../services/flightService';

interface FlightradarSidePanelProps {
  flight: LiveFlight | null;
  onClose: () => void;
  onPointClick?: (lat: number, lon: number, iata: string) => void;
  liveFlights?: LiveFlight[];
}

// Photo resolution algorithm relocated securely securely back to flightService.ts

export default function FlightradarSidePanel({ flight, onClose, onPointClick, liveFlights = [] }: FlightradarSidePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cachedFlight, setCachedFlight] = useState<LiveFlight | null>(null);

  // Swipe drag states map
  const [touchStartY, setTouchStartY] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [realPlanePhoto, setRealPlanePhoto] = useState<string | null>(null);
  const [photographer, setPhotographer] = useState<string | null>(null);

  // Fetch true exact plane image from Planespotters API
  useEffect(() => {
    if (!flight?.icao24) return;
    
    // Reset state before fetching
    setRealPlanePhoto(null);
    setPhotographer(null);

    fetch(`https://api.planespotters.net/pub/photos/hex/${flight.icao24}`)
      .then(res => res.json())
      .then(data => {
         if (data && data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            setRealPlanePhoto(photo.thumbnail_large.src);
            setPhotographer(photo.photographer);
         }
      })
      .catch(err => {
         console.warn("Planespotters API Error:", err);
      });
  }, [flight?.icao24]);

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
        setTimeout(() => setIsOpen(true), 7000); 
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
      }
    }
  };

  const displayFlight = flight || cachedFlight;

  // Tactical Radar Local Traffic Core Rendering Logic
  const localTraffic = React.useMemo(() => {
    if (!displayFlight || !displayFlight.latitude || !displayFlight.longitude) return [];
    const MAX_DEG = 12.0; // ~ 720 Nautical Miles (Deep AWACS Regional Sweep) 
    const RADAR_SIZE = 140; // Pixels
    
    // Sort array by actual ground-distance locally avoiding heavy haversine for 10,000 objects
    const cLat = displayFlight.latitude, cLon = displayFlight.longitude;
    const latCos = Math.cos(cLat * Math.PI / 180);
    
    return liveFlights.filter(f => f.icao24 !== displayFlight.icao24 && f.latitude && f.longitude).map(f => {
       const dLat = f.latitude - cLat;
       const dLon = (f.longitude - cLon) * latCos;
       const dist = Math.sqrt(dLat*dLat + dLon*dLon);
       return { f, dist, dLat, dLon };
    })
    .filter(b => b.dist < MAX_DEG)
    .sort((a,b) => a.dist - b.dist)
    .slice(0, 40) // Show up to 40 max targets on mini radar
    .map(b => {
       const rPix = (b.dist / MAX_DEG) * (RADAR_SIZE / 2);
       const angle = Math.atan2(b.dLon, b.dLat); // Rads from true North
       // Math center is 0,0 since we anchor at top:50% left:50%
       const x = Math.sin(angle) * rPix;
       const y = -Math.cos(angle) * rPix;
       return { x, y, callsign: b.f.callsign || b.f.icao24, heading: b.f.true_track || 0, isClimbing: (b.f.vertical_rate||0) > 0, dist: b.dist };
    });
  }, [displayFlight, liveFlights]);

  // Route Progress Geodesic Engine
  const progressPercentage = React.useMemo(() => {
    if (!displayFlight || !displayFlight.origin_coords || !displayFlight.dest_coords || !displayFlight.latitude) return null;
    const { lat: lat1, lon: lon1 } = displayFlight.origin_coords;
    const { lat: lat2, lon: lon2 } = displayFlight.dest_coords;
    const lat = displayFlight.latitude;
    const lon = displayFlight.longitude;

    // Haversine formula
    const toRad = (v: number) => v * Math.PI / 180;
    const getDist = (aLat: number, aLon: number, bLat: number, bLon: number) => {
       const R = 6371; // km
       const dLat = toRad(bLat - aLat);
       const dLon = toRad(bLon - aLon);
       const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)*Math.sin(dLon/2);
       return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const totalDist = getDist(lat1, lon1, lat2, lon2);
    if (totalDist < 5) return 0;
    const currentDist = getDist(lat1, lon1, lat, lon);
    
    // Check if we are landing soon (distance to target might be better)
    const distToTarget = getDist(lat, lon, lat2, lon2);
    if (distToTarget < 10 && displayFlight.baro_altitude && displayFlight.baro_altitude < 1000) return 99;

    let pct = (currentDist / totalDist) * 100;
    if (pct < 1) pct = 1;
    if (pct > 99) pct = 99;
    return pct;
  }, [displayFlight]);

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
            <button onClick={() => { setIsOpen(false); }} style={{ color: '#00f3ff', fontSize: '12px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>✕ Hide</button>
          </div>
        </div>
      )}
      {/* 1. PHOTO AND X BUTTON */}
      <div style={{ 
        height: '180px', 
        width: '100%', 
        backgroundColor: '#2A2B30',
        backgroundImage: `url("${realPlanePhoto || displayFlight.imageUrl}")`,
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
        
        {/* Photographer Attribution Block */}
        {photographer && (
           <div style={{
             position: 'absolute', top: '16px', left: '16px',
             backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
             borderRadius: '4px', padding: '2px 6px', fontSize: '9px',
             color: 'rgba(255,255,255,0.8)', fontWeight: 500
           }}>
             © {photographer}
           </div>
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

        {/* 2c. ATC TACTICAL RADIO INTERCEPTOR */}
        {(() => {
          // Dynamic geospatial calculation for nearest ATC tower intercept
          const lon = displayFlight.longitude || 0;
          const lat = displayFlight.latitude || 0;
          const country = displayFlight.origin_country || '';
          
          let atcName = "GLOBAL ATC RELAY (JFK)";
          let atcUrl = "https://broadcastify.cdnstream1.com/32468"; // Default fallback (JFK)
          let atcStatus = "LIVE INTERCEPT";
          let isEncrypted = false;

          // NIGERIA AIRSPACE LOGIC
          if (country === 'Nigeria' || country === 'NG' || (lon >= 2.6 && lon <= 14.7 && lat >= 4.2 && lat <= 13.9)) {
            atcName = "DNMM LAGOS TOWER";
            atcUrl = "";
            atcStatus = "ENCRYPTED / SECURE";
            isEncrypted = true;
          }
          else if (lon >= -75 && lon <= -72 && lat >= 40 && lat <= 42) {
            atcName = "NEW YORK JFK TOWER";
            atcUrl = "https://s1-fmt2.liveatc.net/kjfk_twr";
          }
          else if (lon >= -120 && lon <= -116 && lat >= 33 && lat <= 35) {
            atcName = "LOS ANGELES LAX TRACON";
            atcUrl = "https://s1-fmt2.liveatc.net/klax_twr";
          }
          else if (lon >= -89 && lon <= -87 && lat >= 41 && lat <= 43) {
            atcName = "CHICAGO ORD TOWER";
            atcUrl = "https://s1-fmt2.liveatc.net/kord_twr";
          }

          return (
            <div style={{ marginBottom: '12px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 243, 255, 0.2)', padding: '8px', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: isEncrypted ? 'rgba(255,0,0,0.5)' : 'linear-gradient(90deg, transparent, #00f3ff, transparent)', animation: 'scanline 2s linear infinite' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '9px', color: isEncrypted ? '#ef4444' : '#00f3ff', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isEncrypted ? '#ef4444' : '#10b981', display: 'inline-block', animation: isEncrypted ? 'none' : 'pulse 1.5s infinite' }} />
                    {atcStatus}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{atcName}</div>
                </div>
                
                {!isEncrypted && (
                  <audio 
                    controls 
                    controlsList="nodownload noplaybackrate"
                    src={atcUrl}
                    style={{ height: '30px', width: '140px', outline: 'none', pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                  />
                )}
              </div>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes scanline { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                audio::-webkit-media-controls-panel { background-color: rgba(15, 23, 42, 0.9); }
                audio::-webkit-media-controls-current-time-display { display: none; }
                audio::-webkit-media-controls-time-remaining-display { display: none; }
              `}} />
            </div>
          );
        })()}

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
            <div style={{ flex: 1, height: '3px', backgroundColor: 'rgba(79, 84, 92, 0.4)', position: 'relative', borderRadius: '2px' }}>
              {/* Filled progress bar */}
              {progressPercentage !== null && (
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercentage}%`, backgroundColor: '#00f3ff', borderRadius: '2px', boxShadow: '0 0 6px #00f3ff' }} />
              )}
              {/* Airplane icon placed exactly at progress % */}
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: progressPercentage !== null ? `${progressPercentage}%` : '50%', 
                transform: 'translate(-50%, -50%)', 
                backgroundColor: progressPercentage !== null ? 'transparent' : '#2A2B30', 
                padding: '0 2px', 
                fontSize: '12px', 
                color: progressPercentage !== null ? '#00f3ff' : '#8E9297', 
                borderRadius: '4px',
                filter: progressPercentage !== null ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' : 'none'
              }}>
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

            {/* HIGH-TECH MINIATURE RADAR SWEEP WITH LIVE TARGETS */}
            <div style={{ 
              position: 'relative', width: '100%', height: '180px', backgroundColor: 'rgba(10,12,18,0.8)', 
              borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.2)', overflow: 'hidden', 
              boxShadow: 'inset 0 0 20px rgba(0,243,255,0.05)'
            }}>
               {/* ZERO ANCHOR SYSTEM */}
               <div style={{ position: 'absolute', top: '50%', left: '50%' }}>
                 {/* Static ground mappings */}
                 <div style={{ position: 'absolute', width: '280px', height: '280px', borderRadius: '50%', border: '1px solid rgba(0, 243, 255, 0.05)', transform: 'translate(-50%, -50%)' }} />
                 <div style={{ position: 'absolute', width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(0, 243, 255, 0.15)', transform: 'translate(-50%, -50%)' }} />
                 <div style={{ position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', border: '1px dashed rgba(0, 243, 255, 0.25)', transform: 'translate(-50%, -50%)' }} />
                 
                 {/* Center Crosshairs */}
                 <div style={{ position: 'absolute', width: '1px', height: '180px', backgroundColor: 'rgba(0,243,255,0.1)', transform: 'translate(-50%, -50%)' }} />
                 <div style={{ position: 'absolute', height: '1px', width: '280px', backgroundColor: 'rgba(0,243,255,0.1)', transform: 'translate(-50%, -50%)' }} />

                 {/* Center Tracking Node */}
                 <div style={{ position: 'absolute', width: '6px', height: '6px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 0 10px #fff, 0 0 20px #00f3ff', transform: 'translate(-50%, -50%)', zIndex: 20 }} />
                 
                 {/* Real-time Peripheral Threats/Traffic */}
                 {localTraffic.map((t, idx) => (
                   <div key={idx} style={{
                      position: 'absolute', top: t.y, left: t.x, width: '4px', height: '4px',
                      backgroundColor: t.isClimbing ? '#F59E0B' : '#00f3ff', borderRadius: '50%',
                      boxShadow: `0 0 8px ${t.isClimbing ? '#F59E0B' : '#00f3ff'}`, transform: 'translate(-50%, -50%)', zIndex: 30
                   }} title={`${t.callsign} | ${Math.round(t.dist * 60)} NM`} >
                      <div style={{ position: 'absolute', width: '10px', height: '1px', background: 'rgba(255,255,255,0.4)', top: '1px', left: '1px', transform: `rotate(${t.heading - 90}deg)`, transformOrigin: '0 0' }} />
                   </div>
                 ))}

                 {/* Advanced Conic Sweep Render */}
                 <div style={{
                   position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
                   background: 'conic-gradient(from 0deg, transparent 75%, rgba(0, 243, 255, 0.2) 99%, rgba(0, 243, 255, 0.9) 100%)',
                   animation: 'panelRadarSpin 2.5s linear infinite', zIndex: 15, pointerEvents: 'none',
                   transformOrigin: '50% 50%'
                 }} />
               </div>

               <div style={{ position: 'absolute', top: '8px', left: '10px', fontSize: '9px', color: '#00f3ff', fontWeight: 800, letterSpacing: '1px', zIndex: 40 }}>TACTICAL SCAN: ACTIVE</div>
               <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', zIndex: 40 }}>{localTraffic.length} TARGETS ACQUIRED</div>
               
               <style>{`
                 @keyframes panelRadarSpin {
                   0% { transform: translate(-50%, -50%) rotate(0deg); }
                   100% { transform: translate(-50%, -50%) rotate(360deg); }
                 }
               `}</style>
            </div>
            
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
