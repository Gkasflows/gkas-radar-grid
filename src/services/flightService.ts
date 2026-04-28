export interface LiveFlight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  baro_altitude: number;
  velocity: number;
  true_track: number;
  vertical_rate: number;
  on_ground?: boolean;
  squawk?: string;
  category: number;
  type: string;
  model: string;
  imageUrl: string;
  passengers: number;
  capacity: number;
  airline: string;
  origin: string;
  origin_iata: string;
  origin_airport: string;
  origin_coords: { lat: number, lon: number };
  destination: string;
  dest_iata: string;
  dest_airport: string;
  dest_coords: { lat: number, lon: number };
  dest_country: string;
}

const OPENSKY_URL = '/api/flights';

// CLIENT-SIDE PERSISTENCE: Keep the last successful response in memory.
// If the API fails (network error, 429, server restart), we show the last data instead of going blank.
let lastSuccessfulFlights: LiveFlight[] = [];

// Deterministic hashing for stable metadata
const getStableValue = (icao: string, list: string[]): string => {
  let hash = 0;
  for (let i = 0; i < icao.length; i++) {
    hash = (hash << 5) - hash + icao.charCodeAt(i);
    hash |= 0;
  }
  return list[Math.abs(hash) % list.length];
};

const AIRLINES = ['Air Peace', 'Arik Air', 'Ibom Air', 'Dana Air', 'ValueJet', 'United Airlines', 'Lufthansa', 'Delta Air Lines', 'Air France', 'Emirates', 'British Airways', 'Qatar Airways', 'American Airlines', 'Singapore Airlines', 'KLM', 'Turkish Airlines'];
const CITIES = [
  { city: 'Lagos', country: 'Nigeria', iata: 'LOS', airport: 'Murtala Muhammed', lat: 6.5774, lon: 3.3223 },
  { city: 'Abuja', country: 'Nigeria', iata: 'ABV', airport: 'Nnamdi Azikiwe', lat: 9.0068, lon: 7.2631 },
  { city: 'Port Harcourt', country: 'Nigeria', iata: 'PHC', airport: 'Port Harcourt Int.', lat: 5.0153, lon: 6.9496 },
  { city: 'London', country: 'United Kingdom', iata: 'LHR', airport: 'Heathrow', lat: 51.4700, lon: -0.4543 },
  { city: 'New York', country: 'USA', iata: 'JFK', airport: 'John F. Kennedy', lat: 40.6413, lon: -73.7781 },
  { city: 'Paris', country: 'France', iata: 'CDG', airport: 'Charles de Gaulle', lat: 49.0097, lon: 2.5479 },
  { city: 'Tokyo', country: 'Japan', iata: 'HND', airport: 'Haneda', lat: 35.5494, lon: 139.7798 },
  { city: 'Dubai', country: 'UAE', iata: 'DXB', airport: 'Dubai Int.', lat: 25.2532, lon: 55.3657 },
  { city: 'Singapore', country: 'Singapore', iata: 'SIN', airport: 'Changi', lat: 1.3644, lon: 103.9915 },
  { city: 'Los Angeles', country: 'USA', iata: 'LAX', airport: 'Los Angeles Int.', lat: 33.9416, lon: -118.4085 },
  { city: 'Frankfurt', country: 'Germany', iata: 'FRA', airport: 'Frankfurt', lat: 50.0379, lon: 8.5622 },
  { city: 'Hong Kong', country: 'China', iata: 'HKG', airport: 'Hong Kong Int.', lat: 22.3080, lon: 113.9185 },
  { city: 'Sydney', country: 'Australia', iata: 'SYD', airport: 'Kingsford Smith', lat: -33.9399, lon: 151.1753 },
  { city: 'Chicago', country: 'USA', iata: 'ORD', airport: 'O\'Hare Int.', lat: 41.9742, lon: -87.9073 },
  { city: 'Amsterdam', country: 'Netherlands', iata: 'AMS', airport: 'Schiphol', lat: 52.3105, lon: 4.7683 },
  { city: 'Istanbul', country: 'Turkey', iata: 'IST', airport: 'Istanbul Int.', lat: 41.2753, lon: 28.7519 },
  { city: 'San Francisco', country: 'USA', iata: 'SFO', airport: 'San Francisco Int.', lat: 37.6213, lon: -122.3790 },
  { city: 'Munich', country: 'Germany', iata: 'MUC', airport: 'Munich Int.', lat: 48.3537, lon: 11.7861 },
  { city: 'Toronto', country: 'Canada', iata: 'YYZ', airport: 'Pearson Int.', lat: 43.6777, lon: -79.6248 }
];

const getAirline = (callsign: string, icao: string): string => {
  const code = callsign.substring(0, 3);
  if (code === 'UAL') return 'United Airlines';
  if (code === 'DLH') return 'Lufthansa';
  if (code === 'DLT') return 'Lufthansa CityLine';
  if (code === 'DAL') return 'Delta Air Lines';
  if (code === 'AFR') return 'Air France';
  if (code === 'BAW') return 'British Airways';
  if (code === 'UAE') return 'Emirates';
  if (code === 'QTR') return 'Qatar Airways';
  if (code === 'KLM') return 'KLM Royal Dutch';
  if (code === 'SWR') return 'Swiss International';
  if (code === 'ANA') return 'All Nippon Airways';
  return getStableValue(icao, AIRLINES);
};

