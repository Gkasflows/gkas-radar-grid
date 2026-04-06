import React from 'react';

interface FlightradarTopNavProps {
  onSearch: (term: string) => void;
  flightCount: number;
  isHeatmapActive: boolean;
  toggleHeatmap: () => void;
  onReset: () => void;
}

export default function FlightradarTopNav({ onSearch, flightCount, isHeatmapActive, toggleHeatmap, onReset }: FlightradarTopNavProps) {
  return (
    <div className="absolute top-4 left-4 right-4 md:left-[50%] md:-translate-x-1/2 md:w-[600px] h-[52px] bg-slate-900/95 flex items-center px-4 z-[1000] text-white justify-between border border-[#00f3ff]/20 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] font-['Inter',-apple-system,sans-serif] backdrop-blur-md">
      
      {/* 1. LEFT CONTROLS (Hidden on Mobile) */}
      <div className="hidden md:flex items-center gap-3 mr-4">
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
            borderRadius: '20px',
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
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isHeatmapActive ? '0 0 10px rgba(0, 243, 255, 0.3)' : 'none'
          }}
        >
          {isHeatmapActive ? '◆ Heatmap: ON' : '◇ Heatmap: OFF'}
        </button>
      </div>

      {/* 2. CENTER BRANDING LOGO (Hidden on mobile if search takes over) */}
      <div 
        onClick={onReset} 
        title="Reset Map"
        className="hidden sm:flex flex-none justify-start items-center cursor-pointer select-none mr-3"
      >
        <span style={{ 
          fontSize: '18px', 
          fontWeight: 900, 
          fontFamily: '"SF Pro Display", -apple-system, sans-serif',
          letterSpacing: '-0.3px',
          textTransform: 'uppercase'
        }}>
          <span style={{ color: '#ffffff' }}>GKAS</span>
          <span style={{ color: '#FFDE1B' }}>FLOWS</span>
        </span>
      </div>

      {/* 3. RIGHT SEARCH ENGINE (Fills space seamlessly) */}
      <div className="flex-1 flex justify-end relative h-full">
        <div className="relative w-full h-full flex items-center">
          <input 
            type="text" 
            id="search-input"
            placeholder="Search Flights, IATA..."
            onChange={(e) => onSearch(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0 16px 0 36px',
              color: '#00f3ff', 
              fontSize: '15px',
              fontWeight: 500,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', fill: '#8E9297' }} viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
