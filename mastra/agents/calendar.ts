import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { callCivic, extractText } from '@/lib/civic/client';
import type { DaySchedule } from '@/lib/utils/parse-itinerary';

const activityInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  duration: z.number(),
  startTime: z.string().optional(),
  location: z.object({ name: z.string() }),
});

const dayScheduleInputSchema = z.object({
  day: z.number(),
  date: z.string(),
  theme: z.string().optional(),
  activities: z.array(activityInputSchema),
});

export const addToCalendarTool = createTool({
  id: 'addToCalendar',
  description:
    'Export a trip itinerary to the user\'s Google Calendar. Call when the user asks to save, export, or add their plan to Google Calendar.',
  inputSchema: z.object({
    tripName: z.string().describe('Name of the trip, e.g. "Tokyo Trip"'),
    destination: z.string().describe('Destination city or country'),
    startDate: z.string().describe('Trip start date in YYYY-MM-DD format'),
    schedule: z.array(dayScheduleInputSchema).describe('The day-by-day itinerary to export'),
  }),
  execute: async ({ tripName, destination, startDate, schedule }) => {
    const itinerarySummary = (schedule as DaySchedule[])
      .map((day) => {
        const dayDate = day.date || `Day ${day.day}`;
        const activities = day.activities
          .map((a) => {
            const time = a.startTime ? ` at ${a.startTime}` : '';
            const dur = a.duration ? ` (${a.duration} min)` : '';
            const loc = a.location?.name ? ` — ${a.location.name}` : '';
            return `  - ${a.name}${time}${dur}${loc}: ${a.description}`;
          })
          .join('\n');
        return `Day ${day.day} (${dayDate})${day.theme ? ` — ${day.theme}` : ''}:\n${activities}`;
      })
      .join('\n\n');

    const prompt = `Create Google Calendar events for this trip itinerary. Use the exact dates and times provided.

Trip: ${tripName}
Destination: ${destination}
Start date: ${startDate}

Itinerary:
${itinerarySummary}

For each activity, create a calendar event with:
- Title: the activity name
- Date and start time as listed (use the start date as Day 1 and count forward)
- Duration as listed
- Location as listed
- Description: the activity description plus the day theme

Create all events now.`;

    const response = await callCivic(prompt);
    const message = extractText(response);

    return {
      success: true,
      message,
      eventsCreated: schedule.reduce((sum, day) => sum + day.activities.length, 0),
    };
  },
});

export const calendarAgent = new Agent({
  id: 'calendar-agent',
  name: 'Calendar Export Agent',
  description:
    'ONLY for exporting an already-generated itinerary to Google Calendar. NOT for planning trips, suggesting destinations, or creating itineraries. Only delegate here when the user explicitly asks to save or export to Google Calendar AND a full itinerary already exists.',
  instructions: `You are a Google Calendar export specialist. You do ONE thing: call the addToCalendar tool to export an existing itinerary to Google Calendar.

NEVER plan a trip. NEVER suggest destinations. NEVER create an itinerary.
Just call the tool and confirm with one short sentence like "Done! Your trip has been added to Google Calendar."
If no itinerary has been generated yet, reply: "Please generate a trip plan first, then I can add it to your Google Calendar."`,
  model: anthropic('claude-haiku-4-5-20251001'),
  tools: () => ({
    addToCalendar: addToCalendarTool,
  }),
});
