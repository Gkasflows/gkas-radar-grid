import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Airport } from './FlightradarRightPanel';

interface RouteSearchModalProps {
  onClose: () => void;
  globalAirports: Airport[];
  initialFrom?: Airport | null;
  initialTo?: Airport | null;
  onSearch: (from: Airport | null, to: Airport | null) => void;
  onBack?: () => void;
}

export default function RouteSearchModal({ onClose, globalAirports, initialFrom, initialTo, onSearch, onBack }: RouteSearchModalProps) {
  const [fromQuery, setFromQuery] = useState(initialFrom ? `${initialFrom.name} (${initialFrom.iata})` : '');
  const [toQuery, setToQuery] = useState(initialTo ? `${initialTo.name} (${initialTo.iata})` : '');
  
  const [selectedFrom, setSelectedFrom] = useState<Airport | null>(initialFrom || null);
  const [selectedTo, setSelectedTo] = useState<Airport | null>(initialTo || null);

  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);

  const fromSuggestions = useMemo(() => {
    if (!fromQuery || selectedFrom?.iata === fromQuery) return [];
    const q = fromQuery.toLowerCase();
    return globalAirports.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.iata.toLowerCase().includes(q) || 
      (a.city && a.city.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [fromQuery, selectedFrom, globalAirports]);

  const toSuggestions = useMemo(() => {
    if (!toQuery || selectedTo?.iata === toQuery) return [];
    const q = toQuery.toLowerCase();
    return globalAirports.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.iata.toLowerCase().includes(q) || 
      (a.city && a.city.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [toQuery, selectedTo, globalAirports]);

  const handleSelect = (airport: Airport, type: 'from' | 'to') => {
    if (type === 'from') {
      setSelectedFrom(airport);
      setFromQuery(`${airport.name} (${airport.iata})`);
    } else {
      setSelectedTo(airport);
      setToQuery(`${airport.name} (${airport.iata})`);
    }
    setActiveField(null);
  };

  const handleSearchClick = () => {
    onSearch(selectedFrom, selectedTo);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '24px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: '450px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(0, 243, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        color: '#fff', fontFamily: '"Inter", -apple-system, sans-serif',
        overflow: 'visible'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', display: 'flex', alignItems: 'center' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#00f3ff', cursor: 'pointer', fontSize: '20px', padding: '0 12px 0 0' }}>
              ←
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>Search Flights by Route</h2>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'transparent', border: 'none',
              color: '#8E9297', fontSize: '18px', cursor: 'pointer'
            }}
          >✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          
          {/* FROM FIELD */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#8E9297', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>From</label>
            <input 
              type="text" 
              placeholder="Search by airport name, IATA, city..."
              value={fromQuery}
              onChange={e => {
                setFromQuery(e.target.value);
                setSelectedFrom(null);
              }}
              onFocus={() => setActiveField('from')}
              style={{
                width: '100%', padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: activeField === 'from' ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: '#fff', fontSize: '14px',
                boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s'
              }}
            />
            {activeField === 'from' && fromSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                backgroundColor: 'rgba(20, 30, 50, 0.98)', border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '8px', overflow: 'hidden', zIndex: 10
              }}>
                {fromSuggestions.map(a => (
                  <div key={a.iata} onClick={() => handleSelect(a, 'from')}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.name} ({a.iata})</div>
                    <div style={{ fontSize: '11px', color: '#8E9297' }}>{a.city}, {a.country}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TO FIELD */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#8E9297', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>To</label>
            <input 
              type="text" 
              placeholder="Search by airport name, IATA, city..."
              value={toQuery}
              onChange={e => {
                setToQuery(e.target.value);
                setSelectedTo(null);
              }}
              onFocus={() => setActiveField('to')}
              style={{
                width: '100%', padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: activeField === 'to' ? '1px solid #00f3ff' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: '#fff', fontSize: '14px',
                boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s'
              }}
            />
            {activeField === 'to' && toSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                backgroundColor: 'rgba(20, 30, 50, 0.98)', border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '8px', overflow: 'hidden', zIndex: 10
              }}>
                {toSuggestions.map(a => (
                  <div key={a.iata} onClick={() => handleSelect(a, 'to')}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.name} ({a.iata})</div>
                    <div style={{ fontSize: '11px', color: '#8E9297' }}>{a.city}, {a.country}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleSearchClick}
            disabled={!selectedFrom && !selectedTo}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
              backgroundColor: (!selectedFrom && !selectedTo) ? 'rgba(255,255,255,0.1)' : '#00f3ff',
              color: (!selectedFrom && !selectedTo) ? '#8E9297' : '#000',
              fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', cursor: (!selectedFrom && !selectedTo) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Search Route
          </button>
        </div>
      </div>
    </div>
  );
}
