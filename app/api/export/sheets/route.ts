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
  bookingRequired?: boolean;
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
  currency?: { from: string; to: string; rate: number };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExportRequest;
    const { schedule, tripName, destination, startDate, travelers, currency } = body;

    if (!schedule?.length) {
      return NextResponse.json({ error: 'No itinerary to export' }, { status: 400 });
    }

    // Compute actual dates from startDate + day offset
    const resolveDate = (day: DaySchedule): string => {
      // If date already looks like a real date (YYYY-MM-DD), use it
      if (day.date && /^\d{4}-\d{2}-\d{2}/.test(day.date)) return day.date;
      // Otherwise compute from startDate
      if (startDate) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + (day.day - 1));
        return d.toISOString().split('T')[0];
      }
      return day.date || `Day ${day.day}`;
    };

    // Build a tabular representation for the spreadsheet
    const rows = schedule.flatMap((day) =>
      day.activities.map((a) => ({
        day: day.day,
        date: resolveDate(day),
        theme: day.theme ?? '',
        time: a.startTime ?? '',
        activity: a.name,
        duration: a.duration,
        location: a.location.name,
        priceUSD: a.price,
        priceLocal: currency ? Math.round(a.price * currency.rate) : a.price,
        localCurrency: currency?.to ?? 'USD',
        booking: a.bookingRequired ? 'Yes' : 'No',
        description: a.description,
      })),
    );

    const totalUSD = rows.reduce((sum, r) => sum + r.priceUSD, 0);
    const totalLocal = currency ? Math.round(totalUSD * currency.rate) : totalUSD;

    const tableDescription = rows
      .map(
        (r) =>
          `Day ${r.day} | ${r.date} | ${r.time} | ${r.activity} | ${r.duration} min | ${r.location} | $${r.priceUSD} | ${r.localCurrency} ${r.priceLocal} | Booking: ${r.booking} | ${r.description}`,
      )
      .join('\n');

    const localCurrencyName = currency?.to ?? 'USD';
    const prompt = `Create a Google Spreadsheet titled "${tripName} — Budget & Itinerary".

Add these columns: Day | Date | Time | Activity | Duration (min) | Location | Price (USD) | Price (${localCurrencyName}) | Booking | Description

Data:
${tableDescription}

Last row: TOTAL | | | | | | $${totalUSD} | ${localCurrencyName} ${totalLocal}
${currency ? `Exchange rate: 1 ${currency.from} = ${currency.rate} ${currency.to}` : ''}

After creating, provide the Google Sheets link.`;

    const response = await callCivic(prompt, 4096, 'claude-haiku-4-5-20251001');
    const text = extractText(response);

    // Try to extract the sheet URL from the response
    const urlMatch = text.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[^\s)>\]]+/);

    return NextResponse.json({
      success: true,
      message: text,
      sheetUrl: urlMatch?.[0] ?? null,
      totals: {
        usd: totalUSD,
        local: totalLocal,
        localCurrency: localCurrencyName,
      },
    });
  } catch (error) {
    console.error('[Export Sheets] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export to Google Sheets' },
      { status: 500 },
    );
  }
}
