import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// OpenSky Network — independent academic ADS-B research network
// Different feeder set from airplanes.live/adsb.lol, provides unique planes
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

let cachedPlanes: any[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 15000; // OpenSky recommends 10-15s polling intervals

export async function GET() {
  const now = Date.now();
  if (cachedPlanes && (now - lastFetch < CACHE_TTL)) {
    return NextResponse.json({ ac: cachedPlanes });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(OPENSKY_URL, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (cachedPlanes) return NextResponse.json({ ac: cachedPlanes });
      return NextResponse.json({ ac: [] });
    }

    const data = await res.json().catch(() => ({ states: [] }));
    const states = data.states || [];
    
    const planes: any[] = [];
    for (const s of states) {
      // OpenSky format: [icao24, callsign, origin_country, time_position, last_contact, 
      //                   longitude, latitude, baro_altitude, on_ground, velocity, 
      //                   true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
      const callsign = s[1]?.trim();
      if (s[6] !== null && s[5] !== null && callsign && !s[8]) { // Skip on_ground
        planes.push({
          icao24: String(s[0]).toLowerCase(),
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
