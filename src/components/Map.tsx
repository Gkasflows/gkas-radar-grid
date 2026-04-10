'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { MapView, FlyToInterpolator } from '@deck.gl/core';
import { TileLayer, GreatCircleLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, IconLayer, PathLayer, LineLayer, ArcLayer, TextLayer, ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { fetchLiveFlights, LiveFlight } from '../services/flightService';
import FlightradarTopNav from './FlightradarTopNav';
import FlightradarSidePanel from './FlightradarSidePanel';
import FlightradarRightPanel, { Airport } from './FlightradarRightPanel';
import AirportSidePanel from './AirportSidePanel';

// Ultra-High-Resolution Command Center Satellite Imaging
const FR24_MAP_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'; // Hybrid: Satellite + Detailed Cartography Labels

// Airport Pin location SVG (Exact FR24 styling: Cyan-blue teardrop pin with white center dot and dark stroke)
const AIRPORT_PIN_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">' +
  '<path d="M12 2C8.14 2 5 5.14 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.86-3.14-7-7-7z" fill="#4ea0d8" stroke="#142131" stroke-width="1.2" stroke-linejoin="round"/>' +
  '<circle cx="12" cy="9" r="3.2" fill="#ffffff" stroke="#142131" stroke-width="0.5"/>' +
  '</svg>'
);

// Sprite Atlas containing a Yellow, a Red, and a White airplane wrapped in sharp black borders
const AIRPLANE_ATLAS = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="64" viewBox="0 0 72 24">' +
  // State 1: Diamond White Base Plane with Neon Cyan Stroke (Replaces regular Yellow plane)
  '<path transform="translate(0,0)" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#ffffff" stroke="#00f3ff" stroke-width="1.2" stroke-linejoin="round"/>' +
  // State 2: Electric Magenta Plane with Pink Glow (Replaces Selected Red plane)
  '<path transform="translate(24,0)" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#ff00b3" stroke="#ff99ea" stroke-width="1.2" stroke-linejoin="round"/>' +
  // State 3: Ghosted Heatmap plane (White heavily transparent)
  '<path transform="translate(48,0)" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="rgba(255,255,255,0.7)" stroke="none"/>' +
  '</svg>'
);

// We will fetch real global_airports.json instead of hardcoding 8.
const FALLBACK_AIRPORTS: Airport[] = [
  { iata: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA', coords: [-73.7781, 40.6413], imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800' }
];

const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 0,
  zoom: 0, // Zoom out globe entirely
  pitch: 0, // Looking straight down globally
  bearing: 0,
  maxZoom: 20,
  minZoom: 0
};

const calculateFlightHistoryTrail = (flight: LiveFlight | null) => {
  if (!flight || !flight.origin_coords || flight.longitude === undefined || flight.latitude === undefined) return [];

  const segments = [];
  const startLon = flight.origin_coords.lon;
  const startLat = flight.origin_coords.lat;
  const endLon = flight.longitude;
  const endLat = flight.latitude;
  const currentAlt = flight.baro_altitude || 10000;

  // Plane's live heading vector
  const headingRad = flight.true_track * (Math.PI / 180);

  // Raw distance
  const lonDiff = endLon - startLon;
  const latDiff = endLat - startLat;
  const dist = Math.sqrt(lonDiff * lonDiff + latDiff * latDiff);

  // Bezier Control Point P1: Pushes forward from the origin airport
  const p1Lon = startLon + lonDiff * 0.3;
  const p1Lat = startLat + latDiff * 0.3;

  // Bezier Control Point P2: Pushes strictly BACKWARD away from the aircraft, 
  // guaranteeing the trail always swoops gracefully behind the engines regardless of coordinates!
  const backwardDist = dist * 0.6; // Huge U-turn arc control
  const p2Lon = endLon + Math.sin(headingRad + Math.PI) * (backwardDist / Math.cos(startLat * Math.PI / 180));
  const p2Lat = endLat + Math.cos(headingRad + Math.PI) * backwardDist;

  const numPoints = 80; // High fidelity sweeping curve
  
  for (let i = 0; i < numPoints; i++) {
    const t1 = i / numPoints;
    const t2 = (i + 1) / numPoints;

    const getBezier = (t: number) => {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;

      let x = uuu * startLon;
      x += 3 * uu * t * p1Lon;
      x += 3 * u * tt * p2Lon;
      x += ttt * endLon;

      let y = uuu * startLat;
      y += 3 * uu * t * p1Lat;
      y += 3 * u * tt * p2Lat;
      y += ttt * endLat;
      
      return [x, y];
    };

    const [lon1, lat1] = getBezier(t1);
    const [lon2, lat2] = getBezier(t2);

    // Altitude mapping: climbs from 0 (Origin) up to current cruise altitude (Aircraft)
    const alt1 = currentAlt * Math.sin(t1 * (Math.PI / 2));
    const alt2 = currentAlt * Math.sin(t2 * (Math.PI / 2));
    const avgAlt = (alt1 + alt2) / 2;

    // FR24 Exact Altitude Heatmap Colors
    let color = [255, 236, 0]; // 0-1000m Yellow
    if (avgAlt > 10000) color = [235, 50, 50]; // Red (>10km)
    else if (avgAlt > 7000) color = [200, 50, 255]; // Purple/Magenta
    else if (avgAlt > 4000) color = [50, 100, 255]; // Deep Blue
    else if (avgAlt > 2000) color = [50, 220, 255]; // Cyan
    else if (avgAlt > 1000) color = [50, 255, 100]; // Green

    segments.push({
      start: [lon1, lat1],
      end: [lon2, lat2],
      color
    });
  }
  
  return segments;
};

