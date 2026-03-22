import '@/lib/zod-compat';
import { mastra } from '@/mastra';
import { NextResponse } from 'next/server';

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

    // Get or create conversation history
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    const history = conversations.get(conversationId)!;

    // Add user message
    history.push({ role: 'user', content: message });

    // Keep last 20 messages to avoid token overflow
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Call the supervisor agent (non-streaming)
    const supervisor = mastra.getAgent('supervisor');
    const result = await supervisor.generate(history);

    // Extract text from the result
    let responseText = '';
    if (typeof result.text === 'string') {
      responseText = result.text;
    }

    // Clean inline UI controls for plain text chat
    const cleaned = cleanForChat(responseText);

    // Save assistant reply to history
    history.push({ role: 'assistant', content: cleaned });

    return NextResponse.json({ reply: cleaned });
  } catch (err) {
    console.error('[Luffa API]', err);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    );
  }
}
