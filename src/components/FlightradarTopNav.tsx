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
}

export default function FlightradarTopNav({ searchQuery, onSearch, flightCount, isHeatmapActive, toggleHeatmap, onReset, globalAirports, globalFlights, onFlightSelect, onAirportSelect, onWeatherChase }: FlightradarTopNavProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isUtc, setIsUtc] = useState(true);
  const [filterMode, setFilterMode] = useState<{ id: string, label: string, placeholder: string } | null>(null);

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
    if (filterMode && !searchQuery) {
      setFilterMode(null);
    } else {
      onSearch('');
      if (!filterMode) setShowDropdown(false);
    }
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
      
    // Handle specific filter modes
    if (filterMode) {
      if (filterMode.id === 'airline') {
        const flights = (globalFlights || [])
          .filter(f => f.airline?.toLowerCase().includes(q) || f.callsign?.toLowerCase().includes(q))
          .map(f => f.airline || f.callsign || 'Unknown')
          .filter((v, i, a) => a.indexOf(v) === i) // Unique
          .slice(0, 5)
          .map(a => ({ type: 'airline', title: a, subtitle: 'Airline Fleet', icon: '✈️', searchValue: a }));
        return flights;
      }
      if (filterMode.id === 'route') {
        const flights = (globalFlights || [])
          .filter(f => (f.origin_iata?.toLowerCase() === q.split('-')[0]?.trim() && f.dest_iata?.toLowerCase() === q.split('-')[1]?.trim()) || f.callsign?.toLowerCase().includes(q))
          .slice(0, 5)
          .map(f => ({ type: 'flight', title: `Flight ${f.callsign || f.icao24}`, subtitle: `${f.origin || 'Unknown'} → ${f.destination || 'Unknown'}`, icon: '✈️', searchValue: f.callsign || f.icao24, raw: f }));
        return flights;
      }
    }

    // Default global search
    const ports = (globalAirports || [])
      .filter(a => a.name?.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q) || a.iata?.toLowerCase().includes(q) || a.country?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(a => ({ type: 'airport', title: `${a.city || a.name || 'Unknown'} (${a.iata || 'UNK'})`, subtitle: a.country || a.name, icon: '📍', searchValue: a.iata || a.city, raw: a }));
    results.push(...ports);

    const flights = (globalFlights || [])
      .filter(f => f.callsign?.toLowerCase().includes(q) || f.airline?.toLowerCase().includes(q) || f.icao24?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(f => ({ type: 'flight', title: `Flight ${f.callsign || f.icao24}`, subtitle: `${f.origin || 'Unknown'} → ${f.destination || 'Unknown'}`, icon: '✈️', searchValue: f.callsign || f.icao24, raw: f }));
    results.push(...flights);
      
    return results;
  }, [searchQuery, globalAirports, globalFlights, filterMode]);

  const allSuggestions = [...suggestions, ...geoLocations].slice(0, 8); // Max 8 items rendered smoothly

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .desktop-only-nav { display: none !important; }
        .mobile-only-nav { display: flex !important; }
        .brand-logo-text { font-size: 16px !important; }
        .top-nav-parent { padding: 0 16px !important; }
        .clock-container {
          display: block !important;
          font-size: 10px !important;
          margin-right: 8px !important;
          margin-top: 2px !important;
        }
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

        {/* 3 DISCRETE WEATHER HUNTERS */}
        <div style={{ display: 'flex', marginLeft: '10px', gap: '4px', backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {[
             { t: 'rain', icon: '🌧️', label: 'RAIN' },
             { t: 'snow', icon: '❄️', label: 'SNOW' },
             { t: 'thunder', icon: '⚡', label: 'THUNDER' }
          ].map(weather => (
            <button
              key={weather.t}
              onClick={() => onWeatherChase && onWeatherChase(weather.t as any)}
              title={`Teleport to an active ${weather.t} system globally`}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#00f3ff'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#fff'; }}
            >
              {weather.icon} {weather.label}
            </button>
          ))}
        </div>
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

          {/* MOBILE WEATHER CHASERS */}
          {['rain', 'snow', 'thunder'].map((t, idx) => (
             <button
                key={t}
                onClick={() => onWeatherChase && onWeatherChase(t as any)}
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
                {t === 'rain' ? '🌧️' : t === 'snow' ? '❄️' : '⚡'}
             </button>
          ))}
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

        <div className="search-container" style={{ position: 'relative', height: '34px', display: 'flex', alignItems: 'center', transition: 'all 0.3s ease' }}>
          {filterMode && (
             <div style={{ position: 'absolute', left: '10px', display: 'flex', alignItems: 'center', zIndex: 2 }}>
                <div style={{ backgroundColor: 'rgba(0, 243, 255, 0.2)', color: '#00f3ff', border: '1px solid rgba(0, 243, 255, 0.4)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   {filterMode.label}
                </div>
             </div>
          )}
          <input 
            ref={inputRef}
            type="text" 
            id="search-input"
            value={searchQuery}
            placeholder={filterMode ? filterMode.placeholder : "Search flights, airports..."}
            onChange={(e) => { 
              const val = e.target.value;
              onSearch(val); 
              if (val.trim().length > 0 || !filterMode) {
                 setShowDropdown(true);
              }
            }}
            onFocus={() => {
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: filterMode ? 'rgba(0, 40, 60, 0.6)' : 'rgba(255, 255, 255, 0.1)',
              border: filterMode ? '1px solid rgba(0, 243, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: filterMode ? '0 28px 0 110px' : '0 28px 0 36px',
              color: '#00f3ff', 
              fontSize: '13px',
              fontWeight: 500,
              outline: 'none',
              boxShadow: filterMode ? '0 0 15px rgba(0, 243, 255, 0.15)' : 'inset 0 1px 4px rgba(0,0,0,0.5)',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            }}
          />
          {/* SEARCH ICON */}
          {!filterMode && (
            <svg style={{ position: 'absolute', left: '14px', width: '14px', height: '14px', fill: '#ffffff', opacity: 0.7 }} viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          )}
          
          {/* SECURE CANCEL BUTTON (X) */}
          {(searchQuery || filterMode) && (
            <button 
              onClick={handleClear} 
              style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', padding: 0, opacity: 0.8, outline: 'none', zIndex: 2 }}
              title="Clear Search"
            >
              ✕
            </button>
          )}

          {/* DYNAMIC AUTO-SUGGESTIONS & TACTICAL SHORTCUTS PANEL */}
          {showDropdown && (
             <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '12px', 
                width: '320px', backgroundColor: 'rgba(12, 18, 30, 0.96)', backdropFilter: 'blur(20px)',
                borderRadius: '16px', border: '1px solid rgba(0,243,255,0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                overflow: 'hidden', zIndex: 1100, display: 'flex', flexDirection: 'column'
             }}>
                
                {/* 1. TYPING SUGGESTIONS */}
                {searchQuery && allSuggestions.length > 0 && allSuggestions.map((s, idx) => (
                   <div key={idx} onClick={() => handleSelect(s.searchValue, s.type, s.raw)} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'background 0.2s', ...(s.type === 'hq' ? {color: '#00f3ff'} : {color: '#ccc'}) }}
                   onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 243, 255, 0.08)'}
                   onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                        <span style={{ marginRight: '8px', fontSize: '15px' }}>{s.icon}</span> {s.title}
                      </div>
                      {s.subtitle && <div style={{ fontSize: '11px', color: '#8E9297', marginLeft: '26px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subtitle}</div>}
                   </div>
                ))}
                
                {/* 2. DEFAULT STATE: SHORTCUTS TO FIND & RECENT */}
                {!searchQuery && !filterMode && (
                   <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                      <div style={{ fontSize: '11px', color: '#8E9297', fontWeight: 600, padding: '8px 16px', textTransform: 'uppercase' }}>SHORTCUTS TO FIND</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                          { id: 'route', label: 'Flights by route', icon: '✈️', placeholder: 'Enter Route (e.g. JFK-LAX)' },
                          { id: 'airline', label: 'Live flights by airline', icon: '✈️', placeholder: 'Enter Airline Code (e.g. QTR)' },
                          { id: 'history', label: 'Airport flights history', icon: '🏛️', placeholder: 'Enter Airport IATA Code' },
                          { id: 'airport', label: 'Airports by country', icon: '🏛️', placeholder: 'Enter Country Name' },
                        ].map((sc) => (
                           <div key={sc.id} onClick={() => setFilterMode({ id: sc.id, label: sc.label, placeholder: sc.placeholder })}
                             style={{
                               display: 'flex', alignItems: 'center', padding: '12px 16px',
                               cursor: 'pointer', transition: 'background 0.2s ease', color: '#fff'
                             }}
                             onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                             onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                           >
                             <span style={{ marginRight: '12px', fontSize: '15px' }}>{sc.icon}</span> 
                             <span style={{ fontSize: '13px', fontWeight: 500 }}>{sc.label}</span>
                           </div>
                        ))}

                        {/* "NEARBY" ACTION */}
                        <div 
                          onClick={() => {
                            if (navigator.geolocation) {
                               navigator.geolocation.getCurrentPosition(pos => {
                                 onSearch(`@geo:${pos.coords.latitude},${pos.coords.longitude}`);
                                 setShowDropdown(false);
                               });
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', padding: '12px 16px',
                            cursor: 'pointer', transition: 'background 0.2s ease', color: '#fff'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                           <span style={{ marginRight: '12px', fontSize: '15px' }}>📍</span> 
                           <span style={{ fontSize: '13px', fontWeight: 500 }}>Nearby</span>
                        </div>
                      </div>

                      {recentSearches.length > 0 && (
                         <>
                           <div style={{ fontSize: '11px', color: '#8E9297', fontWeight: 600, padding: '16px 16px 8px 16px', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>Recent Searches</div>
                           {recentSearches.slice(0, 3).map(s => (
                             <div key={s} onClick={() => handleSelect(s)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                               onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                               onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                             >
                                <span style={{ fontSize: '13px', color: '#00f3ff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{opacity: 0.5}}>🕒</span> {s}
                                </span>
                                <button 
                                  onClick={(e) => handleDeleteSearch(e, s)} 
                                  style={{ background: 'transparent', border: 'none', color: '#8E9297', cursor: 'pointer', fontSize: '12px', padding: '4px' }}
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
          )}
        </div>
      </div>

    </div>
    </>
  );
}
