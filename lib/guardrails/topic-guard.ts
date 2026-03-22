/**
 * Topic guardrail — keeps Mimi focused on travel.
 *
 * Uses a direct AI SDK `generateObject` call for classification (fail-closed).
 * Two exports:
 *  1. TopicGuardProcessor — Mastra Processor for the supervisor agent (inputProcessors)
 *  2. checkTopicGuard()   — standalone async function for API routes (Luffa, plan-trip)
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@/lib/providers/openrouter';
import type { Processor, ProcessInputArgs } from '@mastra/core/processors';
import type { MastraDBMessage } from '@mastra/core/memory';

const REDIRECT_MESSAGE =
  "I'm Mimi, your travel planning assistant! I'm best at helping with trip planning, destinations, flights, hotels, visas, and everything travel-related. What trip can I help you plan?";

const CLASSIFIER_SYSTEM = `You are a topic classifier for a travel planning AI called Mimi.

Return on_topic: true if the message is related to ANY of these:
- Travel, trips, vacations, holidays, destinations, sightseeing
- Flights, airlines, airports, transport, trains, buses, ferries
- Hotels, hostels, Airbnb, resorts, accommodation, lodging
- Visa, passport, immigration, customs
- Currency, exchange rates, budget, costs
- Weather, climate, seasons at destinations
- Food, restaurants, cuisine at travel destinations
- Safety, crime, scams, travel advisories
- Events, festivals, concerts at destinations
- Shopping, souvenirs, markets at destinations
- Packing, luggage, travel gear
- Calendar export, itinerary sharing, trip planning tools
- General conversation: greetings, follow-ups, yes/no, thanks, short replies, numbers

Return on_topic: false if the message is about:
- Programming, code, scripts, software development
- Math, homework, essays, academic work
- Medical or legal advice
- Cooking recipes, workout plans, diet plans
- Stock market, crypto, finance (not travel budget)
- Writing poems, stories, songs, emails (not travel-related)
- Any topic clearly unrelated to travel or trip planning

Short messages (under 15 chars), numbers, and greetings are ALWAYS on_topic.`;

const classificationSchema = z.object({
  on_topic: z.boolean().describe('true if the message is travel-related or general conversation, false if off-topic'),
});

// Fast-path checks (no LLM needed)
function isFastAllow(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length <= 15 || /^\d+$/.test(trimmed)) return true;
  if (/^(hi|hey|hello|thanks|thank you|yes|no|ok|sure|please|help)\b/i.test(trimmed)) return true;
  return false;
}

/**
 * Classify a message using Haiku. Returns true if on-topic, false if off-topic.
 * Fail-closed: if the LLM call fails, we block the message.
 */
async function classifyMessage(text: string): Promise<boolean> {
  const { object } = await generateObject({
    model: models.fast,
    schema: classificationSchema,
    system: CLASSIFIER_SYSTEM,
    prompt: text,
    temperature: 0,
  });
  return object.on_topic;
}

// ── Standalone async function (for API routes) ─────────────────────

export interface TopicGuardResult {
  allowed: boolean;
  reason?: string;
  redirectMessage?: string;
}

export async function checkTopicGuard(message: string): Promise<TopicGuardResult> {
  const trimmed = message.trim();
  if (isFastAllow(trimmed)) {
    console.log('[TopicGuard] Fast-allow:', trimmed);
    return { allowed: true };
  }

  try {
    console.log('[TopicGuard] Classifying:', trimmed);
    const onTopic = await classifyMessage(trimmed);
    console.log('[TopicGuard] Result:', onTopic);
    if (onTopic) return { allowed: true };
    return { allowed: false, reason: 'off-topic', redirectMessage: REDIRECT_MESSAGE };
  } catch (err) {
    // Fail-closed: if classification fails, block the message
    console.error('[TopicGuard] Classification failed, blocking message:', err);
    return { allowed: false, reason: 'classification-error', redirectMessage: REDIRECT_MESSAGE };
  }
}

// ── Mastra Processor (for the supervisor agent inputProcessors) ────

export class TopicGuardProcessor implements Processor<'topic-guard'> {
  readonly id = 'topic-guard' as const;
  readonly name = 'Topic Guard';

  async processInput({ messages, abort }: ProcessInputArgs): Promise<MastraDBMessage[]> {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return messages;

    // Extract text content
    const content = lastUserMsg.content;
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (content && typeof content === 'object' && 'content' in content) {
      const inner = (content as { content: unknown }).content;
      if (typeof inner === 'string') {
        text = inner;
      } else if (Array.isArray(inner)) {
        text = inner
          .filter((p: { type?: string }) => p.type === 'text')
          .map((p: { text?: string }) => p.text ?? '')
          .join(' ');
      }
    }

    if (!text) return messages;
    if (isFastAllow(text)) return messages;

    try {
      const onTopic = await classifyMessage(text.trim());
      if (!onTopic) {
        abort(REDIRECT_MESSAGE);
      }
    } catch (err) {
      // Fail-closed: block on error
      console.error('[TopicGuard] Classification failed, blocking:', err);
      abort(REDIRECT_MESSAGE);
    }

    return messages;
  }
}
