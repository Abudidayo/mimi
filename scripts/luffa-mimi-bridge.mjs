#!/usr/bin/env node

/**
 * Luffa ↔ Mimi Bridge
 *
 * Polls Luffa for incoming messages, sends them to the local
 * /api/luffa endpoint (which runs Mimi via Mastra supervisor),
 * and replies back through Luffa.
 *
 * Usage:
 *   node scripts/luffa-mimi-bridge.mjs
 *   # or
 *   npm run bot:mimi
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Load .env ──────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = (match[2] ?? '').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
  return true;
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, '.env.local'));
loadEnvFile(path.join(cwd, '.env'));

// ── Config ─────────────────────────────────────────────────
const LUFFA_SECRET = process.env.LUFFA_BOT_SECRET || process.env.LUFFA_SECRET;
const POLL_INTERVAL = Number(process.env.LUFFA_POLL_INTERVAL_MS) || 1000;
const MIMI_URL = process.env.MIMI_URL || 'http://localhost:3000/api/luffa';

if (!LUFFA_SECRET) {
  console.error('❌ Missing LUFFA_BOT_SECRET in .env.local or .env');
  process.exit(1);
}

console.log('🤖 Luffa ↔ Mimi Bridge starting...');
console.log(`   Luffa secret: ${LUFFA_SECRET.slice(0, 6)}...`);
console.log(`   Mimi endpoint: ${MIMI_URL}`);
console.log(`   Poll interval: ${POLL_INTERVAL}ms\n`);

// ── State ──────────────────────────────────────────────────
const seen = new Set();           // de-duplicate by msgId
const welcomed = new Set();       // groups/users that already got welcome buttons
const lastBotReply = new Map();   // conversationId → last bot message (for numbered option mapping)
let totalPolls = 0;
let totalMessages = 0;

/**
 * Extract numbered options from a bot message.
 * Matches patterns like "1. Tokyo" or "1) Tokyo"
 * Returns a map: { "1": "Tokyo", "2": "Kyoto", ... }
 */
function extractNumberedOptions(text) {
  const options = {};
  const regex = /^(\d+)[.)]\s*(.+)/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    options[match[1]] = match[2].trim();
  }
  return options;
}

/**
 * If the user's message is just a number, try to map it to an option
 * from the last bot reply.
 */
function resolveNumberedReply(text, conversationId) {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return text;

  const lastReply = lastBotReply.get(conversationId);
  if (!lastReply) return text;

  const options = extractNumberedOptions(lastReply);
  if (options[trimmed]) {
    console.log(`  🔢 Mapped "${trimmed}" → "${options[trimmed]}"`);
    return options[trimmed];
  }
  return text;
}

// ── Suggested quick-reply buttons shown at conversation start ──
const WELCOME_BUTTONS = [
  { name: '🗺️ Plan a trip',        selector: 'I want to plan a trip'           },
  { name: '✈️ Find flights',        selector: 'Help me find flights'             },
  { name: '🏨 Find hotels',         selector: 'Help me find hotels'              },
  { name: '💡 Surprise me',         selector: 'Surprise me with a destination'   },
  { name: '💰 Budget breakdown',    selector: 'Give me a budget breakdown'        },
  { name: '🔄 Start over',          selector: '__reset__', isHidden: '1'          },
];

const RESET_COMMAND = '__reset__';

// Selectors that map to a quick-reply — treat them as normal messages
const BUTTON_SELECTORS = new Set(WELCOME_BUTTONS.map((b) => b.selector));

// ── Luffa API helpers ──────────────────────────────────────
async function pollLuffa() {
  const res = await fetch('https://apibot.luffa.im/robot/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: LUFFA_SECRET }),
  });
  if (!res.ok) throw new Error(`Luffa poll ${res.status}`);
  const payload = await res.json();
  // Response is an array of envelopes: [{ uid, count, message: [jsonString], type }]
  return Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
}

/** Send plain text — DM or group */
async function sendLuffa(replyTo, text, isGroup = false) {
  const endpoint = isGroup
    ? 'https://apibot.luffa.im/robot/sendGroup'
    : 'https://apibot.luffa.im/robot/send';

  const msg = JSON.stringify({ text });
  const body = { secret: LUFFA_SECRET, uid: replyTo, msg };
  if (isGroup) body.type = '1';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ Luffa send failed: ${res.status} ${err}`);
  }
}

/**
 * Send a message with clickable buttons (group chats only).
 * Button clicks come back as normal text messages where text === selector.
 */
async function sendLuffaButtons(groupId, text, buttons) {
  const msg = JSON.stringify({
    text,
    button: buttons.map((b) => ({ name: b.name, selector: b.selector, isHidden: 0 })),
    dismissType: 'select',
  });
  const res = await fetch('https://apibot.luffa.im/robot/sendGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: LUFFA_SECRET, uid: groupId, type: '2', msg }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ Luffa button send failed: ${res.status} ${err}`);
  }
}

// ── Mimi API ───────────────────────────────────────────────
async function askMimi(message, conversationId) {
  const res = await fetch(MIMI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Mimi API ${res.status}: ${msg}`);
  }

  const data = await res.json();
  return { reply: data.reply || '(no response)', isNewConversation: data.isNewConversation ?? false };
}

async function resetMimi(conversationId) {
  const res = await fetch(MIMI_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ Reset failed: ${res.status} ${err}`);
  } else {
    console.log(`  🔄 Conversation ${conversationId} reset`);
  }
}

