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
const seen = new Set();       // de-duplicate by msgId
let totalPolls = 0;
let totalMessages = 0;

// ── Luffa API helpers ──────────────────────────────────────
async function pollLuffa() {
  const res = await fetch('https://apibot.luffa.im/robot/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: LUFFA_SECRET }),
  });
  if (!res.ok) throw new Error(`Luffa poll ${res.status}`);
  const payload = await res.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

async function sendLuffa(userId, text, isGroup = false) {
  const endpoint = isGroup
    ? 'https://apibot.luffa.im/robot/sendGroup'
    : 'https://apibot.luffa.im/robot/send';

  const body = isGroup
    ? { secret: LUFFA_SECRET, groupChatId: userId, type: '1', content: text }
    : { secret: LUFFA_SECRET, userId, type: '1', content: text };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    console.error(`  ❌ Luffa send failed: ${res.status} ${msg}`);
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

  const { reply } = await res.json();
  return reply || '(no response)';
}

// ── Normalise Luffa message ────────────────────────────────
function extractMessage(msg) {
  const id = msg.msgId || msg.id || `${msg.fromUserId}-${Date.now()}`;
  const text = (msg.text || msg.content || msg.message || '').trim();
  const userId = msg.fromUserId || msg.userId || msg.from;
  const isGroup = !!(msg.groupChatId || msg.isGroup);
  const replyTo = isGroup ? msg.groupChatId : userId;
  // Use a per-user conversation id so each user gets their own Mimi context
  const conversationId = isGroup ? `group-${msg.groupChatId}` : `user-${userId}`;

  return { id, text, userId, isGroup, replyTo, conversationId };
}

// ── Main loop ──────────────────────────────────────────────
async function tick() {
  totalPolls++;
  try {
    const messages = await pollLuffa();

    for (const raw of messages) {
      const msg = extractMessage(raw);
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
      console.log(`[${ts}] 📩 ${msg.isGroup ? 'Group' : 'DM'} from ${msg.userId}: "${msg.text.slice(0, 80)}"`);

      try {
        // Send "typing" indicator — short message while Mimi thinks
        await sendLuffa(msg.replyTo, '...', msg.isGroup);

        const reply = await askMimi(msg.text, msg.conversationId);
        console.log(`[${ts}] 🤖 Mimi: "${reply.slice(0, 80)}..."`);

        // Luffa has a message length limit — split long replies
        const chunks = splitMessage(reply, 2000);
        for (const chunk of chunks) {
          await sendLuffa(msg.replyTo, chunk, msg.isGroup);
        }
      } catch (err) {
        console.error(`  ❌ Mimi error:`, err.message);
        await sendLuffa(msg.replyTo, "Sorry, I'm having trouble right now. Try again in a moment!", msg.isGroup);
      }
    }
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
