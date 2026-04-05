'use client';
import { memo, useState, useMemo } from 'react';

export interface Airport {
  iata: string;
  name: string;
  coords: [number, number];
}

interface AirportSearchProps {
  airports: Airport[];
  selectedAirportIata: string | null;
  onAirportClick: (airport: Airport) => void;
  nested?: boolean;
}

const AirportSearch = memo(({ airports, selectedAirportIata, onAirportClick, nested }: AirportSearchProps) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return airports;
    return airports.filter(a =>
      a.iata.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
    );
  }, [airports, query]);

  const isSearching = query.trim().length > 0;

  const content = (
    <>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Airport Search
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <span style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.9rem', opacity: 0.5, pointerEvents: 'none'
        }}>🔍</span>
        <input
          type="text"
          placeholder="IATA code or airport name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 32px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(0,255,255,0.3)',
            borderRadius: '12px', color: '#fff',
            fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
            transition: 'all 0.2s ease',
          }}
          onFocus={e => {
            (e.target.style.borderColor = 'rgba(0,255,255,0.8)');
            (e.target.style.background = 'rgba(255,255,255,0.1)');
          }}
          onBlur={e => {
            (e.target.style.borderColor = 'rgba(0,255,255,0.3)');
            (e.target.style.background = 'rgba(255,255,255,0.06)');
          }}
        />
        {isSearching && (
          <button onClick={() => setQuery('')} style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: '0.9rem', padding: 0, lineHeight: 1
          }}>✕</button>
        )}
      </div>

      {/* Result count */}
      {isSearching && (
        <div style={{ fontSize: '0.68rem', color: 'rgba(0,255,255,0.7)', marginBottom: '8px', fontWeight: 600 }}>
          {filtered.length === 0 ? '⚠️ No airports found' : `✓ ${filtered.length} airport${filtered.length !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Airport List */}
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, paddingRight: '4px', minHeight: '200px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🛸</div>
            No airports match &ldquo;{query}&rdquo;
          </div>
        ) : filtered.map(airport => {
          const isSelected = airport.iata === selectedAirportIata;
          return (
            <div
              key={airport.iata}
              onClick={() => onAirportClick(airport)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
                background: isSelected ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? 'rgba(0,255,255,0.5)' : 'transparent'}`,
                boxShadow: isSelected ? '0 0 15px rgba(0,255,255,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid transparent';
                }
              }}
            >
              {/* IATA Badge */}
              <div style={{
                minWidth: '38px', textAlign: 'center',
                background: isSelected ? 'rgba(0,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isSelected ? 'rgba(0,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '6px', padding: '4px 6px',
                fontSize: '0.7rem', fontWeight: 700, color: isSelected ? '#00ffff' : 'rgba(255,255,255,0.8)',
                letterSpacing: '0.05em'
              }}>
                {airport.iata}
              </div>
              {/* Name */}
              <div style={{ fontSize: '0.75rem', color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)', lineHeight: 1.3, flex: 1 }}>
                {airport.name}
              </div>
              {/* Focus indicator */}
              {isSelected && (
                <div style={{ fontSize: '0.65rem', color: '#00ffff', fontWeight: 700 }}>●</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ 
        fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', 
        paddingTop: '12px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' 
      }}>
        {selectedAirportIata ? 'Click again to zoom out' : 'Click an airport to zoom in'}
      </div>
    </>
  );

  if (nested) return content;

  return (
    <div className="glass-sidebar" style={{ 
      width: '280px', 
      margin: 0,
      padding: '20px',
      display: 'flex', 
      flexDirection: 'column'
    }}>
      {content}
    </div>
  );
});

AirportSearch.displayName = 'AirportSearch';
export default AirportSearch;