// ── Normalise Luffa message ────────────────────────────────
/**
 * Luffa returns envelopes like:
 *   { uid, count, message: [jsonString, ...], type: "0"|"1" }
 * where type 0 = DM, type 1 = group.
 * Each jsonString looks like:
 *   DM:    {"atList":[],"text":"hello","urlLink":null,"msgId":"..."}
 *   Group: {"uid":"senderLuffaId","atList":[],"text":"hello","urlLink":null,"msgId":"..."}
 */
function* extractMessages(envelope) {
  const isGroup = String(envelope.type) === '1';
  const envelopeUid = envelope.uid; // recipient (bot) or group ID
  const rawMessages = Array.isArray(envelope.message) ? envelope.message : [];

  for (const raw of rawMessages) {
    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      continue;
    }

    const id = parsed.msgId || `${envelopeUid}-${Date.now()}-${Math.random()}`;
    const text = (parsed.text || '').trim();
    const senderUid = parsed.uid || envelopeUid; // group has sender uid inside
    const replyTo = isGroup ? envelopeUid : envelopeUid; // always reply to envelope uid
    const conversationId = isGroup ? `group-${envelopeUid}` : `user-${envelopeUid}`;

    yield { id, text, senderUid, isGroup, replyTo, conversationId };
  }
}

// ── Main loop ──────────────────────────────────────────────
async function tick() {
  totalPolls++;
  try {
    const messages = await pollLuffa();

    for (const envelope of messages) {
      for (const msg of extractMessages(envelope)) {
      if (!msg.text || seen.has(msg.id)) continue;
      seen.add(msg.id);

      // Keep seen set from growing forever
      if (seen.size > 5000) {
        const arr = [...seen];
        arr.splice(0, 2500);
        seen.clear();
        arr.forEach((v) => seen.add(v));
      }

      totalMessages++;
      const ts = new Date().toLocaleTimeString();
      console.log(`[${ts}] 📩 ${msg.isGroup ? 'Group' : 'DM'} from ${msg.senderUid}: "${msg.text.slice(0, 80)}"`);

      // Handle "Start over" — reset command from button or text in DM
      const isReset = msg.text === RESET_COMMAND || (!msg.isGroup && /^(6|start over|reset|\/start)$/i.test(msg.text.trim()));
      if (isReset) {
        try {
          await resetMimi(msg.conversationId);
          if (msg.isGroup) {
            await sendLuffaButtons(msg.replyTo, 'Chat cleared! What would you like to do?', WELCOME_BUTTONS);
          } else {
            await sendLuffa(msg.replyTo, `Chat cleared!\n\nWhat would you like to do?\n\n1. Plan a trip\n2. Find flights\n3. Find hotels\n4. Surprise me with a destination\n5. Get a budget breakdown\n6. Start over\n\nReply with a number or just tell me where you want to go!`, false);
          }
        } catch (err) {
          console.error(`  ❌ Reset error:`, err.message);
        }
        continue;
      }

      try {

        // Map numbered replies — first check welcome menu, then last bot reply
        const DM_MENU_MAP = {
          '1': 'I want to plan a trip',
          '2': 'Help me find flights',
          '3': 'Help me find hotels',
          '4': 'Surprise me with a destination',
          '5': 'Give me a budget breakdown',
        };
        let messageText = msg.text;
        if (/^\d+$/.test(messageText.trim())) {
          // Check welcome menu first (only for DMs)
          if (!msg.isGroup && DM_MENU_MAP[messageText.trim()]) {
            messageText = DM_MENU_MAP[messageText.trim()];
          } else {
            // Try mapping from last bot reply's numbered options
            messageText = resolveNumberedReply(messageText, msg.conversationId);
          }
        }

        const { reply } = await askMimi(messageText, msg.conversationId);
        console.log(`[${ts}] 🤖 Mimi: "${reply.slice(0, 80)}..."`);

        // Save last bot reply for numbered option mapping
        lastBotReply.set(msg.conversationId, reply);

        // Luffa has a message length limit — split long replies
        const chunks = splitMessage(reply, 2000);
        for (const chunk of chunks) {
          await sendLuffa(msg.replyTo, chunk, msg.isGroup);
        }
      } catch (err) {
        console.error(`  ❌ Mimi error:`, err.message);
        await sendLuffa(msg.replyTo, "Sorry, I'm having trouble right now. Try again in a moment!", msg.isGroup);
      }
      } // end extractMessages loop
    } // end envelopes loop
  } catch (err) {
    // Only log non-network errors loudly
    if (totalPolls % 60 === 0) {
      console.error(`[poll error] ${err.message}`);
    }
  }
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Try to split at a newline or sentence boundary
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf('. ', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  return chunks;
}

// ── Graceful shutdown ──────────────────────────────────────
let running = true;
process.on('SIGINT', () => {
  console.log(`\n\n📊 Session stats: ${totalPolls} polls, ${totalMessages} messages processed`);
  console.log('👋 Shutting down...');
  running = false;
  process.exit(0);
});

// ── Start ──────────────────────────────────────────────────
console.log('✅ Bridge running. Ctrl+C to stop.\n');

(async () => {
  while (running) {
    await tick();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
})();
