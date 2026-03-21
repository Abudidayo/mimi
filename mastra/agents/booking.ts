import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { models } from '@/lib/providers/openrouter';
import { executeBrowserFlow, isBrowserExecutionAvailable } from '@/lib/browser/stagehand';
import { runTransport } from '@/mastra/agents/flights';
import { runLodging } from '@/mastra/agents/lodging';

const stayTypeSchema = z.enum(['hotel', 'airbnb', 'hostel', 'resort', 'guesthouse', 'other']);
const executionModeSchema = z.enum(['auto', 'mock', 'browser']);

const reservationItemSchema = z.object({
  kind: z.enum(['transport', 'lodging']),
  provider: z.string(),
  title: z.string(),
  status: z.enum(['confirmed', 'prepared', 'browser-attempted']),
  confirmationCode: z.string(),
  price: z.string(),
  details: z.string(),
  bookingUrl: z.string().url().optional(),
});

const browserTaskSchema = z.object({
  label: z.string(),
  status: z.enum(['completed', 'partial', 'skipped', 'failed']),
  summary: z.string(),
  sessionUrl: z.string().url().optional(),
  actions: z.array(z.string()).max(6),
});

const selectedFlightSchema = z.object({
  airline: z.string(),
  price: z.number(),
  route: z.string().optional(),
  departTime: z.string(),
  arrivalTime: z.string(),
}).optional();

const selectedLodgingSchema = z.object({
  name: z.string(),
  provider: z.string(),
  totalPrice: z.number(),
  neighborhood: z.string(),
}).optional();

export const bookingSchema = z.object({
  destination: z.string(),
  executionMode: z.enum(['mock', 'browser']),
  summary: z.string(),
  reservations: z.array(reservationItemSchema).min(1).max(3),
  browserTasks: z.array(browserTaskSchema).max(2),
  nextStep: z.string(),
});

export type BookingData = z.infer<typeof bookingSchema>;