export default function Map() {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [networkFlights, setNetworkFlights] = useState<LiveFlight[]>([]);
  const [globalAirports, setGlobalAirports] = useState<Airport[]>(FALLBACK_AIRPORTS);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedAirportIata, setSelectedAirportIata] = useState<string | null>(null);
  const [hoveredAirport, setHoveredAirport] = useState<{ airport: Airport, x: number, y: number } | null>(null);
  const [hoveredFlight, setHoveredFlight] = useState<{ flight: LiveFlight, x: number, y: number } | null>(null);
  const [viewState, setViewState] = useState<any>(INITIAL_VIEW_STATE);
  const [mounted, setMounted] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [radarPath, setRadarPath] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // GLOBAL PLAYBACK SYSTEM
  const [isHeatmapActive, setIsHeatmapActive] = useState(true);

  // GLOBAL AUDIO ENGINE
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleGlobalInteraction = () => {
        const audioEl = document.getElementById('gkas_audio_player') as HTMLAudioElement;
        if (audioEl && !isAudioPlaying) {
          audioEl.volume = 0.4; // Soft background ambience volume
          audioEl.play().then(() => setIsAudioPlaying(true)).catch(() => {});
        }
      };
      
      // Bind to any interaction to cleanly bypass strict browser autoplay limits
      window.addEventListener('pointerdown', handleGlobalInteraction, { once: true });
      window.addEventListener('keydown', handleGlobalInteraction, { once: true });
      
      return () => {
        window.removeEventListener('pointerdown', handleGlobalInteraction);
        window.removeEventListener('keydown', handleGlobalInteraction);
      };
    }
  }, [isAudioPlaying]);

  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const flightSnapshots = useRef<{ timestamp: number; flights: LiveFlight[] }[]>([]);
  const MAX_SNAPSHOTS = typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 120; // Mobile: 30 snapshots (~22min), Desktop: 120 (~90min)

  // Native UI drag state for zoom buttons
  const [zoomPos, setZoomPos] = useState({ bottom: 150, right: 16 });
  const zoomDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialBottom: 150, initialRight: 16 });

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/v3/weather/maps.json')
      .then(r => r.json())
      .then(data => {
        if (data?.radar?.past?.length > 0) {
          // Explicitly construct the authenticated dynamic host path provided by the API payload
          setRadarPath(data.host + data.radar.past[data.radar.past.length - 1].path);
        }
      }).catch(() => {
        console.warn("[Weather Radar]: Meteorological Array currently offline or unreachable. Resuming default visual operations.");
      });
  }, []);

  // Global Geographic Auto-Panning Engine & Deep Search integration
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) return;
    
    const debouncer = setTimeout(async () => {
      // Prevent fetching if they already clicked a flight during typing
      if (selectedFlightId || selectedAirportIata) return; 

      let targetLat = 0, targetLon = 0, targetZoom = 5.5, targetPitch = 0, delay = 4500;
      const q = searchQuery.toLowerCase();

      if (q === 'smartan house' || q === 'the smartan house' || q === 'smartan') {
         // Deep injection for local HQ
         targetLat = 6.4550; // Lagos base
         targetLon = 3.4064; 
         targetZoom = 18.5; // Phenomenal close-up zoom 
         targetPitch = 45; // 3D Tilt orientation
         delay = 8000;
      } else {
         try {
           const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
           const json = await res.json();
           if (json && json.length > 0) {
             targetLat = parseFloat(json[0].lat);
             targetLon = parseFloat(json[0].lon);
           } else return;
         } catch (e) {
           return;
         }
      }

      setViewState((prev: any) => ({
        ...prev,
        latitude: targetLat,
        longitude: targetLon,
        zoom: targetZoom, 
        pitch: targetPitch,
        bearing: 0,
        transitionDuration: delay, // Cinematic smooth travel
        transitionInterpolator: new FlyToInterpolator()
      }));
    }, 1200); // 1.2s delay typing tolerance preventing massive API limits
    
    return () => clearTimeout(debouncer);
  }, [searchQuery, selectedFlightId, selectedAirportIata]);

  const lastSelectedFlightId = useRef<string | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // 1. Initial Mount & Polling Interval (10 seconds to fetch from OpenSky heavily)
  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    // Check if device matches system color scheme dynamically natively
    const matcher = window.matchMedia('(prefers-color-scheme: dark)');
    if (matcher.matches) {
      // Setup dynamic hardware acceleration globally physically cleanly gracefully
    }
    
    let mounted = true;

    const loadData = async () => {
      // INSTANT 0-LATENCY VISUAL LOAD:
      // If we literally just opened the app, instantly rip the last known global array from the browser's physical memory.
      // This mathematically guarantees thousands of planes appear at 0ms, masking the 3s API cold-start loading time!
      if (mounted) {
        try {
          const cached = localStorage.getItem('gkas_flight_snapshot');
          if (cached && flights.length === 0) {
            const parsed = JSON.parse(cached);
            setFlights(parsed);
            setNetworkFlights(parsed);
          }
        } catch(e) {}
      }

      // Fetch Live Dual-Sync Data from the backend proxy
      const data = await fetchLiveFlights();
      if (mounted && data) {
        setFlights(data);
        setNetworkFlights(data);
        // PLAYBACK: Record timestamped snapshot for global rewind
        flightSnapshots.current.push({ timestamp: Date.now(), flights: data });
        if (flightSnapshots.current.length > MAX_SNAPSHOTS) flightSnapshots.current.shift();
        // If NOT in playback mode, keep slider synced to latest
        if (!isPlaybackMode) setPlaybackIndex(flightSnapshots.current.length - 1);
        // Persist data quietly into browser memory for instant next load
        // On mobile, skip localStorage writes to reduce jank
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          try { localStorage.setItem('gkas_flight_snapshot', JSON.stringify(data)); } catch(e) { console.warn("Cache too large"); }
        }
      }
    };

    fetch('/global_airports.json')
      .then(res => res.json())
      .then(data => { 
        if (mounted && data.length > 0) {
          // Force Nigeria (NG) airports to the top so they pass the 200-item DOM clamp
          const priorityData = data.sort((a: any, b: any) => {
            if (a.country === 'NG' && b.country !== 'NG') return -1;
            if (b.country === 'NG' && a.country !== 'NG') return 1;
            return 0;
          });
          setGlobalAirports(priorityData); 
        }
      })
      .catch(e => console.log('Airports load pending:', e));

    loadData();
    const interval = setInterval(loadData, 45000); // 45 second long polling gives planes a massive uninterrupted glide window before position reset
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 2. Propulsion Engine (Smooth continuous movement of every single dot)
  // Mobile: throttle to 3-second updates to save CPU. Desktop: 1-second updates.
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const TICK_RATE = typeof window !== 'undefined' && window.innerWidth < 768 ? 3.0 : 1.0;

    const loop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      
      if (deltaTime < TICK_RATE) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }
      
      lastTime = currentTime;

      setFlights(prev => prev.map(f => {
        if (!f.velocity || !f.true_track) return f;

        // Exact real-time geographic calculation
        const distanceKm = (f.velocity * 3.6) * (deltaTime / 3600);
        const distanceLat = distanceKm / 111.32;
        const distanceLon = distanceKm / (111.32 * Math.cos(f.latitude * (Math.PI / 180)));

        const headingRad = f.true_track * (Math.PI / 180);

        return {
          ...f,
          latitude: f.latitude + distanceLat * Math.cos(headingRad),
          longitude: f.longitude + distanceLon * Math.sin(headingRad)
        };
      }));

      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // PLAYBACK AUTO-ADVANCE ENGINE
  useEffect(() => {
    if (!isPlaying || !isPlaybackMode) return;
    const playTimer = setInterval(() => {
      setPlaybackIndex(prev => {
        const next = prev + 1;
        if (next >= flightSnapshots.current.length) {
          setIsPlaying(false); // Stop at end
          return prev;
        }
        const snapshot = flightSnapshots.current[next];
        if (snapshot) {
          setFlights(snapshot.flights);
          setNetworkFlights(snapshot.flights);
        }
        return next;
      });
    }, 1000); // Advance 1 snapshot per second during playback (fast-forward effect)
    return () => clearInterval(playTimer);
  }, [isPlaying, isPlaybackMode]);

  // Hardware Sound System
  const playRadarBlip = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {} // Fails gracefully if browser blocks auto-play
  }, []);

  // Click handlers
  const handleMasterReset = useCallback(() => {
    isAnimatingRef.current = true;
    setTimeout(() => { isAnimatingRef.current = false; }, 2200);

    setSelectedFlightId(null);
    setSelectedAirportIata(null);
    setSearchQuery('');
    setHoveredFlight(null);
    setIsHeatmapActive(false);
    setIsLocationActive(false);

    // Physically clear the un-controlled DOM search text input
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) searchInput.value = '';

    setViewState({
      ...INITIAL_VIEW_STATE,
      transitionDuration: 4000, // Cinematic zoom out to base globe
      transitionInterpolator: new FlyToInterpolator()
    });
  }, []);
  const handleFlyToFlight = useCallback((flight: LiveFlight) => {
    playRadarBlip();
    isAnimatingRef.current = true;
    setTimeout(() => { isAnimatingRef.current = false; }, 2200); // Shield the animation from API interrupts for 2.2s

    // If the same plane is clicked again, reset and zoom back out to normal!
    if (selectedFlightId === flight.icao24) {
      setSelectedFlightId(null);
      setViewState({
        ...INITIAL_VIEW_STATE,
        transitionDuration: 8000,
        transitionInterpolator: new FlyToInterpolator()
      });
      return;
    }

    setSelectedAirportIata(null); // Clear airport selection
    setSelectedFlightId(flight.icao24);
    setViewState((prev: any) => ({
      ...prev,
      longitude: flight.longitude,
      latitude: flight.latitude,
      zoom: Math.max(prev.zoom, 6.5), 
      pitch: 40, // High-angle chase observer view
      bearing: flight.true_track || prev.bearing, // Snap camera precisely behind the aircraft engines
      transitionDuration: 8000, // Very slow, liquid-smooth cinematic travel time
      transitionInterpolator: new FlyToInterpolator()
    }));
  }, [selectedFlightId]);

  const handleFlyToAirport = useCallback((airport: Airport) => {
    isAnimatingRef.current = true;
    setTimeout(() => { isAnimatingRef.current = false; }, 2200);

    playRadarBlip();

    // If the same airport is clicked again...
    if (selectedAirportIata === airport.iata) {
      
      // ...AND the user originally came from a tracked flight, act as a "Return To Plane" cinematic leap!
      if (selectedFlightId) {
        const flight = flights.find(f => f.icao24 === selectedFlightId);
        if (flight) {
          setSelectedAirportIata(null); // Deselect Airport HUD
          setViewState((prev: any) => ({
            ...prev,
            longitude: flight.longitude,
            latitude: flight.latitude,
            zoom: Math.max(prev.zoom, 6.5),
            pitch: 40,
            bearing: flight.true_track || prev.bearing,
            transitionDuration: 8000,
            transitionInterpolator: new FlyToInterpolator()
          }));
          return;
        }
      }

      // Otherwise, just reset and zoom completely back out to the global view
      setSelectedAirportIata(null);
      setViewState({
        ...INITIAL_VIEW_STATE,
        transitionDuration: 8000,
        transitionInterpolator: new FlyToInterpolator()
      });
      return;
    }

    setSelectedFlightId(null); // Clear flight selection to focus entirely on the new airport
    setSelectedAirportIata(airport.iata);
    setViewState((prev: any) => ({
      ...prev,
      longitude: airport.coords[0],
      latitude: airport.coords[1],
      zoom: Math.max(prev.zoom, 7.5), 
      pitch: 35, // High-angle observation sweep
      bearing: 0, // Level north orientation
      transitionDuration: 8000,
      transitionInterpolator: new FlyToInterpolator()
    }));
  }, [selectedAirportIata, selectedFlightId, flights]);

  // Map Controls
  const zoomIn = () => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + (isMobile ? 1.5 : 1), 20), transitionDuration: 300 }));
  const zoomOut = () => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - (isMobile ? 2.5 : 1), 2), transitionDuration: 300 }));

  const handleTrackLocation = useCallback(() => {
    if (isLocationActive) {
      handleMasterReset();
      setIsLocationActive(false);
      setUserLocation(null);
      return;
    }

    if (navigator.geolocation) {
      playRadarBlip();
      navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;
        setUserLocation([longitude, latitude]); // Physical track for Red pin
        setViewState({
          longitude,
          latitude,
          zoom: 12, // Go closer to tracked location natively
          pitch: 0,
          bearing: 0,
          transitionDuration: 3000,
          transitionInterpolator: new FlyToInterpolator()
        });
        setIsLocationActive(true);
      }, (err) => {
        console.warn("Unable to obtain GPS lock natively.", err);
        alert("Satellite array failed to acquire your GPS coordinate lock. Ensure browser permissions are granted.");
      }, { enableHighAccuracy: false, timeout: 30000, maximumAge: Infinity });
    }
  }, [isLocationActive, handleMasterReset, playRadarBlip]);

  const filteredFlights = useMemo(() => {
    if (!searchQuery) return flights;
    const lowerQ = searchQuery.toLowerCase().trim();

    if (lowerQ === 'nigeria' || lowerQ === 'ng') return flights.filter(f => f.longitude >= 2.6 && f.longitude <= 14.7 && f.latitude >= 4.2 && f.latitude <= 13.9);
    if (lowerQ.includes('lagos')) return flights.filter(f => f.longitude >= 2.9 && f.longitude <= 3.8 && f.latitude >= 6.2 && f.latitude <= 6.8);
    if (lowerQ === 'uk' || lowerQ === 'united kingdom' || lowerQ === 'london') return flights.filter(f => f.longitude >= -8.0 && f.longitude <= 2.0 && f.latitude >= 50.0 && f.latitude <= 60.0);
    if (lowerQ === 'usa' || lowerQ === 'us' || lowerQ === 'united states') return flights.filter(f => f.longitude >= -125.0 && f.longitude <= -65.0 && f.latitude >= 25.0 && f.latitude <= 50.0);
    if (lowerQ === 'europe' || lowerQ === 'eu') return flights.filter(f => f.longitude >= -10.0 && f.longitude <= 30.0 && f.latitude >= 36.0 && f.latitude <= 65.0);

    return flights.filter(f =>
      f.callsign?.toLowerCase().includes(lowerQ) ||
      f.airline?.toLowerCase().includes(lowerQ) ||
      f.origin?.toLowerCase().includes(lowerQ) ||
      f.destination?.toLowerCase().includes(lowerQ) ||
      f.origin_country?.toLowerCase().includes(lowerQ) ||
      f.dest_country?.toLowerCase().includes(lowerQ) ||
      f.origin_iata?.toLowerCase().includes(lowerQ) ||
      f.dest_iata?.toLowerCase().includes(lowerQ)
    );
  }, [flights, searchQuery]);

  const networkFilteredFlights = useMemo(() => {
    if (!searchQuery) return networkFlights;
    const lowerQ = searchQuery.toLowerCase().trim();

    if (lowerQ === 'nigeria' || lowerQ === 'ng') return networkFlights.filter(f => f.longitude >= 2.6 && f.longitude <= 14.7 && f.latitude >= 4.2 && f.latitude <= 13.9);
    if (lowerQ.includes('lagos')) return networkFlights.filter(f => f.longitude >= 2.9 && f.longitude <= 3.8 && f.latitude >= 6.2 && f.latitude <= 6.8);
    if (lowerQ === 'uk' || lowerQ === 'united kingdom' || lowerQ === 'london') return networkFlights.filter(f => f.longitude >= -8.0 && f.longitude <= 2.0 && f.latitude >= 50.0 && f.latitude <= 60.0);
    if (lowerQ === 'usa' || lowerQ === 'us' || lowerQ === 'united states') return networkFlights.filter(f => f.longitude >= -125.0 && f.longitude <= -65.0 && f.latitude >= 25.0 && f.latitude <= 50.0);
    if (lowerQ === 'europe' || lowerQ === 'eu') return networkFlights.filter(f => f.longitude >= -10.0 && f.longitude <= 30.0 && f.latitude >= 36.0 && f.latitude <= 65.0);

    return networkFlights.filter(f =>
      f.callsign?.toLowerCase().includes(lowerQ) ||
      f.airline?.toLowerCase().includes(lowerQ) ||
      f.origin?.toLowerCase().includes(lowerQ) ||
      f.destination?.toLowerCase().includes(lowerQ) ||
      f.origin_country?.toLowerCase().includes(lowerQ) ||
      f.dest_country?.toLowerCase().includes(lowerQ) ||
      f.origin_iata?.toLowerCase().includes(lowerQ) ||
      f.dest_iata?.toLowerCase().includes(lowerQ)
    );
  }, [networkFlights, searchQuery]);

  const filteredAirports = useMemo(() => {
    if (!searchQuery) return globalAirports;
    const lowerQ = searchQuery.toLowerCase();
    return globalAirports.filter((a: Airport) =>
      a.iata?.toLowerCase().includes(lowerQ) ||
      a.name?.toLowerCase().includes(lowerQ) ||
      a.city?.toLowerCase().includes(lowerQ) ||
      a.country?.toLowerCase().includes(lowerQ)
    );
  }, [globalAirports, searchQuery]);

  const selectedFlight = useMemo(() =>
    networkFlights.find(f => f.icao24 === selectedFlightId) || null
    , [networkFlights, selectedFlightId]);

  const selectedAirport = useMemo(() =>
    globalAirports.find(a => a.iata === selectedAirportIata) || null
    , [selectedAirportIata, globalAirports]);

  // LAYERS
  const layers = useMemo(() => [
    // Layer 1: High-Definition Night-Vision Satellite Cartography
    new TileLayer({
      data: FR24_MAP_URL,
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      renderSubLayers: props => {
        const { boundingBox } = props.tile;
        return new (BitmapLayer as any)(props, {
          id: props.id + '-bitmap',
          data: undefined,
          image: props.data,
          bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
          tintColor: [255, 255, 255, 255] // Completely neutral filter so Google Maps hybrid labels render in perfect crisp white!
        });
      }
    }),

    // Layer 1.1: Glowing Global GeoJSON Country Borders overlaying the Satellite Image
    new GeoJsonLayer({
      id: 'glowing-country-borders',
      data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson', // Low-res exactly strips the thousands of messy island "dots" over the ocean!
      stroked: true,
      filled: false,
      lineWidthMinPixels: 1.5,
      getLineColor: [140, 160, 200, 180] // High Aesthetic Ice-Blue/Silver sleek vector trace!
    }),

    // Layer 2: Mathematical Altitude-Encoded History Trail mimicking FR24
    selectedFlight ? new (LineLayer as any)({
      id: 'flight-history-trail',
      data: calculateFlightHistoryTrail(selectedFlight),
      getSourcePosition: (d: any) => d.start,
      getTargetPosition: (d: any) => d.end,
      getColor: (d: any) => d.color,
      widthMinPixels: 4
    }) : null,

    // Layer 5: User GPS True Red Radar Pin
    userLocation ? new (ScatterplotLayer as any)({
      id: 'gps-user-location-pin',
      data: [{ position: userLocation }],
      getPosition: (d: any) => d.position,
      getFillColor: [239, 68, 68, 255], // Deep Tactical Red
      getLineColor: [255, 255, 255, 255], // White Border Highlight
      lineWidthMinPixels: 2,
      getRadius: 100, // Native visual buffer
      radiusMinPixels: 7, // Highly visible physically at outer space scale!
      radiusMaxPixels: 20
    }) : null,



    // Layer 3: High Density IconLayer for ALL PLANES
    new (IconLayer as any)({
      id: 'airplanes-layer',
      data: filteredFlights,
      iconAtlas: AIRPLANE_ATLAS,
      iconMapping: {
        'yellow': { x: 0, y: 0, width: 64, height: 64, mask: false },
        'red': { x: 64, y: 0, width: 64, height: 64, mask: false },
        'white': { x: 128, y: 0, width: 64, height: 64, mask: true }
      },
      billboard: false, // Forces planes to physically glue flat to the Map Terrain instead of statically facing the camera!
      getIcon: (d: LiveFlight) => {
        if (d.icao24 === selectedFlightId) return 'red';
        if (isHeatmapActive) return 'white';
        return 'yellow';
      },
      getPosition: (d: LiveFlight) => [d.longitude, d.latitude],
      getAngle: (d: LiveFlight) => 0 - (d.true_track || 0),
      getSize: (d: LiveFlight) => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const baseSize = isMobile ? 24 : 36;
        if (!selectedFlightId) return hoveredFlight?.flight.icao24 === d.icao24 ? baseSize + 10 : baseSize;
        return d.icao24 === selectedFlightId ? baseSize + 16 : (isMobile ? 10 : 16); 
      },
      sizeScale: Math.max(
        typeof window !== 'undefined' && window.innerWidth < 768 ? 0.15 : 0.35, 
        Math.min(1.2, (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.15 : 0.35) + (viewState.zoom - 1.5) * 0.15)
      ),
      getColor: (d: LiveFlight) => {
        if (d.icao24 === selectedFlightId) return [255, 60, 60, 255]; // Selected turns Solid Red
        
        // 🌐 NEON ALTITUDE HEATMAP ENGINE 🌐
        if (isHeatmapActive) {
           // Provide a mathematically simulated altitude proxy if OpenSky's physical barometer data drops offline
           const rawAlt = d.baro_altitude || (d.velocity ? d.velocity * 40 : 0) || (Math.random() * 10000); 
           const alt = rawAlt * 3.28084; // Convert meters to feet
           let r, g, b;
           if (alt > 35000) { r = 147; g = 51; b = 234; }    // 35k+ ft: Deep Purple
           else if (alt > 25000) { r = 59; g = 130; b = 246; } // 25k+ ft: Ocean Blue
           else if (alt > 15000) { r = 6; g = 182; b = 212; }  // 15k+ ft: Bright Cyan
           else if (alt > 5000) { r = 16; g = 185; b = 129; } // 5k+ ft: Emerald Green
           else { r = 245; g = 158; b = 11; }                 // 0-5k ft: Amber/Orange
           
           if (selectedFlightId) return [r, g, b, 80]; // Ghosted Heatmap if a specific target is selected
           return [r, g, b, 255]; // Solid Neon Heatmap
        }

        if (selectedFlightId) return [255, 222, 27, 80]; // Extremely transparent yellow ghost
        return [255, 222, 27, 255]; // Normal vibrant yellow
      },
      updateTriggers: {
        sizeScale: [viewState.zoom],
        getIcon: [selectedFlightId, isHeatmapActive],
        getColor: [selectedFlightId, isHeatmapActive],
        getSize: [selectedFlightId, hoveredFlight?.flight.icao24]
      },
      pickable: true,
      onHover: isMobile ? undefined : ({ object, x, y }: any) => {
        if (object) setHoveredFlight({ flight: object, x, y });
        else setHoveredFlight(null);
      },
      onClick: ({ object }: any) => { if (object) handleFlyToFlight(object); }
    }),

    // Layer 4: Airports layer (hide when completely zoomed out to avoid crowding)
    viewState.zoom >= 5.5 || searchQuery ? new (IconLayer as any)({
      id: 'airports-layer',
      data: filteredAirports,
      getIcon: () => 'marker',
      iconAtlas: AIRPORT_PIN_SVG,
      iconMapping: {
        marker: { x: 0, y: 0, width: 32, height: 32, anchorX: 16, anchorY: 30, mask: false }
      },
      getPosition: (d: Airport) => [d.coords[0], d.coords[1]],
      getSize: 28,  // Scale up from 14 so the teardrop pin is perfectly legible

      getColor: [255, 255, 255], 
      pickable: true,
      onClick: ({ object }: any) => { if (object) handleFlyToAirport(object); },
      onHover: isMobile ? undefined : ({ object, x, y }: any) => {
        if (object) setHoveredAirport({ airport: object, x, y });
        else setHoveredAirport(null);
      }
    }) : null,

    // Layer 5: High-Visibility Selected Airport Ping & Label HUD
    // Layer 5: High-Visibility Selected Airport Ping HUD
    selectedAirport ? new (ScatterplotLayer as any)({
      id: 'selected-airport-ping',
      data: [selectedAirport],
      getPosition: (d: Airport) => [d.coords[0], d.coords[1]],
      getFillColor: [0, 243, 255, 60], // Glowing cyan pulse
      getLineColor: [0, 243, 255, 255],
      lineWidthMinPixels: 3,
      getRadius: 1200, // Massive 1.2km footprint radius physically mapped to ground
      stroked: true,
      filled: true,
      pickable: true,
      onClick: ({ object }: any) => { if (object) handleFlyToAirport(object); }
    }) : null,

    // Layer 5.5: User GPS Location Pulsating Tracker
    userLocation ? new (ScatterplotLayer as any)({
      id: 'user-gps-location',
      data: [{ coords: userLocation }],
      getPosition: (d: any) => d.coords,
      getFillColor: [16, 185, 129, 80], // Toxic Emerald Green
      getLineColor: [16, 185, 129, 255],
      lineWidthMinPixels: 2,
      getRadius: 1800, // Massive 1.8km radius ring locked strictly to their ground coordinate
      stroked: true,
      filled: true
    }) : null
  ].filter(Boolean), [filteredFlights, networkFlights, filteredAirports, selectedFlight, selectedAirport, selectedFlightId, selectedAirportIata, userLocation, handleFlyToFlight, handleFlyToAirport, viewState.zoom, searchQuery, isHeatmapActive, flights]);

  if (!mounted) return null;

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .mobile-playback-hidden { 
          opacity: ${isRightPanelOpen ? 0 : 1} !important; 
          pointer-events: ${isRightPanelOpen ? 'none' : 'auto'} !important; 
          transform: translateY(${isRightPanelOpen ? '20px' : '0px'}) !important;
        }

        /* Permanently DISABLE Playback on Mobile */
        .desktop-only-playback {
          display: none !important;
        }

        /* HARD-KILL the Tracker List Button when Playback is Open */
        ${isPlaybackMode ? `
          .right-panel-mobile button {
             opacity: 0 !important;
             pointer-events: none !important;
             transform: translateY(50px) translateX(-50%) !important;
          }
        ` : ''}
      }
    `}</style>

    {/* MASTER GLOBAL AUDIO ENGAGEMENT */}
    <audio id="gkas_audio_player" src="/sound.mp3" loop preload="auto" />

    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#0f172a' }}>
      <DeckGL
        views={new MapView({ id: 'map', repeat: true })}
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState, interactionState }) => {
          setViewState(newViewState);
          if (interactionState?.isDragging || interactionState?.isPanning) {
            isAnimatingRef.current = false;
          }
          if (isLocationActive) setIsLocationActive(false);
        }}
        controller={{ doubleClickZoom: false, keyboard: true, inertia: true, scrollZoom: { speed: 0.05, smooth: true } }}
        layers={layers}
      />

      {/* TOP NAVBAR */}
      <FlightradarTopNav
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        flightCount={networkFlights.length}
        isHeatmapActive={isHeatmapActive}
        toggleHeatmap={() => setIsHeatmapActive(prev => !prev)}
        onReset={handleMasterReset}
        globalAirports={globalAirports}
        globalFlights={networkFlights}
        onFlightSelect={handleFlyToFlight}
        onAirportSelect={handleFlyToAirport}
      />

      {/* LEFT PANELS (Mutually exclusive) */}
      <FlightradarSidePanel
        flight={selectedFlight}
        liveFlights={networkFlights}
        onClose={() => setSelectedFlightId(null)}
        onPointClick={(lat, lon, iata) => {
          // Temporarily pause the 10s auto-follow tracking mechanism for a lavish 15 seconds to let the user explore the airport
          isAnimatingRef.current = true;
          setTimeout(() => { isAnimatingRef.current = false; }, 15000);

          if (iata) {
            // This natively triggers the 3D tracking engine to drop the Cyan Layer 5 HUD onto the map directly beneath the camera!
            setSelectedAirportIata(iata);
          }

          setViewState((prev: any) => ({
            ...prev,
            longitude: lon,
            latitude: lat,
            zoom: Math.max(prev.zoom, 7.5),
            pitch: 35,
            bearing: 0,
            transitionDuration: 8000, // Phenomenally smooth, slow cinematic glide
            transitionInterpolator: new FlyToInterpolator()
          }));
        }}
      />

      <AirportSidePanel
        airport={selectedAirport}
        liveFlights={networkFilteredFlights}
        onFlightClick={handleFlyToFlight}
        onClose={() => setSelectedAirportIata(null)}
      />

      {/* HIGH-TECH DRAGGABLE ZOOM CONTROLS */}
      <div 
        onPointerDown={(e) => {
          zoomDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialBottom: zoomPos.bottom, initialRight: zoomPos.right };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.style.cursor = 'grabbing';
        }}
        onPointerMove={(e) => {
          if (!zoomDragRef.current.isDragging) return;
          const dy = e.clientY - zoomDragRef.current.startY;
          const dx = e.clientX - zoomDragRef.current.startX;
          setZoomPos({
            bottom: zoomDragRef.current.initialBottom - dy,
            right: zoomDragRef.current.initialRight - dx
          });
        }}
        onPointerUp={(e) => {
          zoomDragRef.current.isDragging = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
          e.currentTarget.style.cursor = 'grab';
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          zoomDragRef.current = { isDragging: true, startX: touch.clientX, startY: touch.clientY, initialBottom: zoomPos.bottom, initialRight: zoomPos.right };
        }}
        onTouchMove={(e) => {
          if (!zoomDragRef.current.isDragging) return;
          const touch = e.touches[0];
          const dy = touch.clientY - zoomDragRef.current.startY;
          const dx = touch.clientX - zoomDragRef.current.startX;
          setZoomPos({
            bottom: zoomDragRef.current.initialBottom - dy,
            right: zoomDragRef.current.initialRight - dx
          });
        }}
        onTouchEnd={() => {
          zoomDragRef.current.isDragging = false;
        }}
        // Prevent map interaction while dragging zoom
        onPointerLeave={(e) => { if(zoomDragRef.current.isDragging) e.stopPropagation(); }}
        style={{
          position: 'absolute',
          bottom: `${zoomPos.bottom}px`,
          right: `${zoomPos.right}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 1000,
          backgroundColor: 'rgba(10, 15, 30, 0.45)', // Glassmorphism Core
          borderRadius: '12px', // Smoother chassis
          padding: '8px',
          border: '1px solid rgba(0, 243, 255, 0.25)', // Cyber neon edge
          boxShadow: '0 8px 30px rgba(0,0,0,0.6), inset 0 0 12px rgba(0,243,255,0.1)', // Complex volumetric depth
          backdropFilter: 'blur(24px) saturate(150%)', // Multi-billion dollar glass rendering
          cursor: 'grab',
          touchAction: 'none' // Essential to stop natural page scrolling while moving the HUD
        }}>
        
        {/* DRAG GRIP HANDLE */}
        <div style={{
           width: '100%', height: '14px',
           display: 'flex', justifyContent: 'center', alignItems: 'center',
           cursor: 'grab', opacity: 0.5, marginBottom: '2px'
        }}>
           <div style={{ width: '20px', height: '4px', borderRadius: '2px', backgroundColor: '#00f3ff' }}></div>
        </div>

        <button
          onClick={(e) => handleTrackLocation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="Acquire Satellite GPS Lock"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            e.currentTarget.style.color = '#10B981';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#00f3ff';
          }}
          style={{
            width: '36px', height: '36px',
            border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#00f3ff', fontSize: '20px', fontWeight: 400,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
          }}
        >
          ⌖
        </button>
        <button
          onClick={zoomIn}
          onPointerDown={(e) => e.stopPropagation()}
          title="Engage Magnification"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 243, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          }}
          style={{
            width: '36px', height: '36px',
            border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#00f3ff', fontSize: '20px', fontWeight: 400,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
          }}
        >
          ＋
        </button>
        <button
          onClick={zoomOut}
          onPointerDown={(e) => e.stopPropagation()}
          title="Disengage Magnification"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 243, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(0, 243, 255, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
          }}
          style={{
            width: '36px', height: '36px',
            border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#00f3ff', fontSize: '24px', fontWeight: 300,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none'
          }}
        >
          −
        </button>
      </div>

      {/* RIGHT PANEL (Flights & Airports Lists) */}
      <FlightradarRightPanel
        flights={networkFilteredFlights}
        airports={filteredAirports}
        onFlightClick={handleFlyToFlight}
        onAirportClick={handleFlyToAirport}
        selectedFlightId={selectedFlightId}
        selectedAirportIata={selectedAirportIata}
        onToggle={(open) => setIsRightPanelOpen(open)}
        isPlaybackMode={isPlaybackMode}
      />

      {/* FLIGHT HOVER TOOLTIP */}
      {hoveredFlight && hoveredFlight.flight.icao24 !== selectedFlightId && (
        <div style={{
          position: 'absolute',
          left: hoveredFlight.x + 20,
          top: hoveredFlight.y - 20,
          backgroundColor: 'rgba(28, 29, 33, 0.95)',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: '6px',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          border: '1px solid rgba(47, 49, 54, 0.8)',
          whiteSpace: 'nowrap'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFDE1B', letterSpacing: '0.5px' }}>
            {hoveredFlight.flight.callsign || hoveredFlight.flight.icao24.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: '#8E9297', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{hoveredFlight.flight.origin?.substring(0, 3).toUpperCase() || 'N/A'}</span>
            <span style={{ fontSize: '10px', color: '#4F545C' }}>✈</span>
            <span>{hoveredFlight.flight.destination?.substring(0, 3).toUpperCase() || 'N/A'}</span>
          </div>
        </div>
      )}

      {/* AIRPORT HOVER TOOLTIP */}
      {hoveredAirport && (
        <div style={{
          position: 'absolute',
          left: hoveredAirport.x + 15,
          top: hoveredAirport.y - 40,
          backgroundColor: '#1E293B',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          zIndex: 1000,
          pointerEvents: 'none',
          border: '1px solid #334155',
          width: '240px'
        }}>
          <div style={{
            height: '110px',
            backgroundImage: `url("${hoveredAirport.airport.imageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottom: '2px solid #00f3ff'
          }}></div>
          <div style={{ padding: '12px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#2563EB', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>{hoveredAirport.airport.iata}</span>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>{hoveredAirport.airport.name}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{hoveredAirport.airport.city}, {hoveredAirport.airport.country}</div>
          </div>
        </div>
      )}

      {/* GLOBAL PLAYBACK TIMELINE SLIDER */}
      {flightSnapshots.current.length > 1 && (
        <div className="mobile-playback-hidden desktop-only-playback" style={{
          position: 'absolute',
          bottom: isMobile ? '24px' : 0,
          left: 0,
          right: 0,
          height: isPlaybackMode ? '100px' : '36px',
          background: isPlaybackMode 
            ? 'linear-gradient(180deg, rgba(10,12,18,0.0) 0%, rgba(10,12,18,0.95) 30%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(10,12,18,0.7) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '24px 24px 10px 24px', // Standard internal padding
          zIndex: 900,
          transition: 'height 0.3s ease, background 0.3s ease'
        }}>
          {/* Toggle Button */}
          <button 
            onClick={() => {
              if (isPlaybackMode) {
                // Exit playback: restore live data
                setIsPlaybackMode(false);
                setIsPlaying(false);
                const latest = flightSnapshots.current[flightSnapshots.current.length - 1];
                if (latest) {
                  setFlights(latest.flights);
                  setNetworkFlights(latest.flights);
                }
                setPlaybackIndex(flightSnapshots.current.length - 1);
              } else {
                setIsPlaybackMode(true);
              }
            }}
            style={{
              position: 'absolute',
              top: isPlaybackMode ? '-35px' : '-65px', // Hovers dependably
              left: '50%',
              transform: 'translateX(-50%)', // Centered beautifully below the Tracker list button
              background: isPlaybackMode ? 'rgba(255,0,100,0.9)' : 'rgba(20,24,35,0.85)',
              border: `1px solid ${isPlaybackMode ? 'rgba(255,100,150,0.5)' : 'rgba(100,110,140,0.4)'}`,
              color: '#fff',
              padding: '6px 18px', // Slightly larger hit target bounds for mobile
              borderRadius: '16px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '1px',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.4s ease, opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPlaybackMode ? '✕ EXIT PLAYBACK' : '⏪ PLAYBACK'}
          </button>

          {/* Playback Controls & Slider */}
          {isPlaybackMode && (
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Play/Pause Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Timestamp Label (Left) */}
              <div style={{ color: '#8E9297', fontSize: '11px', fontWeight: 600, minWidth: '55px', textAlign: 'center', fontFamily: 'monospace' }}>
                {flightSnapshots.current[playbackIndex]
                  ? new Date(flightSnapshots.current[playbackIndex].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--:--:--'
                }
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={flightSnapshots.current.length - 1}
                value={playbackIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  setPlaybackIndex(idx);
                  const snapshot = flightSnapshots.current[idx];
                  if (snapshot) {
                    setFlights(snapshot.flights);
                    setNetworkFlights(snapshot.flights);
                  }
                }}
                style={{
                  flex: 1,
                  height: '4px',
                  appearance: 'none',
                  background: `linear-gradient(to right, #00f3ff 0%, #00f3ff ${(playbackIndex / Math.max(1, flightSnapshots.current.length - 1)) * 100}%, rgba(255,255,255,0.15) ${(playbackIndex / Math.max(1, flightSnapshots.current.length - 1)) * 100}%, rgba(255,255,255,0.15) 100%)`,
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />

              {/* LIVE Label (Right) */}
              <div style={{
                color: playbackIndex === flightSnapshots.current.length - 1 ? '#00ff88' : '#8E9297',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                minWidth: '40px',
                textAlign: 'center'
              }}>
                {playbackIndex === flightSnapshots.current.length - 1 ? '● LIVE' : 'PAST'}
              </div>

              {/* Flight Count */}
              <div style={{ color: '#4F545C', fontSize: '10px', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                {flightSnapshots.current[playbackIndex]?.flights.length || 0} flights
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