const AIRCRAFT_FLEETS = {
  heavy: [
    { m: 'Boeing 777-300ER', i: '1436491865332-7a61a109cc05' },
    { m: 'Airbus A380-800', i: '1542296332-2e4473faf563' },
    { m: 'Boeing 787-9 Dreamliner', i: '1569154941053-e44520144f84' },
    { m: 'Airbus A350-1000', i: '1551528659-db580b0fb1bb' },
    { m: 'Boeing 747-8 Intercontinental', i: '1556388275-bb558229baba' }
  ],
  commercial: [
    { m: 'Boeing 737 MAX 8', i: '1510410712792-ca99b0c55fbc' },
    { m: 'Airbus A320neo', i: '1513511849755-e7fdf1a3f6ee' },
    { m: 'Boeing 737-800', i: '1479869502010-84c424076bc1' },
    { m: 'Airbus A220-300', i: '1540194419-75a7c299edde' }
  ],
  private: [
    { m: 'Gulfstream G650ER', i: '1501625902095-2c8fe5f6a9e1' },
    { m: 'Bombardier Global 7500', i: '1515904859663-8a16ac5602d1' },
    { m: 'Cessna Citation Longitude', i: '1499694493393-2775f02bc6c6' }
  ]
};

const getModel = (icao: string, list: any[]) => {
  let hash = 0;
  for (let i = 0; i < icao.length; i++) hash = (hash << 5) - hash + icao.charCodeAt(i);
  const item = list[Math.abs(hash) % list.length];
  return {
    model: item.m,
    imageUrl: `https://images.unsplash.com/photo-${item.i}?q=80&w=1000&auto=format&fit=crop`
  };
};

