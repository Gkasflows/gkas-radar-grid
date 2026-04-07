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
    const response = await fetch('/api/flights', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`FlightService: API error (${response.status}). Returning cached flights.`);
      return lastSuccessfulFlights;
    }
    const data = await response.json();
    const rawFr24 = data.states || [];
    
    if (rawFr24.length === 0) return lastSuccessfulFlights;

    const flights = rawFr24.map((s: any) => {
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

    let finalFlights = flights;

    // Advanced Anomaly/Throttling Detection Array Guard
    // OpenSky periodically rate-limits APIs gracefully by returning random regional subsets (1900 flights instead of 11,000).
    // If payload crashes by >25% instantly, we logically assume a temporary throttle block. 
    // We flawlessly merge the 1900 live updates INTO the master 11,000 global array so planes NEVER disappear visually!
    if (lastSuccessfulFlights.length > 3000 && flights.length < (lastSuccessfulFlights.length * 0.75)) {
      console.warn(`[GKASFLOWS FlightService]: OpenSky throttle anomaly detected (Received ${flights.length} flights, expected ~${lastSuccessfulFlights.length}). Engaging Auto-Merge rescue protocol.`);
      
      const persistentMap = new Map<string, LiveFlight>();
      // 1. Rebuild the frozen massive 11,000 global planes grid locking their exact last-known velocity vectors natively
      lastSuccessfulFlights.forEach(f => persistentMap.set(f.icao24, f));
      
      // 2. Aggressively smash the newly-fetched ~1900 highly-accurate coordinate updates over them!
      flights.forEach(f => persistentMap.set(f.icao24, f));
      
      finalFlights = Array.from(persistentMap.values());
    }

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
