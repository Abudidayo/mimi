import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/providers/openrouter';

const stayTypeSchema = z.enum(['hotel', 'airbnb', 'hostel', 'resort', 'guesthouse', 'other']);

const lodgingOptionSchema = z.object({
  name: z.string(),
  provider: z.string(),
  stayType: stayTypeSchema,
  neighborhood: z.string(),
  nightlyRate: z.number(),
  totalPrice: z.number(),
  rating: z.number(),
  perks: z.array(z.string()).max(4),
  bookingUrl: z.string().url().optional(),
});

export const lodgingSchema = z.object({
  destination: z.string(),
  stayType: stayTypeSchema,
  summary: z.string(),
  recommendedArea: z.string(),
  options: z.array(lodgingOptionSchema).min(2).max(4),
  bookingTip: z.string(),
});

export type LodgingData = z.infer<typeof lodgingSchema>;

export const lodgingAgent = new Agent({
  id: 'lodging-agent',
  name: 'Lodging Agent',
  description: 'Finds hotels, Airbnbs, hostels, and other stays by calling the findLodging tool and returning stay cards.',
  instructions: `You are the lodging specialist inside a multi-agent travel planner.

Treat prior conversation turns as valid context.
If destination, dates, travellers, budget, or stay type were already stated earlier in the chat, use them.
Only ask for a field when it is missing or ambiguous right now.

When the user wants hotels, Airbnbs, places to stay, or booking-ready lodging options:
- If stay type is missing, ask: Stay type: {{::select[stay_type|hotel,airbnb,hostel,resort,guesthouse,other]}}
- If destination is missing, ask: Destination: {{::country[destination|JP]}}
- If dates are missing, ask: Departure {{::date-picker[departure]}} Return {{::date-picker[return]}}
- If traveller count is missing, ask: {{+[travelers|2]-}} travellers

Only call the \`findLodging\` tool when destination, dates, stay type, and travellers are known.
Do not rewrite the lodging cards as plain text because the UI already renders them.
After the tool finishes, respond with one short sentence at most.`,
  model: models.agent,
  tools: () => ({
    findLodging: findLodgingTool,
  }),
});

export async function runLodging(params: {
  destination: string;
  stayType: z.infer<typeof stayTypeSchema>;
  dates: { from: string; to: string };
  travelers?: number;
  budget?: number;
}): Promise<LodgingData> {
  const travelersCtx = params.travelers ? ` For ${params.travelers} traveller${params.travelers > 1 ? 's' : ''}.` : '';
  const budgetCtx = params.budget ? ` Budget target: about $${params.budget} per person.` : '';

  const result = await generateText({
    model: models.research,
    output: Output.object({ schema: lodgingSchema }),
    prompt: `Find realistic ${params.stayType} options in ${params.destination} from ${params.dates.from} to ${params.dates.to}.${travelersCtx}${budgetCtx}

Return:
- destination
- stayType
- summary: one concise recommendation sentence
- recommendedArea: the best area or neighborhood to stay in
- options: 2-4 strong options with provider, neighborhood, nightlyRate, totalPrice, rating, perks, and a plausible bookingUrl
- bookingTip: one practical tip about choosing or booking the stay

Rules:
- Match the requested stay type closely
- Vary price points slightly unless the budget clearly implies one tier
- Use real neighborhoods and believable property names
- bookingUrl can point to Booking.com, Airbnb, Hostelworld, or a hotel homepage
- Keep perks short and useful`,
  });

  return result.output;
}

export const findLodgingTool = createTool({
  id: 'findLodging',
  description: 'Find booking-ready lodging options such as hotels, Airbnbs, hostels, or resorts for a destination and date range.',
  inputSchema: z.object({
    destination: z.string().describe('The destination city or region'),
    stayType: stayTypeSchema.describe('Preferred lodging style'),
    dates: z.object({
      from: z.string(),
      to: z.string(),
    }).describe('Check-in and check-out dates'),
    travelers: z.number().optional().describe('Number of travellers'),
    budget: z.number().optional().describe('Budget per person in USD'),
  }),
  execute: async (input) => {
    return runLodging(input);
  },
});
