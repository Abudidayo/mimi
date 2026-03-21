import { NextResponse } from 'next/server';
import { callCivic, extractText } from '@/lib/civic/client';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface Activity {
  name: string;
  description: string;
  duration: number;
  startTime?: string;
  category: string;
  location: { name: string };
  price: number;
}

interface DaySchedule {
  day: number;
  date: string;
  theme?: string;
  activities: Activity[];
}

interface ExportRequest {
  schedule: DaySchedule[];
  tripName: string;
  destination: string;
  startDate?: string;
  travelers?: number;
  budget?: number;
  currency?: { from: string; to: string; rate: number };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExportRequest;
    const { schedule, tripName, destination, startDate, travelers, budget, currency } = body;

    if (!schedule?.length) {
      return NextResponse.json({ error: 'No itinerary to export' }, { status: 400 });
    }

    // Compute actual dates from startDate + day offset
    const resolveDate = (day: DaySchedule): string => {
      if (day.date && /^\d{4}-\d{2}-\d{2}/.test(day.date)) return day.date;
      if (startDate) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (day.day - 1));
        return d.toISOString().split('T')[0];
      }
      return day.date || `Day ${day.day}`;
    };

    // Format the itinerary as structured text for the doc
    const itineraryText = schedule
      .map((day) => {
        const theme = day.theme ? ` — ${day.theme}` : '';
        const date = resolveDate(day);
        const header = `Day ${day.day} (${date})${theme}`;

        const activities = day.activities
          .map((a) => {
            const time = a.startTime ?? '';
            const price = a.price > 0
              ? currency
                ? ` | ${currency.to} ${Math.round(a.price * currency.rate)} (~${currency.from} ${a.price})`
                : ` | $${a.price}`
              : '';
            return `${time ? time + ' — ' : ''}${a.name} (${a.duration} min)${price}\n  ${a.description}\n  Location: ${a.location.name}`;
          })
          .join('\n\n');

        return `${header}\n${'—'.repeat(40)}\n${activities}`;
      })
      .join('\n\n');

    const tripMeta = [
      `Destination: ${destination}`,
      startDate ? `Dates: Starting ${startDate}` : null,
      travelers ? `Travelers: ${travelers}` : null,
      budget ? `Budget: $${budget} per person` : null,
      currency ? `Currency: 1 ${currency.from} = ${currency.rate} ${currency.to}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `Create a Google Doc titled "${tripName} — Travel Itinerary".

Overview:
${tripMeta}

Itinerary:
${itineraryText}

After creating the doc, provide the Google Docs link.`;

    const response = await callCivic(prompt, 4096, 'claude-haiku-4-5-20251001');
    const text = extractText(response);

    // Try to extract the doc URL from the response
    const urlMatch = text.match(/https:\/\/docs\.google\.com\/document\/d\/[^\s)>\]]+/);

    return NextResponse.json({
      success: true,
      message: text,
      docUrl: urlMatch?.[0] ?? null,
    });
  } catch (error) {
    console.error('[Export Docs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export to Google Docs' },
      { status: 500 },
    );
  }
}
