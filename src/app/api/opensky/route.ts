import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// OpenSky Network — independent academic ADS-B network
// Uses bounding box queries to split into small regional payloads that fit within Vercel's 10s timeout
const OPENSKY_BASE = 'https://opensky-network.org/api/states/all';

let cachedPlanes: any[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 15000;

// 12 strategic bounding boxes covering global airspace
const REGIONS = [
  // North America
  { lamin: 25, lomin: -130, lamax: 50, lomax: -90 },  // US West + Central
  { lamin: 25, lomin: -90,  lamax: 50, lomax: -60 },  // US East + Canada East
  // Europe
  { lamin: 35, lomin: -10,  lamax: 55, lomax: 15 },   // Western Europe
  { lamin: 35, lomin: 15,   lamax: 60, lomax: 40 },   // Eastern Europe
  // Asia
  { lamin: 20, lomin: 55,   lamax: 45, lomax: 90 },   // Middle East + Central Asia
  { lamin: 5,  lomin: 65,   lamax: 35, lomax: 105 },  // South Asia + India
  { lamin: 20, lomin: 100,  lamax: 45, lomax: 145 },  // East Asia + Japan
  { lamin: -10, lomin: 95,  lamax: 20, lomax: 130 },  // Southeast Asia
  // Southern Hemisphere
  { lamin: -40, lomin: -80, lamax: 10, lomax: -30 },  // South America
  { lamin: -35, lomin: 10,  lamax: 35, lomax: 55 },   // Africa
  // Oceania + extras
  { lamin: -45, lomin: 110, lamax: -10, lomax: 180 }, // Australia + NZ
  { lamin: 55, lomin: -10,  lamax: 72, lomax: 40 },   // Nordics + Northern Europe
];

export async function GET() {
  const now = Date.now();
  if (cachedPlanes && (now - lastFetch < CACHE_TTL)) {
    return NextResponse.json({ ac: cachedPlanes });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8500);

  try {
    const fetchRegion = (r: typeof REGIONS[0]) =>
      fetch(`${OPENSKY_BASE}?lamin=${r.lamin}&lomin=${r.lomin}&lamax=${r.lamax}&lomax=${r.lomax}`, {
        signal: controller.signal, cache: 'no-store'
      }).catch(() => null);

    // Fire in 3 batches of 4 to avoid rate limiting (OpenSky: 1 req/s for anonymous)
    const batch1 = await Promise.all(REGIONS.slice(0, 4).map(fetchRegion));
    await new Promise(r => setTimeout(r, 200));
    const batch2 = await Promise.all(REGIONS.slice(4, 8).map(fetchRegion));
    await new Promise(r => setTimeout(r, 200));
    const batch3 = await Promise.all(REGIONS.slice(8, 12).map(fetchRegion));

    clearTimeout(timeoutId);

    const map = new Map<string, any>();

    const processResponse = async (res: Response | null) => {
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => ({ states: [] }));
      const states = data.states || [];
      for (const s of states) {
        const callsign = s[1]?.trim();
        if (s[6] !== null && s[5] !== null && callsign && !s[8]) {
          const icao = String(s[0]).toLowerCase();
          map.set(icao, {
            icao24: icao,
            callsign: callsign,
            origin_country: s[2] || 'OPENSKY',
            longitude: s[5],
            latitude: s[6],
            baro_altitude: s[7] || s[13] || 0,
            velocity: s[9] || 0,
            true_track: s[10] || 0,
            vertical_rate: s[11] || 0,
            category: 0
          });
        }
      }
    };

    for (const res of [...batch1, ...batch2, ...batch3]) {
      await processResponse(res);
    }

    const planes = Array.from(map.values());
    if (planes.length > 0) {
      cachedPlanes = planes;
      lastFetch = now;
    }

    return NextResponse.json({ ac: cachedPlanes || planes });
  } catch {
    clearTimeout(timeoutId);
    if (cachedPlanes) return NextResponse.json({ ac: cachedPlanes });
    return NextResponse.json({ ac: [] });
  }
}
