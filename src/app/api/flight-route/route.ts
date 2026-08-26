import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flightId = searchParams.get('id');

  if (!flightId) {
    return NextResponse.json({ error: 'Flight ID required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://data-live.flightradar24.com/clickhandler/?flight=${flightId}`, {
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
