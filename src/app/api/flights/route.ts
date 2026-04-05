import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FR24_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?faa=1&bounds=35,-35,-20,55&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0';
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

let cachedStates: any[] | null = null;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 35000; 

export async function GET() {
  const now = Date.now();
  if (cachedStates && (now - lastFetchTime < MIN_FETCH_INTERVAL)) {
    return NextResponse.json({ states: cachedStates });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    let openSkyHeaders: any = { 'User-Agent': 'WorldView-Aviation/1.0' };
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      const basicAuth = Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64');
      openSkyHeaders['Authorization'] = `Basic ${basicAuth}`;
    }

    const [fr24Response, openskyResponse] = await Promise.allSettled([
      fetch(FR24_URL, {
        signal: controller.signal,
        next: { revalidate: 35 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://www.flightradar24.com/',
          'Origin': 'https://www.flightradar24.com/'
        }
      }),
      fetch(OPENSKY_URL, {
        signal: controller.signal,
        next: { revalidate: 35 },
        headers: openSkyHeaders
      })
    ]);
    
    clearTimeout(timeoutId);
    
    const mergedFlightsMap = new Map<string, any>();

    // 1. Process OpenSky (12,000 Global Flights)
    if (openskyResponse.status === 'fulfilled' && openskyResponse.value.ok) {
      const osData = await openskyResponse.value.json();
      const osStates = osData.states || [];
      for (const s of osStates) {
        if (s[5] !== null && s[6] !== null) {
          const icao = String(s[0]).toLowerCase();
          mergedFlightsMap.set(icao, {
            icao24: icao,
            callsign: s[1]?.trim() || 'N/A',
            origin_country: s[2],
            longitude: s[5],
            latitude: s[6],
            baro_altitude: s[7],
            velocity: s[9],
            true_track: s[10],
            vertical_rate: s[11],
            category: s[17] || 0
          });
        }
      }
    }

    // 2. Process FlightRadar24 strictly over Africa (Overwriting OpenSky to ensure accuracy in Nigeria)
    if (fr24Response.status === 'fulfilled' && fr24Response.value.ok) {
      const frData = await fr24Response.value.json();
      const frKeys = Object.keys(frData).filter(k => k !== 'full_count' && k !== 'version' && k !== 'stats');
      for (const k of frKeys) {
        const s = frData[k];
        const icao = String(s[0]).toLowerCase();
        
        if (s[1] !== null && s[2] !== null) {
          mergedFlightsMap.set(icao, { // OVERWRITE any OpenSky matches natively with FR24's precise African telemetry
            icao24: icao,
            latitude: s[1],
            longitude: s[2],
            true_track: s[3],
            baro_altitude: s[4] * 0.3048, 
            velocity: s[5] * 0.514444, 
            callsign: s[16]?.trim() || s[13]?.trim() || 'N/A',
            origin_country: s[8] || 'FR24', 
            vertical_rate: s[15] * 0.00508, 
            category: 0
          });
        }
      }
    }

    const finalFilteredStates = Array.from(mergedFlightsMap.values());
    finalFilteredStates.sort((a: any, b: any) => a.icao24.localeCompare(b.icao24));

    if (finalFilteredStates.length === 0 && cachedStates) {
      return NextResponse.json({ states: cachedStates, warning: 'api_failure' });
    }

    cachedStates = finalFilteredStates;
    lastFetchTime = now;

    return NextResponse.json({ states: finalFilteredStates });

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (cachedStates) return NextResponse.json({ states: cachedStates, warning: 'fallback' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