// Map OpenSky category to readable type, specific aircraft chassis, photography, and passenger counts
const mapCategory = (cat: number, icao: string): { type: string, model: string, imageUrl: string, passengers: number, capacity: number } => {
  const getStableNumber = (icao: string, min: number, max: number, seedSuffix = ''): number => {
    let hash = 0;
    const str = icao + seedSuffix;
    for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
    return min + (Math.abs(hash) % (max - min + 1));
  };

  const defaultModel = { model: 'Unknown Chassis', imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000' };

  switch (cat) {
    case 1: return { type: 'No info', ...defaultModel, passengers: 0, capacity: 0 };
    case 2: {
      const cap = getStableNumber(icao, 2, 6, 'cap');
      return { type: 'Light (Private)', ...getModel(icao, AIRCRAFT_FLEETS.private), passengers: getStableNumber(icao, 1, cap, 'pax'), capacity: cap };
    }
    case 3: {
      const cap = getStableNumber(icao, 6, 12, 'cap');
      return { type: 'Small (Private)', ...getModel(icao, AIRCRAFT_FLEETS.private), passengers: getStableNumber(icao, 2, cap, 'pax'), capacity: cap };
    }
    case 4: {
      const cap = getStableNumber(icao, 15, 30, 'cap');
      return { type: 'Large (Private)', ...getModel(icao, AIRCRAFT_FLEETS.private), passengers: getStableNumber(icao, 5, cap, 'pax'), capacity: cap };
    }
    case 5: return { type: 'High Performance', ...getModel(icao, AIRCRAFT_FLEETS.private), passengers: 2, capacity: 2 };
    case 6: {
      const cap = getStableNumber(icao, 160, 220, 'cap');
      return { type: 'Large (Commercial)', ...getModel(icao, AIRCRAFT_FLEETS.commercial), passengers: getStableNumber(icao, 80, cap, 'pax'), capacity: cap };
    }
    case 7: {
      const cap = getStableNumber(icao, 300, 550, 'cap');
      return { type: 'Heavy (Commercial)', ...getModel(icao, AIRCRAFT_FLEETS.heavy), passengers: getStableNumber(icao, 200, cap, 'pax'), capacity: cap };
    }
    case 15: {
      const cap = getStableNumber(icao, 2, 80, 'cap');
      return { type: 'Military', ...getModel(icao, AIRCRAFT_FLEETS.heavy), passengers: getStableNumber(icao, 1, cap, 'pax'), capacity: cap };
    }
    default: {
      const cap = getStableNumber(icao, 150, 200, 'cap');
      return { type: 'Commercial', ...getModel(icao, AIRCRAFT_FLEETS.commercial), passengers: getStableNumber(icao, 100, cap, 'pax'), capacity: cap };
    }
  }
};

export async function fetchLiveFlights(): Promise<LiveFlight[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('API Timeout')), 15000);

  try {
    // DUAL-SOURCE PARALLEL FETCH:
    // 1. Server-side API (FR24 + regional airplanes.live via Vercel)
    // 2. Direct browser-side fetch to airplanes.live /v2/all (bypasses Vercel's 10s serverless limit)
    const [serverResponse, directResponse] = await Promise.all([
      fetch('/api/flights', { signal: controller.signal }).catch(() => null),
      fetch('https://api.airplanes.live/v2/all', { signal: controller.signal }).catch(() => null),
    ]);
    clearTimeout(timeoutId);

    // Process server-side data (FR24 + regional)
    let rawServer: any[] = [];
    if (serverResponse && serverResponse.ok) {
      const data = await serverResponse.json();
      rawServer = data.states || [];
      if (rawServer.length > 0 && Array.isArray(rawServer[0])) {
        rawServer = rawServer.map((s: any[]) => ({
          icao24: s[0], callsign: s[1], origin_country: s[2],
          longitude: s[3], latitude: s[4], baro_altitude: s[5],
          velocity: s[6], true_track: s[7], vertical_rate: s[8], category: s[9]
        }));
      }
    }

    // Process direct airplanes.live global dump (15,000-25,000 planes)
    let rawDirect: any[] = [];
    if (directResponse && directResponse.ok) {
      const directData = await directResponse.json().catch(() => ({ ac: [] }));
      const aircraft = directData.ac || [];
      for (const plane of aircraft) {
        const callsign = plane.flight?.trim();
        if (plane.lat !== undefined && plane.lon !== undefined && callsign) {
          rawDirect.push({
            icao24: String(plane.hex).toLowerCase(),
            callsign: callsign,
            origin_country: 'AIRPLANES_LIVE',
            longitude: plane.lon,
            latitude: plane.lat,
            baro_altitude: (plane.alt_baro === 'ground' ? 0 : (plane.alt_baro || plane.alt_geom || 0)) * 0.3048,
            velocity: (plane.gs || 0) * 0.514444,
            true_track: plane.track || plane.true_heading || plane.mag_heading || 0,
            vertical_rate: (plane.baro_rate || plane.geom_rate || 0) * 0.00508,
            category: 0
          });
        }
      }
    }

    // Merge: direct airplanes.live data first, then server data overwrites (FR24 has richer metadata)
    const mergedRaw = new Map<string, any>();
    for (const s of rawDirect) mergedRaw.set(s.icao24, s);
    for (const s of rawServer) mergedRaw.set(s.icao24, s); // Server data wins on duplicates
    const allRaw = Array.from(mergedRaw.values());

    if (allRaw.length === 0) return lastSuccessfulFlights;

    const flights = allRaw.map((s: any) => {
      const enrichment = mapCategory(s.category || 0, s.icao24);
      
      const originData = getStableValue(s.icao24, CITIES as any) as any;
      let destData = getStableValue(s.icao24 + 'dest', CITIES as any) as any;
      if (originData.city === destData.city) {
        destData = { city: 'Berlin', country: 'Germany', iata: 'BER', airport: 'Brandenburg', lat: 52.3667, lon: 13.5033 };
      }

      return {
        ...s,
        ...enrichment,
        airline: getAirline(s.callsign, s.icao24),
        origin: originData.city,
        origin_iata: originData.iata,
        origin_airport: originData.airport,
        origin_coords: { lat: originData.lat, lon: originData.lon },
        destination: destData.city,
        dest_iata: destData.iata,
        dest_airport: destData.airport,
        dest_coords: { lat: destData.lat, lon: destData.lon },
        origin_country: originData.country,
        dest_country: destData.country
      } as LiveFlight;
    });

    // 🌐 Continuous Retention Vector Merge (CRVM) 🌐
    // OpenSky free API frequently drops random large global regions (e.g. from 12,000 planes dropping randomly to 2,000) 
    // to gracefully rate-limit bandwidth. Instead of planes spontaneously blipping out of existence from the Map,
    // this engine perpetually stitches missing planes dynamically together.
    const persistentMap = new Map<string, LiveFlight>();
    const NOW = Date.now();

    // 1. Load the frozen massive 11,000+ global aircraft grid from the last successful frame
    lastSuccessfulFlights.forEach(f => {
       // Gracefully let planes mathematically fade out from UI if OpenSky fundamentally drops their transponder signals for over 90 seconds (1.5 mins)
       const lastSeen = (f as any)._lastSeen || NOW;
       if (NOW - lastSeen > 90000) return; 
       
       persistentMap.set(f.icao24, f);
    });

    // 2. Aggressively smash the newly-fetched highly-accurate API coordinate updates over them, and immediately sync their seen timer to exactly NOW
    flights.forEach(f => {
       (f as any)._lastSeen = NOW;
       persistentMap.set(f.icao24, f);
    });

    const finalFlights = Array.from(persistentMap.values());

    if (finalFlights.length > 0) {
      lastSuccessfulFlights = finalFlights; 
    }
    return lastSuccessfulFlights;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError' || error.message === 'API Timeout') {
      return lastSuccessfulFlights;
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('FlightService: Network unreachable. Using cache.');
    } else {
      console.error('FlightService Error:', error.message);
    }
    
    return lastSuccessfulFlights; 
  }
}
