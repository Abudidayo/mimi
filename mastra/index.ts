import { Mastra } from '@mastra/core';
import { safetyAgent } from './agents/safety';
import { weatherAgent } from './agents/weather';
import { currencyAgent } from './agents/currency';
import { visaAgent } from './agents/visa';
import { eventsAgent } from './agents/events';
import { shoppingAgent } from './agents/shopping';
import { flightsAgent } from './agents/flights';
import { lodgingAgent } from './agents/lodging';
import { bookingAgent } from './agents/booking';
import { plannerAgent } from './agents/planner';
import { suggestionsAgent } from './agents/suggestions';
import { supervisorAgent } from './agents/supervisor';
import { calendarAgent } from './agents/calendar';

export const mastra = new Mastra({
  agents: {
    safetyAgent,
    weatherAgent,
    currencyAgent,
    visaAgent,
    eventsAgent,
    shoppingAgent,
    flightsAgent,
    lodgingAgent,
    bookingAgent,
    plannerAgent,
    suggestionsAgent,
    calendarAgent,
    supervisor: supervisorAgent,
  },
});
