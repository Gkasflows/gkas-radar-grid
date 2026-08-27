import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG: Set AERODATABOX_KEY in your .env.local to unlock real schedule data.
// Get your free key at: https://rapidapi.com/aedbx-aedbx/api/aerodatabox
// ─────────────────────────────────────────────────────────────────────────────
const AERODATABOX_KEY = process.env.AERODATABOX_KEY || null;

// Returns two 12-hour windows covering the full selected date (AeroDataBox max window = 12hrs)
function getDayWindows(dateStr: string) {
  const fmt = (d: Date) => d.toISOString().slice(0, 16);
  const base = new Date(dateStr + 'T00:00:00.000Z');
  const noon = new Date(dateStr + 'T12:00:00.000Z');
  const end  = new Date(dateStr + 'T23:59:00.000Z');
  return [
    { from: fmt(base), to: fmt(noon) },
    { from: fmt(noon), to: fmt(end)  }
  ];
}

function parseAeroDataBoxResponse(data: any, mode: 'arrivals' | 'departures') {
  const list = mode === 'arrivals' ? (data.arrivals || []) : (data.departures || []);

  return list.map((f: any) => {
    const depAirport = f.departure?.airport;
    const arrAirport = f.arrival?.airport;
    const relevantAirport = mode === 'arrivals' ? depAirport : arrAirport;

    const schLocal = mode === 'arrivals'
      ? f.arrival?.scheduledTime?.local
      : f.departure?.scheduledTime?.local;
    const estLocal = mode === 'arrivals'
      ? (f.arrival?.estimatedTime?.local || schLocal)
      : (f.departure?.estimatedTime?.local || schLocal);

    const toUnix = (s: string | undefined) => s ? Math.floor(new Date(s).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const schTime = toUnix(schLocal);
    const estTime = toUnix(estLocal);

    const status = f.status || (estTime < Math.floor(Date.now() / 1000)
      ? (mode === 'arrivals' ? 'Landed' : 'Departed')
      : 'Scheduled');

    const isDelayed = (estTime - schTime) > 300; // >5 min delay

    return {
      flight: f.number || f.callSign || 'N/A',
      hex: f.aircraft?.reg || 'N/A',
      airline: f.airline?.name || 'Unknown',
      model: f.aircraft?.model || 'Unknown',
      city: relevantAirport?.name || relevantAirport?.iata || 'Unknown',
      iata: relevantAirport?.iata || '???',
      schTime,
      estTime,
      isDelayed,
      status,
      isSimulated: false
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const mode = searchParams.get('mode') as 'arrivals' | 'departures' | null;
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  if (!code || (mode !== 'arrivals' && mode !== 'departures')) {
    return NextResponse.json({ error: 'Missing or invalid code or mode' }, { status: 400 });
  }

  if (!AERODATABOX_KEY) {
    return NextResponse.json({ error: 'AeroDataBox key is not configured' }, { status: 500 });
  }

  try {
    const windows = getDayWindows(dateParam);
    const direction = mode === 'arrivals' ? 'Arrival' : 'Departure';

    // Fetch both 12-hr windows in parallel for full-day coverage
    const fetchWindow = async ({ from, to }: { from: string; to: string }) => {
      const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${code.toUpperCase()}/${from}/${to}?withLeg=true&direction=${direction}&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false&withLocation=false`;
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': AERODATABOX_KEY,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        },
        cache: 'no-store'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return parseAeroDataBoxResponse(data, mode);
    };

    const [firstHalf, secondHalf] = await Promise.all(windows.map(fetchWindow));
    const merged = [...firstHalf, ...secondHalf];

    // Deduplicate by flight number
    const seen = new Set<string>();
    const deduped = merged.filter(f => {
      if (seen.has(f.flight)) return false;
      seen.add(f.flight);
      return true;
    });

    const sorted = deduped.sort((a, b) => a.schTime - b.schTime);
    return NextResponse.json(sorted);
  } catch (err) {
    console.error('[AeroDataBox] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}