function randomCode(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const bookingAgent = new Agent({
  id: 'booking-agent',
  name: 'Booking Agent',
  description: 'Finalizes transport and lodging reservations by calling the finalizeTripReservations tool.',
  instructions: `You are the booking specialist inside a multi-agent travel planner.

Treat prior conversation turns as valid context.
Only ask for a field when it is genuinely missing or ambiguous.

Only act when the user clearly wants to reserve, book, finalize, or lock in the trip.

If destination is missing, ask: Destination: {{::country[destination|JP]}}
If travel origin is missing, ask: Travelling from: {{::country[origin|GB]}}
If dates are missing, ask: Departure {{::date-picker[departure]}} Return {{::date-picker[return]}}
If traveller count is missing, ask: {{+[travelers|2]-}} travellers
If stay type is missing, ask: Stay type: {{::select[stay_type|hotel,airbnb,hostel,resort,guesthouse,other]}}

Call \`finalizeTripReservations\` only when destination, origin, dates, travellers, and stay type are known.
Use browser execution when the user explicitly asks you to book or reserve the trip, unless the tool decides a mock fallback is safer.
After the tool finishes, respond with one short sentence at most.`,
  model: models.agent,
  tools: () => ({
    finalizeTripReservations: finalizeTripReservationsTool,
  }),
});

export async function runBooking(params: {
  destination: string;
  origin: string;
  dates: { from: string; to: string };
  travelers: number;
  stayType: z.infer<typeof stayTypeSchema>;
  budget?: number;
  selectedFlight?: z.infer<typeof selectedFlightSchema>;
  selectedLodging?: z.infer<typeof selectedLodgingSchema>;
  executionMode?: z.infer<typeof executionModeSchema>;
}): Promise<BookingData> {
  const transport = await runTransport({
    destination: params.destination,
    origin: params.origin,
    dates: params.dates,
    travelers: params.travelers,
  });

  const lodging = await runLodging({
    destination: params.destination,
    stayType: params.stayType,
    dates: params.dates,
    travelers: params.travelers,
    budget: params.budget,
  });

  const browserCapable = isBrowserExecutionAvailable();
  const requestedMode = params.executionMode ?? 'auto';
  const executionMode: 'mock' | 'browser' =
    requestedMode === 'browser'
      ? (browserCapable ? 'browser' : 'mock')
      : requestedMode === 'auto'
        ? (browserCapable ? 'browser' : 'mock')
        : 'mock';

  const selectedFlight =
    params.selectedFlight
      ? transport.flights.find((flight) =>
          flight.airline === params.selectedFlight?.airline &&
          flight.departTime === params.selectedFlight?.departTime &&
          flight.arrivalTime === params.selectedFlight?.arrivalTime
        ) ?? transport.flights[0]
      : transport.flights[0];

  const selectedLodging =
    params.selectedLodging
      ? lodging.options.find((option) =>
          option.name === params.selectedLodging?.name &&
          option.provider === params.selectedLodging?.provider &&
          option.neighborhood === params.selectedLodging?.neighborhood
        ) ?? lodging.options[0]
      : lodging.options[0];

  const reservations: BookingData['reservations'] = [];
  const browserTasks: BookingData['browserTasks'] = [];

  if (selectedFlight) {
    const bookingUrl = 'https://www.google.com/travel/flights';
    const transportStatus = executionMode === 'browser' ? 'browser-attempted' : 'prepared';

    reservations.push({
      kind: 'transport',
      provider: selectedFlight.airline,
      title: `${selectedFlight.airline} ${transport.route}`,
      status: transportStatus,
      confirmationCode: randomCode('AIR'),
      price: `$${selectedFlight.price.toLocaleString()} per person`,
      details: `${selectedFlight.departTime} to ${selectedFlight.arrivalTime} · ${selectedFlight.duration} · ${selectedFlight.stops === 0 ? 'Direct' : `${selectedFlight.stops} stop${selectedFlight.stops > 1 ? 's' : ''}`}`,
      bookingUrl,
    });

    if (executionMode === 'browser') {
      browserTasks.push(
        await executeBrowserFlow({
          label: 'Transport reservation',
          startUrl: bookingUrl,
          instruction: `Search for the best matching flight from ${params.origin} to ${params.destination} for ${params.travelers} traveller${params.travelers > 1 ? 's' : ''}, departing ${params.dates.from} and returning ${params.dates.to}. Try to find a result close to ${selectedFlight.airline}, around $${selectedFlight.price} per person, and proceed through the booking flow until passenger details or payment would be required.`,
        })
      );
    }
  }

  const lodgingUrl =
    selectedLodging.bookingUrl ??
    (params.stayType === 'airbnb' ? 'https://www.airbnb.com/' : 'https://www.booking.com/');
  const lodgingStatus = executionMode === 'browser' ? 'browser-attempted' : 'prepared';

  reservations.push({
    kind: 'lodging',
    provider: selectedLodging.provider,
    title: selectedLodging.name,
    status: lodgingStatus,
    confirmationCode: randomCode('STAY'),
    price: `$${selectedLodging.totalPrice.toLocaleString()} total`,
    details: `${selectedLodging.neighborhood} · ${selectedLodging.stayType} · rated ${selectedLodging.rating.toFixed(1)}/5`,
    bookingUrl: lodgingUrl,
  });

  if (executionMode === 'browser') {
    browserTasks.push(
      await executeBrowserFlow({
        label: 'Lodging reservation',
        startUrl: lodgingUrl,
        instruction: `Search for a ${params.stayType} stay in ${params.destination} for ${params.travelers} traveller${params.travelers > 1 ? 's' : ''} from ${params.dates.from} to ${params.dates.to}. Try to match ${selectedLodging.name} or a close equivalent in ${selectedLodging.neighborhood}, then continue through the reservation flow until guest details or payment would be required.`,
      })
    );
  }

  const browserSuccess = browserTasks.some((task) => task.status === 'completed' || task.status === 'partial');

  return {
    destination: params.destination,
    executionMode,
    summary:
      executionMode === 'browser'
        ? browserSuccess
          ? `I prepared live reservation flows for your transport and stay in ${params.destination}.`
          : `I assembled your reservations for ${params.destination}, but the browser execution fell back to demo-safe preparation.`
        : `I prepared your transport and stay reservations for ${params.destination} in demo mode.`,
    reservations,
    browserTasks,
    nextStep:
      executionMode === 'browser'
        ? 'Review the browser execution results and continue from the saved session if a provider paused for login or payment.'
        : 'Switch browser execution on with Stagehand credentials when you want live provider automation.',
  };
}

export const finalizeTripReservationsTool = createTool({
  id: 'finalizeTripReservations',
  description: 'Reserve transport and lodging for a fully confirmed trip. Uses Stagehand browser execution when available, otherwise creates demo reservations.',
  inputSchema: z.object({
    destination: z.string().describe('Destination city or region'),
    origin: z.string().describe('Departure city or country'),
    dates: z.object({
      from: z.string(),
      to: z.string(),
    }).describe('Travel dates'),
    travelers: z.number().describe('Number of travellers'),
    stayType: stayTypeSchema.describe('Preferred lodging type'),
    budget: z.number().optional().describe('Budget per person in USD'),
    selectedFlight: selectedFlightSchema.describe('User-selected flight option if one was chosen').optional(),
    selectedLodging: selectedLodgingSchema.describe('User-selected lodging option if one was chosen').optional(),
    executionMode: executionModeSchema.optional().describe('Use browser automation, mock reservations, or auto mode'),
  }),
  execute: async (input) => {
    return runBooking(input);
  },
});
