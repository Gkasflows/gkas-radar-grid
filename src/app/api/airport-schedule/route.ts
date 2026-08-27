import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG: Set AERODATABOX_KEY in your .env.local to unlock real schedule data.
// Get your free key at: https://rapidapi.com/aedbx-aedbx/api/aerodatabox
// Free tier: 2,000 calls/month — no credit card required.
// ─────────────────────────────────────────────────────────────────────────────
const AERODATABOX_KEY = process.env.AERODATABOX_KEY || null;

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATED FALLBACK (used when no API key is configured)
// ─────────────────────────────────────────────────────────────────────────────
const MAJOR_AIRLINES = [
  'Delta Air Lines', 'American Airlines', 'United Airlines', 'Southwest Airlines',
  'British Airways', 'Lufthansa', 'Air France', 'KLM', 'Emirates', 'Qatar Airways',
  'Singapore Airlines', 'Cathay Pacific', 'Qantas', 'Air Canada', 'Turkish Airlines',
  'Ryanair', 'easyJet', 'Wizz Air', 'Norwegian', 'Iberia', 'Alitalia', 'Swiss International',
  'Finnair', 'SAS', 'Austrian Airlines', 'Brussels Airlines'
];
const AIRCRAFT_MODELS = ['B738', 'B77W', 'B789', 'A320', 'A321', 'A359', 'A388', 'B737', 'E190', 'CRJ9'];
const CITIES = ["New York", "London", "Paris", "Tokyo", "Dubai", "Singapore", "Los Angeles", "Frankfurt", "Amsterdam", "Madrid", "Rome", "Toronto", "Sydney", "Hong Kong", "Zurich", "Beijing", "Seoul", "Mumbai", "Istanbul", "Cairo", "Lagos", "Nairobi", "Johannesburg", "Bangkok", "Kuala Lumpur"];
const IATAS = ["JFK", "LHR", "CDG", "HND", "DXB", "SIN", "LAX", "FRA", "AMS", "MAD", "FCO", "YYZ", "SYD", "HKG", "ZRH", "PEK", "ICN", "BOM", "IST", "CAI", "LOS", "NBO", "JNB", "BKK", "KUL"];

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

function generateSimulatedSchedule(airportCode: string, mode: 'arrivals' | 'departures') {
  const flights = [];
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < 60; i++) {
    const seed = `${airportCode}-${mode}-${i}`;
    const timeOffset = Math.floor(seededRandom(seed) * 43200) - 7200;
    const schTime = now + timeOffset;
    const isDelayed = seededRandom(seed + 'delay') > 0.75;
    const delayAmount = isDelayed
      ? Math.floor(seededRandom(seed + 'amt') * 3600) + 600
      : Math.floor(seededRandom(seed + 'amt') * 300) - 150;
    const estTime = schTime + delayAmount;

    const airline = MAJOR_AIRLINES[Math.floor(seededRandom(seed + 'air') * MAJOR_AIRLINES.length)];
    const model = AIRCRAFT_MODELS[Math.floor(seededRandom(seed + 'ac') * AIRCRAFT_MODELS.length)];
    const flightNum = airline.substring(0, 2).toUpperCase() + Math.floor(seededRandom(seed + 'num') * 9000 + 100);
    const hex = Math.floor(seededRandom(seed + 'hex') * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
    const cityIdx = Math.floor(seededRandom(seed + 'city') * CITIES.length);

    let status = estTime < now
      ? (mode === 'arrivals' ? 'Landed' : 'Departed')
      : (estTime < now + 1800 ? (mode === 'arrivals' ? 'Approaching' : 'Taxiing') : 'Scheduled');
    if (isDelayed && estTime > now) status = 'Delayed';

    flights.push({
      flight: flightNum, hex, airline, model,
      city: CITIES[cityIdx], iata: IATAS[cityIdx],
      schTime, estTime, isDelayed, status,
      isSimulated: true
    });
  }

  return flights.sort((a, b) => a.schTime - b.schTime);
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL DATA: AeroDataBox
// ─────────────────────────────────────────────────────────────────────────────
// Returns two 12-hour windows covering the full selected date (AeroDataBox max window = 12hrs)
function getDayWindows(dateStr: string) {
  // dateStr = 'YYYY-MM-DD', we build midnight-to-noon and noon-to-midnight
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
  // date param: YYYY-MM-DD. Defaults to today (UTC).
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  if (!code || (mode !== 'arrivals' && mode !== 'departures')) {
    return NextResponse.json({ error: 'Missing or invalid code or mode' }, { status: 400 });
  }

  // ── Try AeroDataBox if key is configured ──────────────────────────────────
  if (AERODATABOX_KEY) {
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

      if (sorted.length > 0) {
        return NextResponse.json(sorted);
      }
    } catch (err) {
      console.error('[AeroDataBox] Error:', err);
    }
  }

  // ── Fallback: simulated schedule ──────────────────────────────────────────
  return NextResponse.json(generateSimulatedSchedule(code, mode));
}
