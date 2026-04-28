import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// This route ONLY fetches from airplanes.live regional points
// Split from the main route to avoid Vercel's 10s timeout on a single massive request
const ADSBX_BASE = 'https://api.airplanes.live/v2/point';

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
    const f = (lat: number, lon: number) =>
      fetch(`${ADSBX_BASE}/${lat}/${lon}/250`, { signal: controller.signal, cache: 'no-store' }).catch(() => null);

    // 25 strategic points tiling the globe — fired in 3 fast parallel batches
    const [r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.all([
      f(50, 10),    f(55, -3),    f(40, -75),   f(35, -120),
      f(45, -95),   f(25, 55),    f(35, 140),   f(30, 120),
    ]);
    await new Promise(r => setTimeout(r, 150));
    const [r9,r10,r11,r12,r13,r14,r15,r16] = await Promise.all([
      f(55, 37),    f(20, 78),    f(5, 105),    f(1, 32),
      f(-33, 151),  f(-23, -46),  f(7, 3),      f(13, 100),
    ]);
    await new Promise(r => setTimeout(r, 150));
    const [r17,r18,r19,r20,r21,r22,r23,r24,r25] = await Promise.all([
      f(22, 114),   f(60, 25),    f(33, -7),    f(-34, 18),
      f(25, -100),  f(50, -100),  f(37, -25),   f(-5, 135),
      f(40, 30),    // Turkey/Eastern Med
    ]);

    clearTimeout(timeoutId);

    const map = new Map<string, any>();
    const process = async (res: Response | null) => {
      if (!res || !res.ok) return;
      const data = await res.json().catch(() => ({ ac: [] }));
      for (const p of (data.ac || [])) {
        const cs = p.flight?.trim();
        if (p.lat !== undefined && p.lon !== undefined && cs) {
          const icao = String(p.hex).toLowerCase();
          map.set(icao, {
            icao24: icao, callsign: cs, origin_country: 'AIRPLANES_LIVE',
            longitude: p.lon, latitude: p.lat,
            baro_altitude: (p.alt_baro === 'ground' ? 0 : (p.alt_baro || p.alt_geom || 0)) * 0.3048,
            velocity: (p.gs || 0) * 0.514444,
            true_track: p.track || p.true_heading || p.mag_heading || 0,
            vertical_rate: (p.baro_rate || p.geom_rate || 0) * 0.00508,
            category: 0
          });
        }
      }
    };

    const all = [r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25];
    for (const r of all) await process(r);

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
