import React, { useState, useMemo } from 'react';

interface CountriesModalProps {
  globalAirports: any[];
  onClose: () => void;
  onOpenAirportFeatures: (airport: any, feature: string) => void;
}

function getFlagUrl(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return '';
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

export default function CountriesModal({ globalAirports, onClose, onOpenAirportFeatures }: CountriesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation State
  const [selectedCountry, setSelectedCountry] = useState<{code: string, name: string} | null>(null);
  const [expandedAirport, setExpandedAirport] = useState<string | null>(null);

  const countries = useMemo(() => {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countriesMap = new Map<string, number>();
    
    globalAirports.forEach(a => {
      if (a.country && a.country.length === 2) {
         countriesMap.set(a.country, (countriesMap.get(a.country) || 0) + 1);
      }
    });

    const result = Array.from(countriesMap.entries()).map(([code, count]) => {
      let name = code;
      try {
        name = regionNames.of(code) || code;
      } catch (e) {
        // Fallback if region code is invalid
      }
      return {
        code,
        name,
        count,
        flagUrl: getFlagUrl(code)
      };
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [globalAirports]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    const q = searchQuery.toLowerCase().trim();
    return countries.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.code.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  // Group alphabetically for standard Flightradar24 experience
  const grouped = useMemo(() => {
    const groups: { [letter: string]: typeof countries } = {};
    filteredCountries.forEach(c => {
      const firstLetter = c.name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(c);
    });
    return groups;
  }, [filteredCountries]);

  // ------------------------------------
  // LEVEL 2: AIRPORTS VIEW LOGIC
  // ------------------------------------
  const countryAirports = useMemo(() => {
    if (!selectedCountry) return [];
    return globalAirports
      .filter(a => a.country === selectedCountry.code)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [selectedCountry, globalAirports]);

  const filteredCountryAirports = useMemo(() => {
    if (!searchQuery) return countryAirports;
    const q = searchQuery.toLowerCase().trim();
    return countryAirports.filter(a => 
      (a.name || '').toLowerCase().includes(q) || 
      (a.iata || '').toLowerCase().includes(q) ||
      (a.city || '').toLowerCase().includes(q)
    );
  }, [countryAirports, searchQuery]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999, // Ensure it's above everything including TopNav
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '24px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: '500px', height: '100%', maxHeight: '80vh',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(0, 243, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', color: '#fff',
        fontFamily: '"Inter", -apple-system, sans-serif'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
          {selectedCountry ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <button onClick={() => { setSelectedCountry(null); setSearchQuery(''); setExpandedAirport(null); }}
                 style={{ background: 'transparent', border: 'none', color: '#00f3ff', cursor: 'pointer', fontSize: '20px', padding: 0 }}
               >
                 ←
               </button>
               <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>{selectedCountry.name} Airports</h2>
            </div>
          ) : (
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>Airports by Country</h2>
          )}
          
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'transparent', border: 'none',
              color: '#8E9297', fontSize: '18px', cursor: 'pointer'
            }}
          >✕</button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '16px 20px', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder={selectedCountry ? "Search airports in " + selectedCountry.name + "..." : "Search for a country..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 40px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: '#fff', fontSize: '15px',
                boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s'
              }}
              onFocus={e => e.target.style.border = '1px solid #00f3ff'}
              onBlur={e => e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)'}
            />
            <span style={{ position: 'absolute', left: '14px', top: '12px', fontSize: '14px' }}>🔍</span>
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          
          {/* LEVEL 1: COUNTRIES LIST */}
          {!selectedCountry && (
            Object.keys(grouped).length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8E9297' }}>
                No countries found matching "{searchQuery}"
              </div>
            ) : (
              Object.keys(grouped).sort().map(letter => (
                <div key={letter}>
                  <div style={{
                    padding: '8px 20px', backgroundColor: 'rgba(0, 243, 255, 0.05)',
                    color: '#00f3ff', fontWeight: 800, fontSize: '14px',
                    borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {letter}
                  </div>
                  {grouped[letter].map(country => (
                    <div 
                      key={country.code}
                      onClick={() => { setSelectedCountry(country); setSearchQuery(''); }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {country.flagUrl ? (
                          <img src={country.flagUrl} alt={country.code} width="24" style={{ borderRadius: '2px', boxShadow: '0 0 2px rgba(0,0,0,0.5)' }} />
                        ) : (
                          <span style={{ width: '24px', textAlign: 'center' }}>🏳️</span>
                        )}
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>{country.name}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#8E9297', fontWeight: 600 }}>
                        {country.count} {country.count === 1 ? 'airport' : 'airports'}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )
          )}

          {/* LEVEL 2: AIRPORTS LIST */}
          {selectedCountry && (
            filteredCountryAirports.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8E9297' }}>
                No airports found matching "{searchQuery}"
              </div>
            ) : (
              filteredCountryAirports.map(airport => {
                const isExpanded = expandedAirport === airport.iata;
                return (
                  <div key={airport.iata} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Airport Row */}
                    <div 
                      onClick={() => setExpandedAirport(isExpanded ? null : airport.iata)}
                      style={{
                        padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s',
                        backgroundColor: isExpanded ? 'rgba(0, 243, 255, 0.05)' : 'transparent'
                      }}
                      onMouseOver={e => { if(!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)' }}
                      onMouseOut={e => { if(!isExpanded) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 600, color: isExpanded ? '#00f3ff' : '#fff' }}>
                        {airport.name} ({airport.iata})
                      </div>
                      <div style={{ fontSize: '12px', color: '#8E9297', marginTop: '4px' }}>
                        {airport.city}
                      </div>
                    </div>

                    {/* Sub-menu Options */}
                    {isExpanded && (
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px 0' }}>
                        {[
                          { id: 'map', icon: '🗺️', label: 'Show on map' },
                          { id: 'arrivals', icon: '🛬', label: 'Arrival board' },
                          { id: 'departures', icon: '🛫', label: 'Departure board' },
                          { id: 'ground', icon: '🛩️', label: 'Aircraft on ground' },
                          { id: 'search_arriving', icon: '🔍', label: 'Find arriving flight' },
                          { id: 'search_departing', icon: '🔍', label: 'Find departing flight' },
                        ].map(opt => (
                          <div 
                            key={opt.id}
                            onClick={() => onOpenAirportFeatures(airport, opt.id)}
                            style={{
                              padding: '12px 36px', fontSize: '13px', color: '#e2e8f0',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span style={{ fontSize: '16px' }}>{opt.icon}</span> {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
