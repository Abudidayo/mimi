import { NextResponse } from 'next/server';
import { callCivic, extractText } from '@/lib/civic/client';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface Activity {
  id?: string;
  name: string;
  description: string;
  duration: number;
  startTime?: string;
  location: { name: string };
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
  existingEventIds?: Record<string, string>;
}

/** Create or modify a single calendar event via Civic */
async function syncOneEvent(
  activity: Activity,
  day: DaySchedule,
  tripName: string,
  destination: string,
  startDate: string | undefined,
  existingCalendarId?: string,
): Promise<{ activityId: string; success: boolean; message: string }> {
  const activityId = activity.id ?? activity.name;
  const date = day.date || (startDate ? `Day ${day.day} from ${startDate}` : `Day ${day.day}`);
  const theme = day.theme ? ` — ${day.theme}` : '';
  const time = activity.startTime ?? '09:00';

  let prompt: string;

  if (existingCalendarId) {
    prompt = `Modify an existing Google Calendar event.
Use modify_event with event_id: ${existingCalendarId}

Update it to:
- Title: ${activity.name}
- Date: ${date}
- Start time: ${time}
- Duration: ${activity.duration} minutes
- Location: ${activity.location.name}
- Description: ${tripName}${theme} — ${activity.description}
${destination ? `- Timezone: appropriate for ${destination}` : ''}

Just modify the event and confirm.`;
  } else {
    prompt = `Create ONE Google Calendar event:
- Title: ${activity.name}
- Date: ${date}
- Start time: ${time}
- Duration: ${activity.duration} minutes
- Location: ${activity.location.name}
- Description: ${tripName}${theme} — ${activity.description}
${destination ? `- Timezone: appropriate for ${destination}` : ''}

Create the event and confirm with the link.`;
  }

  try {
    const response = await callCivic(prompt);
    const text = extractText(response);
    return { activityId, success: true, message: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { activityId, success: false, message: msg };
  }
}

/** Delete a calendar event via Civic */
async function deleteOneEvent(calendarEventId: string): Promise<boolean> {
  try {
    await callCivic(`Delete Google Calendar event with event_id: ${calendarEventId}. Just delete it and confirm.`);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { schedule, tripName, destination, startDate, existingEventIds = {} } =
      (await req.json()) as ExportRequest;

    if (!schedule?.length) {
      return NextResponse.json({ error: 'No itinerary to export' }, { status: 400 });
    }

    // Collect current activity IDs
    const currentActivityIds = new Set<string>();
    schedule.forEach((day) =>
      day.activities.forEach((a) => {
        if (a.id) currentActivityIds.add(a.id);
      }),
    );

    // Find events to delete
    const toDelete: string[] = [];
    for (const [activityId, calendarEventId] of Object.entries(existingEventIds)) {
      if (!currentActivityIds.has(activityId)) {
        toDelete.push(calendarEventId);
      }
    }

    // Batch events — run 3 at a time with a delay to avoid rate limits
    const BATCH_SIZE = 3;
    const BATCH_DELAY_MS = 2000;

    type SyncTask = { activity: Activity; day: DaySchedule; existingCalId?: string };
    const tasks: SyncTask[] = [];

    for (const day of schedule) {
      for (const activity of day.activities) {
        const activityId = activity.id ?? activity.name;
        tasks.push({ activity, day, existingCalId: existingEventIds[activityId] });
      }
    }

    const syncResults: { activityId: string; success: boolean; message: string }[] = [];

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((t) =>
          syncOneEvent(t.activity, t.day, tripName, destination, startDate, t.existingCalId),
        ),
      );
      syncResults.push(...batchResults);

      // Delay between batches (skip after the last one)
      if (i + BATCH_SIZE < tasks.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Delete removed events in batches too
    const deleteResults: boolean[] = [];
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((id) => deleteOneEvent(id)));
      deleteResults.push(...batchResults);
      if (i + BATCH_SIZE < toDelete.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const succeeded = syncResults.filter((r) => r.success);
    const failed = syncResults.filter((r) => !r.success);

    // Build updated event ID map
    const eventIdMap: Record<string, string> = {};
    for (const r of succeeded) {
      eventIdMap[r.activityId] = existingEventIds[r.activityId] ?? r.activityId;
    }

    return NextResponse.json({
      success: failed.length === 0,
      message: `${succeeded.length} events synced, ${deleteResults.filter(Boolean).length} deleted${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
      eventIds: eventIdMap,
      eventsCreated: succeeded.length,
      eventsDeleted: deleteResults.filter(Boolean).length,
      errors: failed.length > 0 ? failed.map((f) => f.message) : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Export Calendar] Error:', msg, error);
    return NextResponse.json(
      { error: 'Failed to export to Google Calendar', detail: msg },
      { status: 500 },
    );
  }
}
