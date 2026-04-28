import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FR24_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.flightradar24.com/',
  'Origin': 'https://www.flightradar24.com/'
};

const BASE_FR24_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0';

let cachedStates: any[] | null = null;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 10000;

export async function GET() {
  const now = Date.now();
  if (cachedStates && (now - lastFetchTime < MIN_FETCH_INTERVAL)) {
    return NextResponse.json({ states: cachedStates });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9500); 

  try {
    // FR24 ONLY — lightweight, completes in 1-3 seconds
    const [fr24AfricaRes, fr24GlobalRes] = await Promise.all([
      fetch(`${BASE_FR24_URL}&bounds=35,-35,-20,55`, { signal: controller.signal, headers: FR24_HEADERS, cache: 'no-store' }).catch(() => null),
      fetch(`${BASE_FR24_URL}&bounds=85,-85,-180,180`, { signal: controller.signal, headers: FR24_HEADERS, cache: 'no-store' }).catch(() => null),
    ]);

    clearTimeout(timeoutId);
    
    const mergedFlightsMap = new Map<string, any>();

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

    await mergeFr24Data(fr24GlobalRes);
    await mergeFr24Data(fr24AfricaRes);

    let finalFilteredStates = Array.from(mergedFlightsMap.values());
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
