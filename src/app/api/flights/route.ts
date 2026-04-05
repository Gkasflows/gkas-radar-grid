import { NextResponse } from 'next/server';

const FR24_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?faa=1&bounds=22,-5,-20,30&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0';
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

// HARD MEMORY CACHE: This is the ultimate shield against 429s.
// It persists across client refreshes and multiple tabs.
let cachedStates: any[] | null = null;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 35000; // 35 seconds minimum between API hits

export async function GET() {
  const now = Date.now();
  
  // If we have a fresh cache, return it immediately without hitting the APIs
  if (cachedStates && (now - lastFetchTime < MIN_FETCH_INTERVAL)) {
    console.log(`API: Serving Dual-Merged Cache (${Math.round((MIN_FETCH_INTERVAL - (now - lastFetchTime))/1000)}s remaining)`);
    return NextResponse.json({ states: cachedStates });
  }

  console.log('API: Cache expired. Syncing BOTH OpenSky & FR24 Data Streams simultaneously...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    // 1. Build dynamic OpenSky Authenticated Headers
    let openSkyHeaders: any = { 'User-Agent': 'WorldView-Aviation-Dashboard/1.0' };
    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      const basicAuth = Buffer.from(`${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`).toString('base64');
      openSkyHeaders['Authorization'] = `Basic ${basicAuth}`;
      console.log('API: OpenSky Authentication Engaged - Injecting Basic Auth Bypass Protocol!');
    } else {
      console.warn('API: Proceeding without OpenSky Authentication (Will fail on Cloud/Vercel boundaries).');
    }

    // Fire dual asynchronous server requests
    const [fr24Response, openskyResponse] = await Promise.allSettled([
      fetch(FR24_URL, {
        signal: controller.signal,
        next: { revalidate: 35 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    
    // Deep Hash Map for instantaneous O(1) deduplication of 24-bit ICAO addresses
    const mergedFlightsMap = new Map<string, any>();

    // 1. Process OpenSky Base Data (The 10,000+ plane bulk data)
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
      console.log(`API: OpenSky provided ${osStates.length} base flights.`);
    }

    // 2. Process Flightradar24 Missing Data (Fills the African/Nigerian gaps flawlessly without overriding)
    if (fr24Response.status === 'fulfilled' && fr24Response.value.ok) {
      const frData = await fr24Response.value.json();
      
      const frKeys = Object.keys(frData).filter(k => k !== 'full_count' && k !== 'version' && k !== 'stats');
      let newFr24Additions = 0;

      for (const k of frKeys) {
        const s = frData[k];
        const icao = String(s[0]).toLowerCase();
        
        // Deep Deduplication: Only add the plane if OpenSky doesn't already have it tracking identically!
        if (!mergedFlightsMap.has(icao) && s[1] !== null && s[2] !== null) {
          mergedFlightsMap.set(icao, {
            icao24: icao,
            latitude: s[1],
            longitude: s[2],
            true_track: s[3],
            baro_altitude: s[4] * 0.3048, // Convert FR24 feet to meters
            velocity: s[5] * 0.514444, // Convert FR24 knots to m/s
            callsign: s[16]?.trim() || s[13]?.trim() || 'N/A',
            origin_country: s[8] || 'FR24', 
            vertical_rate: s[15] * 0.00508, 
            category: 0
          });
          newFr24Additions++;
        }
      }
      console.log(`API: FR24 provided ${newFr24Additions} unique missing gap-filler flights!`);
    }

    // Unpack the Map into a native React array and execute a stable sort layout
    const finalFilteredStates = Array.from(mergedFlightsMap.values());
    finalFilteredStates.sort((a: any, b: any) => a.icao24.localeCompare(b.icao24));

    if (finalFilteredStates.length === 0 && cachedStates) {
      console.warn('API: Both APIs failed severely! Restoring from hard cache.');
      return NextResponse.json({ states: cachedStates, warning: 'dual_api_failure' });
    }

    // Update the hard cache
    cachedStates = finalFilteredStates;
    lastFetchTime = now;

    console.log(`API: Dual-Sync Complete! Total Live Global Aircraft: ${finalFilteredStates.length}`);
    return NextResponse.json({ states: finalFilteredStates });

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (cachedStates) {
      console.warn('API: Dual-Fetch completely failed, using fallback cache:', error.message);
      return NextResponse.json({ states: cachedStates, warning: 'fallback_active' });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
