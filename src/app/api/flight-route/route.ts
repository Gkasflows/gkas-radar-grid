import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flightId = searchParams.get('id');
  const callsign = searchParams.get('callsign');

  if (!flightId && !callsign) {
    return NextResponse.json({ error: 'Flight ID or callsign required' }, { status: 400 });
  }

  let finalFlightId = flightId;

  try {
    if (!finalFlightId && callsign) {
      // Find the internal FR24 hex ID by searching the callsign
      const searchRes = await fetch(`https://www.flightradar24.com/v1/search/web/find?query=${callsign}&limit=1`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData?.results || [];
        const match = results.find((r: any) => r.type === 'live' || r.id);
        if (match) {
          finalFlightId = match.id;
        }
      }
    }

    if (!finalFlightId) {
      return NextResponse.json({ error: 'Could not resolve flight ID' }, { status: 404 });
    }

    const res = await fetch(`https://data-live.flightradar24.com/clickhandler/?flight=${finalFlightId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch flight route' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
