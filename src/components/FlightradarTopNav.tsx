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
}

export default function FlightradarTopNav({ searchQuery, onSearch, flightCount, isHeatmapActive, toggleHeatmap, onReset, globalAirports, globalFlights, onFlightSelect, onAirportSelect }: FlightradarTopNavProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isUtc, setIsUtc] = useState(true);

  // Live Auto-Switching Clock Engine
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (isUtc) {
        setCurrentTime(`${now.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(now.getUTCMilliseconds()).padStart(3, '0')}`);
      } else {
        setCurrentTime(`${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.${String(now.getMilliseconds()).padStart(3, '0')}`);
      }
    };
    updateTime(); // Instant init
    const interval = setInterval(updateTime, 47);
    return () => clearInterval(interval);
  }, [isUtc]);



  useEffect(() => {
    try {
      const saved = localStorage.getItem('gkas_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch(e){}
  }, []);

  const handleSaveSearch = (query: string) => {
    if (!query || !query.trim()) return;
    const newSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 6);
    setRecentSearches(newSearches);
    localStorage.setItem('gkas_recent_searches', JSON.stringify(newSearches));
  };

  const handleSelect = (val: string, type?: string, rawData?: any) => {
    onSearch(val);
    handleSaveSearch(val);
    setShowDropdown(false);
    inputRef.current?.blur();
    // Directly trigger fly-to for flights and airports
    if (type === 'flight' && rawData && onFlightSelect) {
      onFlightSelect(rawData);
    } else if (type === 'airport' && rawData && onAirportSelect) {
      onAirportSelect(rawData);
    }
  };

  const handleDeleteSearch = (e: React.MouseEvent, target: string) => {
    e.stopPropagation();
    const newSearches = recentSearches.filter(s => s !== target);
    setRecentSearches(newSearches);
    localStorage.setItem('gkas_recent_searches', JSON.stringify(newSearches));
  };

  const handleClear = () => {
    onSearch('');
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveSearch(searchQuery);
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Dynamic Nominatim Geographic Search Integration Directly in Dropdown
  const [geoLocations, setGeoLocations] = useState<any[]>([]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setGeoLocations([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=3`);
        const json = await res.json();
        if (json && json.length > 0) {
          setGeoLocations(json.map((j: any) => ({
             type: 'location',
             title: j.display_name.split(',')[0],
             subtitle: j.display_name.split(',').slice(1).join(',').trim(),
             icon: '🌍',
             searchValue: j.display_name
          })));
        }
      } catch (e) {
        // fail silently for rate limits
      }
    }, 600); // 600ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const suggestions = React.useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const results: any[] = [];
    
    // Core HQ Target
    if ('the smartan house'.includes(q) || 'smartan'.includes(q) || 'house'.includes(q)) {
      results.push({ type: 'hq', title: 'THE SMARTAN HOUSE', subtitle: 'Global Tracking Headquarters', icon: '🏛️', searchValue: 'THE SMARTAN HOUSE' });
    }
      
    // Geofencing matching local DB string
    const ports = (globalAirports || [])
      .filter(a => a.name?.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q) || a.iata?.toLowerCase().includes(q) || a.country?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(a => ({ type: 'airport', title: `${a.city || a.name || 'Unknown'} (${a.iata || 'UNK'})`, subtitle: a.country || a.name, icon: '📍', searchValue: a.iata || a.city, raw: a }));
    results.push(...ports);

    // Live Flights Matching
    const flights = (globalFlights || [])
      .filter(f => f.callsign?.toLowerCase().includes(q) || f.airline?.toLowerCase().includes(q) || f.icao24?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(f => ({ type: 'flight', title: `Flight ${f.callsign || f.icao24}`, subtitle: `${f.origin || 'Unknown'} → ${f.destination || 'Unknown'}`, icon: '✈️', searchValue: f.callsign || f.icao24, raw: f }));
    results.push(...flights);
      
    return results;
  }, [searchQuery, globalAirports, globalFlights]);

  const allSuggestions = [...suggestions, ...geoLocations].slice(0, 8); // Max 8 items rendered smoothly

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .desktop-only-nav { display: none !important; }
        .mobile-only-nav { display: flex !important; }
        .brand-logo-text { font-size: 16px !important; }
        .top-nav-parent { padding: 0 16px !important; }
        .clock-container { display: block !important; font-size: 11px !important; margin-right: 12px !important; }
        .search-container { width: 150px !important; }
      }
      @media (min-width: 769px) {
        .mobile-only-nav { display: none !important; }
        .search-container { width: 300px !important; }
      }
    `}</style>
    <div className="top-nav-parent" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '60px', 
      backgroundColor: 'rgba(10, 15, 30, 0.45)', backdropFilter: 'blur(24px) saturate(150%)', display: 'flex',
      alignItems: 'center', padding: '0 24px', zIndex: 1000, color: '#fff', boxSizing: 'border-box', justifyContent: 'space-between',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      borderBottom: '1px solid rgba(0, 243, 255, 0.25)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
    }}>
      
      {/* 1. LEFT CONTROLS */}
      <div className="desktop-only-nav" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onReset}
          title="Reset map view and clear all tracked data"
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ⌂ HOME
        </button>
        
        <button
          onClick={toggleHeatmap}
          style={{
            backgroundColor: isHeatmapActive ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: isHeatmapActive ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.1)',
            color: isHeatmapActive ? '#00f3ff' : '#8E9297',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isHeatmapActive ? '0 0 10px rgba(0, 243, 255, 0.3)' : 'none'
          }}
        >
          {isHeatmapActive ? '◆ Altitude Heatmap: ON' : '◇ Altitude Heatmap: OFF'}
        </button>
      </div>

      {/* 2. CENTER BRANDING LOGO */}
      <div 
        onClick={onReset} 
        title="Reset Map"
        style={{
          flex: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span className="brand-logo-text" style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>
          GKAS<span style={{ color: '#00f3ff' }}>FLOWS</span> 
        </span>
        <span className="desktop-only-nav" style={{
          marginLeft: '8px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 243, 255, 0.1)',
          color: '#00f3ff', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1px'
        }}>
          LIVE BETA
        </span>
      </div>

      {/* MOBILE FLOATING CONTROLS (Home & Heatmap) */}
      <div className="mobile-only-nav" style={{
        position: 'fixed',
        top: '80px',
        right: '16px',
        display: 'none',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1000
      }}>
          <button
            onClick={onReset}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ⌂
          </button>
          
          <button
            onClick={toggleHeatmap}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: isHeatmapActive ? 'rgba(0, 243, 255, 0.2)' : 'rgba(15, 23, 42, 0.95)',
              border: isHeatmapActive ? '1px solid #00f3ff' : '1px solid rgba(0, 243, 255, 0.2)',
              color: isHeatmapActive ? '#00f3ff' : '#ffffff',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            {isHeatmapActive ? '🔥' : '📍'}
          </button>
        </div>

      {/* 3. RIGHT SEARCH ENGINE WITH LIVE AUTO-SUGGESTIONS & TIMING CLOCK */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', height: '100%' }}>
        
        {/* ZONED LIVE AUTO-CLOCK */}
        <div 
          className="clock-container"
          title="Click to toggle UTC / Local Time"
          onClick={() => setIsUtc(!isUtc)} 
          style={{ marginRight: '24px', fontSize: '13px', fontWeight: 700, color: '#e2e8f0', cursor: 'pointer', fontFamily: '"SF Mono", "Consolas", monospace', userSelect: 'none', transition: 'color 0.2s' }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#00f3ff')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        >
          {currentTime} <span style={{ opacity: 0.6 }}>{isUtc ? 'UTC' : 'LOC'}</span>
        </div>

        <div className="search-container" style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
          <input 
            ref={inputRef}
            type="text" 
            id="search-input"
            value={searchQuery}
            placeholder="Search..."
            onChange={(e) => { 
              const val = e.target.value;
              onSearch(val); 
              if (val.trim().length > 0) {
                 setShowDropdown(true);
              } else {
                 setShowDropdown(false);
              }
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0 || recentSearches.length > 0) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '0 28px 0 32px',
              color: '#00f3ff', 
              fontSize: '13px',
              fontWeight: 500,
              outline: 'none',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
              boxSizing: 'border-box'
            }}
          />
          {/* SEARCH ICON */}
          <svg style={{ position: 'absolute', left: '12px', width: '14px', height: '14px', fill: '#ffffff', opacity: 0.7 }} viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          
          {/* SECURE CANCEL BUTTON (X) */}
          {searchQuery && (
            <button 
              onClick={handleClear} 
              style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', padding: 0, opacity: 0.8, outline: 'none' }}
              title="Clear Search"
            >
              ✕
            </button>
          )}

          {/* DYNAMIC AUTO-SUGGESTIONS PANEL */}
          {showDropdown && (allSuggestions.length > 0 || (!searchQuery && recentSearches.length > 0)) && (
             <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '12px', 
                width: '100%', backgroundColor: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(16px)',
                borderRadius: '12px', border: '1px solid rgba(0,243,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                overflow: 'hidden', zIndex: 1100, display: 'flex', flexDirection: 'column'
             }}>
                {searchQuery && allSuggestions.length > 0 && allSuggestions.map((s, idx) => (
                   <div key={idx} onClick={() => handleSelect(s.searchValue, s.type, s.raw)} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'background 0.2s', ...(s.type === 'hq' ? {color: '#00f3ff'} : {color: '#ccc'}) }}>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                        <span style={{ marginRight: '6px' }}>{s.icon}</span> {s.title}
                      </div>
                      {s.subtitle && <div style={{ fontSize: '10px', color: '#8E9297', marginLeft: '24px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subtitle}</div>}
                   </div>
                ))}
                {!searchQuery && recentSearches.length > 0 && (
                   <>
                     <div style={{ padding: '8px 14px', fontSize: '10px', color: '#8E9297', backgroundColor: 'rgba(0,0,0,0.3)', fontWeight: 800, letterSpacing: '0.5px' }}>RECENT SEARCHES</div>
                     {recentSearches.map(s => (
                       <div key={s} onClick={() => handleSelect(s)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '13px', color: '#00f3ff', cursor: 'pointer', fontWeight: 500 }}>🕒 {s}</span>
                          <button 
                            onClick={(e) => handleDeleteSearch(e, s)} 
                            style={{ background: 'transparent', border: 'none', color: '#8E9297', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                            title="Remove from history"
                          >
                            ✕
                          </button>
                       </div>
                     ))}
                   </>
                )}
             </div>
          )}
        </div>
      </div>

    </div>
    </>
  );
}
