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
  fr24_id?: string;
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

let airportCoordsCache: Map<string, {lat: number, lon: number}> | null = null;
async function getAirportCoordsCache() {
  if (airportCoordsCache) return airportCoordsCache;
  if (typeof window === 'undefined') return new Map();
  try {
    const res = await fetch('/global_airports.json');
    const data = await res.json();
    airportCoordsCache = new Map();
    data.forEach((a: any) => {
      airportCoordsCache!.set(a.iata, { lat: a.coords[1], lon: a.coords[0] });
    });
    return airportCoordsCache;
  } catch (e) {
    return new Map();
  }
}

export async function fetchLiveFlights(): Promise<LiveFlight[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('API Timeout')), 15000);

  try {
    // TRI-SOURCE PARALLEL FETCH â€” three independent Vercel serverless functions
    // Route 1: /api/flights â†’ FR24 (~2,000 planes)
    // Route 2: /api/planes  â†’ adsb.lol global dump (~6,700 planes)
    // Route 3: /api/opensky â†’ OpenSky regional boxes (~3,000-5,000 unique planes, different network)
    // + 5-min CRVM retention = 12,000-15,000+ accumulated planes
    const results = await Promise.all([
      fetch('/api/flights', { signal: controller.signal }).catch(() => null),
      fetch('/api/planes', { signal: controller.signal }).catch(() => null),
      fetch('/api/opensky', { signal: controller.signal }).catch(() => null),
      getAirportCoordsCache()
    ]);
    const airportCoords = (results[3] as Map<string, {lat: number, lon: number}>) || new Map();
    const [flightsRes, planesRes, openskyRes] = results;
    clearTimeout(timeoutId);

    // Process FR24 server data
    let rawFlights: any[] = [];
    if (flightsRes && flightsRes.ok) {
      const data = await flightsRes.json();
      rawFlights = data.states || [];
      if (rawFlights.length > 0 && Array.isArray(rawFlights[0])) {
        rawFlights = rawFlights.map((s: any[]) => ({
          icao24: s[0], callsign: s[1], origin_country: s[2],
          longitude: s[3], latitude: s[4], baro_altitude: s[5],
          velocity: s[6], true_track: s[7], vertical_rate: s[8], category: s[9]
        }));
      }
    }

    // Process adsb.lol global data
    let rawPlanes: any[] = [];
    if (planesRes && planesRes.ok) {
      const data = await planesRes.json();
      rawPlanes = data.ac || [];
    }

    // Process OpenSky regional data
    let rawOpensky: any[] = [];
    if (openskyRes && openskyRes.ok) {
      const data = await openskyRes.json();
      rawOpensky = data.ac || [];
    }

    // Merge: OpenSky base â†’ adsb.lol overwrites â†’ FR24 wins on duplicates (richest metadata)
    const mergedRaw = new Map<string, any>();
    for (const s of rawOpensky) mergedRaw.set(s.icao24, s);
    for (const s of rawPlanes) mergedRaw.set(s.icao24, s);
    for (const s of rawFlights) mergedRaw.set(s.icao24, s);
    const allRaw = Array.from(mergedRaw.values());

    if (allRaw.length === 0) return lastSuccessfulFlights;

    const flights = allRaw.map((s: any) => {
      const enrichment = mapCategory(s.category || 0, s.icao24);
      
      const originIata = s.origin_iata || null;
      const destIata = s.dest_iata || null;
      let originCoords = s.origin_coords || null;
      let destCoords = s.dest_coords || null;

      if (originIata && !originCoords) originCoords = airportCoords.get(originIata) || null;
      if (destIata && !destCoords) destCoords = airportCoords.get(destIata) || null;

      return {
        ...s,
        ...enrichment,
        airline: s.airline || getAirline(s.callsign || '', s.icao24),
        origin: s.origin || null,
        origin_iata: originIata,
        origin_airport: s.origin_airport || null,
        origin_coords: originCoords,
        destination: s.destination || null,
        dest_iata: destIata,
        dest_airport: s.dest_airport || null,
        dest_coords: destCoords,
        dest_country: s.dest_country || null,
        fr24_id: s.fr24_id || null
      } as LiveFlight;
    });

    // ðŸŒ Continuous Retention Vector Merge (CRVM) ðŸŒ
    // OpenSky free API frequently drops random large global regions (e.g. from 12,000 planes dropping randomly to 2,000) 
    // to gracefully rate-limit bandwidth. Instead of planes spontaneously blipping out of existence from the Map,
    // this engine perpetually stitches missing planes dynamically together.
    const persistentMap = new Map<string, LiveFlight>();
    const NOW = Date.now();

    // 1. Load the frozen massive 11,000+ global aircraft grid from the last successful frame
    lastSuccessfulFlights.forEach(f => {
      // Gracefully let planes fade out if no source reports them for over 5 minutes (300s)
      // Extended retention = more accumulation across polling cycles = 12,000+ planes
      const lastSeen = (f as any)._lastSeen || NOW;
      if (NOW - lastSeen > 300000) return;

      persistentMap.set(f.icao24, f);
    });

    // 2. Aggressively smash the newly-fetched highly-accurate API coordinate updates over them, and immediately sync their seen timer to exactly NOW
    flights.forEach(f => {
      (f as any)._lastSeen = NOW;
      persistentMap.set(f.icao24, f);
    });

    const finalFlights = Array.from(persistentMap.values()).sort((a, b) => a.icao24.localeCompare(b.icao24));

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

export async function fetchAirportSchedule(code: string, mode: 'arrivals' | 'departures', date?: string) {
  try {
    const dateStr = date || new Date().toISOString().slice(0, 10);
    const res = await fetch('/api/airport-schedule?code=' + code + '&mode=' + mode + '&date=' + dateStr);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch airport schedule:', error);
    return null;
  }
}
