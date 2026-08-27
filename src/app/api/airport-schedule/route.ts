import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AERODATABOX_KEY = process.env.AERODATABOX_KEY || null;

// ─────────────────────────────────────────────────────────────────────────────
// Build two 12-hr windows in LOCAL AIRPORT TIME (no UTC conversion).
// AeroDataBox interprets the from/to datetimes as the airport's local time.
// Passing UTC values would cause a timezone-shifted schedule mismatch.
// ─────────────────────────────────────────────────────────────────────────────
function getDayWindows(dateStr: string) {
  return [
    { from: `${dateStr}T00:00`, to: `${dateStr}T12:00` },
    { from: `${dateStr}T12:00`, to: `${dateStr}T23:59` }
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Expand common airline short names to their full marketing name.
// AeroDataBox returns shortened names like "British", "United", "Kenya".
// ─────────────────────────────────────────────────────────────────────────────
const AIRLINE_NAME_MAP: Record<string, string> = {
  'American':   'American Airlines',
  'British':    'British Airways',
  'United':     'United Airlines',
  'Delta':      'Delta Air Lines',
  'Southwest':  'Southwest Airlines',
  'Kenya':      'Kenya Airways',
  'Qatar':      'Qatar Airways',
  'Emirates':   'Emirates',
  'Lufthansa':  'Lufthansa',
  'Air France': 'Air France',
  'KLM':        'KLM Royal Dutch',
  'Turkish':    'Turkish Airlines',
  'Singapore':  'Singapore Airlines',
  'Cathay':     'Cathay Pacific',
  'Qantas':     'Qantas',
  'Ryanair':    'Ryanair',
  'easyJet':    'easyJet',
  'SWISS':      'Swiss International',
  'Eurowings':  'Eurowings',
  'Wizz':       'Wizz Air',
  'Norwegian':  'Norwegian',
  'Iberia':     'Iberia',
  'Finnair':    'Finnair',
  'Austrian':   'Austrian Airlines',
  'SAS':        'SAS',
  'Aer':        'Aer Lingus',
  'TAP':        'TAP Air Portugal',
  'Vueling':    'Vueling',
  'Transavia':  'Transavia',
  'Air':        'Air Canada',
  'Etihad':     'Etihad Airways',
  'Flydubai':   'flydubai',
  'IndiGo':     'IndiGo',
  'SpiceJet':   'SpiceJet',
  'Avianca':    'Avianca',
  'LATAM':      'LATAM Airlines',
  'GOL':        'GOL Airlines',
  'Aeromexico': 'Aeromexico',
  'Copa':       'Copa Airlines',
  'Alitalia':   'ITA Airways',
  'Aegean':     'Aegean Airlines',
  'Pegasus':    'Pegasus Airlines',
  'SunExpress': 'SunExpress',
  'Jetstar':    'Jetstar',
  'Scoot':      'Scoot',
};

function expandAirlineName(name: string): string {
  if (!name) return 'Unknown';
  return AIRLINE_NAME_MAP[name] || name;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map AeroDataBox status values to FR24-style display labels.
// ─────────────────────────────────────────────────────────────────────────────
function mapStatus(raw: string | undefined, isDelayed: boolean, isPast: boolean, mode: 'arrivals' | 'departures'): string {
  if (!raw) return isPast ? (mode === 'arrivals' ? 'Landed' : 'Departed') : 'Scheduled';
  const s = raw.toLowerCase();
  if (s === 'cancelled')            return 'Cancelled';
  if (s === 'diverted')             return 'Diverted';
  if (s.includes('landed'))         return 'Landed';
  if (s.includes('arrived'))        return 'Landed';
  if (s.includes('departed'))       return 'Departed';
  if (s.includes('boarding'))       return 'Boarding';
  if (s.includes('gate'))           return 'At Gate';
  if (s.includes('taxiing'))        return 'Taxiing';
  if (s.includes('approach'))       return 'Approaching';
  if (s.includes('expected'))       return isDelayed ? 'Delayed' : (isPast ? (mode === 'arrivals' ? 'Landed' : 'Departed') : 'On Time');
  if (s.includes('check'))         return 'Check-in';
  if (s.includes('scheduled'))      return isDelayed ? 'Delayed' : 'Scheduled';
  return isDelayed ? 'Delayed' : raw;
}

function parseAeroDataBoxResponse(data: any, mode: 'arrivals' | 'departures') {
  const list = mode === 'arrivals' ? (data.arrivals || []) : (data.departures || []);
  const nowUnix = Math.floor(Date.now() / 1000);

  // Group by operating flight to collapse codeshares: keep only the first (operating) flight
  const seenRoute = new Map<string, boolean>();

  return list
    .filter((f: any) => {
      // Skip pure codeshare entries — keep only the operating carrier per route+time slot
      const dep = f.departure?.airport?.iata || '';
      const arr = f.arrival?.airport?.iata || '';
      const schKey = (mode === 'arrivals'
        ? f.arrival?.scheduledTime?.local
        : f.departure?.scheduledTime?.local) || '';
      // Key = origin-destination-time, so only the first entry (operating) passes
      const routeKey = `${dep}-${arr}-${schKey}`;
      if (seenRoute.has(routeKey)) return false;
      seenRoute.set(routeKey, true);
      return true;
    })
    .map((f: any) => {
      const depAirport = f.departure?.airport;
      const arrAirport = f.arrival?.airport;
      const relevantAirport = mode === 'arrivals' ? depAirport : arrAirport;

      const schLocal = mode === 'arrivals'
        ? f.arrival?.scheduledTime?.local
        : f.departure?.scheduledTime?.local;
      const estLocal = mode === 'arrivals'
        ? (f.arrival?.estimatedTime?.local || schLocal)
        : (f.departure?.estimatedTime?.local || schLocal);

      const toUnix = (s: string | undefined) =>
        s ? Math.floor(new Date(s).getTime() / 1000) : nowUnix;
      const schTime = toUnix(schLocal);
      const estTime = toUnix(estLocal);

      const isDelayed = (estTime - schTime) > 300; // >5 min delay
      const isPast    = schTime < nowUnix;

      const status = mapStatus(f.status, isDelayed, isPast, mode);

      // Use IATA code for a clean airline name lookup
      const airlineIata = f.airline?.iata || '';
      const airlineRaw  = f.airline?.name || 'Unknown';
      const airline     = expandAirlineName(airlineRaw);

      return {
        flight:      f.number || f.callSign || 'N/A',
        hex:         f.aircraft?.reg || f.aircraft?.modeS || 'N/A',
        airlineIata,
        airline,
        model:       f.aircraft?.model || 'Unknown',
        city:        relevantAirport?.name || relevantAirport?.iata || 'Unknown',
        iata:        relevantAirport?.iata || '???',
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
  const code      = searchParams.get('code');
  const mode      = searchParams.get('mode') as 'arrivals' | 'departures' | null;
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  if (!code || (mode !== 'arrivals' && mode !== 'departures')) {
    return NextResponse.json({ error: 'Missing or invalid code or mode' }, { status: 400 });
  }

  if (!AERODATABOX_KEY) {
    return NextResponse.json({ error: 'AeroDataBox key is not configured' }, { status: 500 });
  }

  try {
    const windows   = getDayWindows(dateParam);
    const direction = mode === 'arrivals' ? 'Arrival' : 'Departure';

    const fetchWindow = async ({ from, to }: { from: string; to: string }) => {
      // withCodeshared=true so we can detect and collapse them ourselves
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

    // Final dedup by flight number (across the two windows)
    const seen = new Set<string>();
    const deduped = merged.filter(f => {
      if (seen.has(f.flight)) return false;
      seen.add(f.flight);
      return true;
    });

    return NextResponse.json(deduped.sort((a, b) => a.schTime - b.schTime));
  } catch (err) {
    console.error('[AeroDataBox] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}
