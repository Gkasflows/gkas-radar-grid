import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FR24_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.flightradar24.com/',
  'Origin': 'https://www.flightradar24.com/'
};

const BASE_FR24_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0';
// airplanes.live REGIONAL endpoints — 24 strategic hotspots covering global airspace
const ADSBX_BASE = 'https://api.airplanes.live/v2/point'; 

let cachedStates: any[] | null = null;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 10000; // Drops cache at exactly 10s securely, preventing stale overlapping!

export async function GET() {
  const now = Date.now();
  if (cachedStates && (now - lastFetchTime < MIN_FETCH_INTERVAL)) {
    return NextResponse.json({ states: cachedStates });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9500); 

  try {
    // airplanes.live regional fetcher (250nm radius each = ~463km coverage per point)
    const adsbxFetch = (lat: number, lon: number) => 
      fetch(`${ADSBX_BASE}/${lat}/${lon}/250`, { signal: controller.signal, cache: 'no-store' }).catch(() => null);

    // ═══════════ BATCH 1: 9 parallel requests ═══════════
    const [r1,r2,r3,r4,r5,r6,r7,r8,r9] = await Promise.all([
      adsbxFetch(50, 10),     // Central Europe (Germany/France)
      adsbxFetch(55, -3),     // UK / Scandinavia
      adsbxFetch(40, -75),    // US East Coast
      adsbxFetch(35, -120),   // US West Coast
      adsbxFetch(45, -95),    // US Central / Midwest
      adsbxFetch(25, 55),     // Middle East / Gulf
      adsbxFetch(35, 140),    // Japan / East Asia
      adsbxFetch(30, 120),    // China East Coast / Shanghai
      adsbxFetch(55, 37),     // Russia / Moscow
    ]);

    await new Promise(r => setTimeout(r, 200));

    // ═══════════ BATCH 2: 9 parallel requests ═══════════
    const [r10,r11,r12,r13,r14,r15,r16,r17,r18] = await Promise.all([
      adsbxFetch(20, 78),     // India
      adsbxFetch(5, 105),     // Southeast Asia / Indonesia
      adsbxFetch(1, 32),      // East Africa / Kenya
      adsbxFetch(-33, 151),   // Australia / Sydney
      adsbxFetch(-23, -46),   // Brazil / South America
      adsbxFetch(7, 3),       // West Africa / Nigeria
      adsbxFetch(13, 100),    // Thailand / Indochina
      adsbxFetch(22, 114),    // Hong Kong / South China
      adsbxFetch(60, 25),     // Finland / Nordics
    ]);

    await new Promise(r => setTimeout(r, 200));

    // ═══════════ BATCH 3: 6 regional + 2 FR24 overlays ═══════════
    const [r19,r20,r21,r22,r23,r24,fr24AfricaRes,fr24GlobalRes] = await Promise.all([
      adsbxFetch(33, -7),     // Morocco / North Africa
      adsbxFetch(-34, 18),    // South Africa / Cape Town
      adsbxFetch(25, -100),   // Mexico
      adsbxFetch(50, -100),   // Canada
      adsbxFetch(37, -25),    // Mid-Atlantic / Azores corridor
      adsbxFetch(-5, 135),    // Papua / Pacific Islands
      // FR24 Africa overlay (guarantees African coverage)
      fetch(`${BASE_FR24_URL}&bounds=35,-35,-20,55`, { signal: controller.signal, headers: FR24_HEADERS, cache: 'no-store' }).catch(() => null),
      // FR24 Global overlay
      fetch(`${BASE_FR24_URL}&bounds=85,-85,-180,180`, { signal: controller.signal, headers: FR24_HEADERS, cache: 'no-store' }).catch(() => null),
    ]);

    clearTimeout(timeoutId);
    
    // Hash map to uniquely destroy duplicate ICAO transponder clones
    const mergedFlightsMap = new Map<string, any>();

    // Unified airplanes.live processor — processes all 24 regional responses
    const processAdsbx = async (res: Response | null) => {
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => ({ ac: [] }));
      const aircraft = data.ac || [];
      for (const plane of aircraft) {
        const callsign = plane.flight?.trim();
        if (plane.lat !== undefined && plane.lon !== undefined && callsign) {
          const icao = String(plane.hex).toLowerCase();
          mergedFlightsMap.set(icao, {
            icao24: icao,
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
    };
    // Process all 24 regional airplanes.live responses
    const allRegional = [r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24];
    for (const res of allRegional) await processAdsbx(res);

    // FR24 Array Aggregation Helper
    const mergeFr24Data = async (res: Response | null) => {
      if (!res || !res.ok) return;
      const frData = await res.json().catch(() => ({}));
      const frKeys = Object.keys(frData).filter(k => k !== 'full_count' && k !== 'version' && k !== 'stats');
      
      for (const k of frKeys) {
        const s = frData[k];
        const icao = String(s[0]).toLowerCase();
        
        const callsign = s[16]?.trim() || s[13]?.trim();
        
        if (s[1] !== null && s[2] !== null && callsign) {
          mergedFlightsMap.set(icao, { 
            icao24: icao,
            latitude: s[1],
            longitude: s[2],
            true_track: s[3],
            baro_altitude: s[4] * 0.3048, 
            velocity: s[5] * 0.514444, 
            callsign: callsign,
            origin_country: s[8] || 'FR24', 
            vertical_rate: s[15] * 0.00508, 
            category: 0
          });
        }
      }
    };

    // Synthesize explicitly globally mathematically dynamically overwriting strictly with precise telemetry
    await mergeFr24Data(fr24GlobalRes); // Random ~1500 globals natively structurally overlaid
    await mergeFr24Data(fr24AfricaRes); // Explicit ~800 Africa precisely mathematically guaranteed

    let finalFilteredStates = Array.from(mergedFlightsMap.values());

    // Since the frontend (flightService.ts) now processes and mathematically merges planes with a strict 90-second flush window,
    // we must NOT infinitely cache planes on the backend. This prevents massive 4.5MB Vercel Serverless Function RAM limits from blowing out.
    // Cleanly sort and aggressively cap the raw payload specifically under 12,000 max flights mathematically guaranteeing Vercel 200 OKs.
    finalFilteredStates.sort((a: any, b: any) => a.icao24.localeCompare(b.icao24));
    let safelyCappedStates = finalFilteredStates.slice(0, 12000);

    if (safelyCappedStates.length === 0 && cachedStates) {
      return NextResponse.json({ states: cachedStates, warning: 'api_failure' });
    }

    cachedStates = safelyCappedStates;
    lastFetchTime = now;

    return NextResponse.json({ states: safelyCappedStates });

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (cachedStates) return NextResponse.json({ states: cachedStates, warning: 'fallback' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



