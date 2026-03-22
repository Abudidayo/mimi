import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

/** In-memory store — good enough for hackathon demo. */
const shared = new Map<string, { data: unknown; createdAt: number }>();

// Clean up entries older than 7 days on each request
function cleanup() {
  const week = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [id, entry] of shared) {
    if (now - entry.createdAt > week) shared.delete(id);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { schedule, tripName, destination, startDate } = body;

    if (!schedule?.length) {
      return NextResponse.json({ error: 'No itinerary to share' }, { status: 400 });
    }

    cleanup();

    const id = crypto.randomBytes(6).toString('base64url'); // short URL-safe ID
    shared.set(id, {
      data: { schedule, tripName, destination, startDate, sharedAt: new Date().toISOString() },
      createdAt: Date.now(),
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${id}`;

    return NextResponse.json({ success: true, shareUrl, id });
  } catch (err) {
    console.error('[Share] Error:', err);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const entry = shared.get(id);
  if (!entry) return NextResponse.json({ error: 'Trip not found or expired' }, { status: 404 });

  return NextResponse.json(entry.data);
}
