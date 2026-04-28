import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// adsb.lol — Free, open-source, community-driven ADS-B data mirror
// Supports the same 25,000nm global radius as the old ADSB.one endpoint
const ADSB_LOL_URL = 'https://api.adsb.lol/v2/point/0/0/25000';

let cachedPlanes: any[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 12000;

export async function GET() {
  const now = Date.now();
  if (cachedPlanes && (now - lastFetch < CACHE_TTL)) {
    return NextResponse.json({ ac: cachedPlanes });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(ADSB_LOL_URL, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (cachedPlanes) return NextResponse.json({ ac: cachedPlanes });
      return NextResponse.json({ ac: [] });
    }

    const data = await res.json().catch(() => ({ ac: [] }));
    const aircraft = data.ac || [];
    
    const planes: any[] = [];
    for (const p of aircraft) {
      const cs = p.flight?.trim();
      if (p.lat !== undefined && p.lon !== undefined && cs) {
        planes.push({
          icao24: String(p.hex).toLowerCase(),
          callsign: cs,
          origin_country: 'ADSB_LOL',
          longitude: p.lon,
          latitude: p.lat,
          baro_altitude: (p.alt_baro === 'ground' ? 0 : (p.alt_baro || p.alt_geom || 0)) * 0.3048,
          velocity: (p.gs || 0) * 0.514444,
          true_track: p.track || p.true_heading || p.mag_heading || 0,
          vertical_rate: (p.baro_rate || p.geom_rate || 0) * 0.00508,
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
