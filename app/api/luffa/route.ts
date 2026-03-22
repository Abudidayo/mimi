import '@/lib/zod-compat';
import { mastra } from '@/mastra';
import { NextResponse } from 'next/server';
import { checkTopicGuard } from '@/lib/guardrails/topic-guard';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Luffa bridge endpoint.
 * Accepts { message, conversationId? } and returns plain text
 * from the supervisor agent — no streaming, no inline UI controls.
 */

// Per-conversation message history (in-memory, resets on deploy)
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

// Country code → name for cleaning inline UI
const COUNTRY_NAMES: Record<string, string> = {
  JP: 'Japan', US: 'United States', GB: 'United Kingdom', FR: 'France',
  ID: 'Indonesia', TH: 'Thailand', KR: 'South Korea', IT: 'Italy',
  ES: 'Spain', DE: 'Germany', AU: 'Australia', MX: 'Mexico',
  GR: 'Greece', PT: 'Portugal', BR: 'Brazil', IN: 'India',
  CN: 'China', SG: 'Singapore', AE: 'UAE', NZ: 'New Zealand',
  CA: 'Canada', TR: 'Turkey', EG: 'Egypt', MA: 'Morocco',
  PE: 'Peru', CO: 'Colombia', VN: 'Vietnam', PH: 'Philippines',
  MY: 'Malaysia', HK: 'Hong Kong', MV: 'Maldives', HR: 'Croatia',
  CZ: 'Czech Republic', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway',
  CH: 'Switzerland', AT: 'Austria', IE: 'Ireland', IS: 'Iceland',
};

/** Strip inline UI controls and markdown into clean readable text */
function cleanForChat(text: string): string {
  return text
    // Country picker → country name
    .replace(/\{\{::country\[(\w+)\|(\w+)\]\}\}/g, (_m, _id, code) => COUNTRY_NAMES[code] ?? code)
    // Date picker → readable date
    .replace(/\{\{::date-picker\[(\w+)\|(\d{4}-\d{2}-\d{2})\]\}\}/g, (_m, _id, date) => {
      try {
        return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch { return date; }
    })
    .replace(/\{\{::date-picker\[[^\]]*\]\}\}/g, '')
    // Stepper (budget): {{+[$budget|3000]-}} → "$3000"
    .replace(/\{\{\+\[\$(\w+)\|(\d+)\]-\}\}/g, (_m, _id, val) => `$${val}`)
    // Stepper (regular): {{+[travelers|2]-}} → "2"
    .replace(/\{\{\+\[(\w+)\|(\d+)\]-\}\}/g, (_m, _id, val) => val)
    // Select: {{::select[pace|relaxed,moderate,packed]}} → "relaxed"
    .replace(/\{\{::select\[\w+\|([^,\]]+)[^\]]*\]\}\}/g, (_m, first) => first)
    // Toggles checked: {{[x] Culture & history}} → "Culture & history"
    .replace(/\{\{[xX]\]\s*([^}]+)\}\}/g, (_m, label) => label.trim())
    // Toggles unchecked: remove
    .replace(/\{\{\[\s\]\s*([^}]+)\}\}/g, '')
    // Any remaining controls
    .replace(/\{\{[^}]*\}\}/g, '')
    // Strip markdown
    .replace(/```[\s\S]*?```/g, '')           // code blocks
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/\*{2,}/g, '')                   // all ** and *** (bold/bold-italic)
    .replace(/(?<!\w)\*(?!\w)/g, '')          // stray lone *
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
    .replace(/^[-*+]\s+/gm, '- ')            // bullet lists
    .replace(/·/g, ', ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(req: Request) {
  try {
    const { message, conversationId = 'default' } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Topic guardrail — block off-topic requests
    const guard = await checkTopicGuard(message);
    if (!guard.allowed) {
      return NextResponse.json({ reply: guard.redirectMessage, isNewConversation: false });
    }

    // Get or create conversation history
    const isNewConversation = !conversations.has(conversationId);
    if (isNewConversation) {
      conversations.set(conversationId, []);
    }
    const history = conversations.get(conversationId)!;

    // Add user message
    history.push({ role: 'user', content: message });

    // Keep last 20 messages to avoid token overflow
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Prepend a Luffa-context system note as the first user message if this is a fresh conversation
    const luffaContext = history.length === 1
      ? [
          {
            role: 'user' as const,
            content: '[SYSTEM NOTE: You are responding inside Luffa, a mobile text chat app. There are NO UI cards, NO inline controls, NO date pickers, NO buttons — plain text only. ALWAYS present choices as numbered lists (1. Option\n2. Option\n3. Option) so the user can reply with just a number. This applies to destinations, activities, hotels, food, budgets — any time you offer options. Ask follow-up questions as plain text. Keep responses concise and mobile-friendly.]',
          },
          ...history,
        ]
      : history;

    // Call the supervisor agent (non-streaming)
    const supervisor = mastra.getAgent('supervisor');
    const result = await supervisor.generate(luffaContext);

    // Extract text from the result
    let responseText = '';
    if (typeof result.text === 'string') {
      responseText = result.text;
    }

    // Clean inline UI controls for plain text chat
    const cleaned = cleanForChat(responseText);

    // Save assistant reply to history
    history.push({ role: 'assistant', content: cleaned });

    return NextResponse.json({ reply: cleaned, isNewConversation });
  } catch (err) {
    console.error('[Luffa API]', err);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const { conversationId = 'default' } = await req.json().catch(() => ({}));
  conversations.delete(conversationId);
  return NextResponse.json({ ok: true });
}
