import React, { useState, useEffect } from 'react';

interface FlightradarTopNavProps {
  onSearch: (term: string) => void;
  flightCount: number;
  isHeatmapActive: boolean;
  toggleHeatmap: () => void;
  onReset: () => void;
}

export default function FlightradarTopNav({ onSearch, flightCount, isHeatmapActive, toggleHeatmap, onReset }: FlightradarTopNavProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={isMobile ? {
      position: 'absolute', top: '24px', left: '16px', right: '16px', maxWidth: '100%', margin: '0', height: '48px',
      backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', padding: '0 16px', zIndex: 1000,
      color: '#000000', justifyContent: 'center', borderRadius: '24px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)', fontFamily: '"Inter", sans-serif'
    } : {
      position: 'absolute', top: 0, left: 0, width: '100%', height: '60px', backgroundColor: 'rgba(15, 23, 42, 0.95)', display: 'flex',
      alignItems: 'center', padding: '0 24px', zIndex: 1000, color: '#fff', boxSizing: 'border-box', justifyContent: 'space-between',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      borderBottom: '1px solid rgba(0, 243, 255, 0.15)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)'
    }}>
      
      {/* 1. LEFT CONTROLS */}
      <div style={{ flex: 1, display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '12px' }}>
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
          display: isMobile ? 'none' : 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>
          GKAS<span style={{ color: '#00f3ff' }}>FLOWS</span> 
        </span>
        <span style={{
          marginLeft: '8px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0, 243, 255, 0.1)',
          color: '#00f3ff', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1px'
        }}>
          LIVE BETA
        </span>
      </div>

      {/* MOBILE FLOATING CONTROLS (Home & Heatmap) */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 1000
        }}>
          {/* HOME BUTTON */}
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
          
          {/* HEATMAP BUTTON */}
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
      )}

      {/* 3. RIGHT SEARCH ENGINE */}
      <div style={{ flex: isMobile ? '1' : '1', display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', position: 'relative', height: '100%', width: '100%' }}>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '300px', height: '36px', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            id="search-input"
            placeholder="Search Flights, Airports..."
            onChange={(e) => onSearch(e.target.value)}
            style={{
              width: '100%',
              height: isMobile ? '48px' : '36px',
              backgroundColor: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
              border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: isMobile ? '0' : '8px',
              padding: '0 16px 0 40px',
              color: isMobile ? '#000000' : '#00f3ff', 
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
              boxShadow: isMobile ? 'none' : 'inset 0 1px 4px rgba(0,0,0,0.3)',
              boxSizing: 'border-box'
            }}
          />
          <svg style={{ position: 'absolute', left: '12px', width: '18px', height: '18px', fill: isMobile ? '#666666' : '#00f3ff', opacity: 0.8 }} viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </div>
      </div>

    </div>
  );
}
