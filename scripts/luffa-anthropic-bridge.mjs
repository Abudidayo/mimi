import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2] ?? '';
    value = value.trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
loadEnvFile(path.join(cwd, '.env.local'));
loadEnvFile(path.join(cwd, '.env'));

const LUFFA_SECRET = process.env.LUFFA_BOT_SECRET || process.env.LUFFA_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const POLL_INTERVAL_MS = Number(process.env.LUFFA_POLL_INTERVAL_MS || 1000);
const MAX_REPLY_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 700);
const SYSTEM_PROMPT =
  process.env.LUFFA_SYSTEM_PROMPT ||
  'You are a helpful assistant inside the Luffa chat platform. Keep replies concise, useful, and friendly.';

if (!LUFFA_SECRET) {
  throw new Error('Missing LUFFA_BOT_SECRET (or LUFFA_SECRET) in environment.');
}
if (!ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY in environment.');
}

const seenMsgIds = new Set();
const seenQueue = [];
const MAX_SEEN = 5000;

function remember(msgId) {
  if (!msgId || seenMsgIds.has(msgId)) return;
  seenMsgIds.add(msgId);
  seenQueue.push(msgId);
  while (seenQueue.length > MAX_SEEN) {
    const oldest = seenQueue.shift();
    if (oldest) seenMsgIds.delete(oldest);
  }
}

function isSeen(msgId) {
  return !!msgId && seenMsgIds.has(msgId);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeMessage(raw) {
  if (!raw) return null;

  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;

  let text = raw.trim();
  if (!text) return null;

  if (text.startsWith("'") && text.endsWith("'")) {
    text = text.slice(1, -1);
  }

  let parsed = safeJsonParse(text);
  if (typeof parsed === 'string') parsed = safeJsonParse(parsed);
  if (parsed && typeof parsed === 'object') return parsed;

  if (text.startsWith('"') && text.endsWith('"')) {
    const unquoted = text.slice(1, -1).replace(/\\"/g, '"');
    parsed = safeJsonParse(unquoted);
    if (parsed && typeof parsed === 'object') return parsed;
  }

  return null;
}

function extractTextFromAnthropic(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

async function luffaReceive() {
  const response = await fetch('https://apibot.luffa.im/robot/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: LUFFA_SECRET }),
  });

  if (!response.ok) {
    throw new Error(`Luffa receive failed: ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function anthropicReply(userText) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  const text = extractTextFromAnthropic(payload?.content);
  return text || 'Sorry, I could not generate a response right now.';
}

async function luffaSendSingle(uid, text) {
  const response = await fetch('https://apibot.luffa.im/robot/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: LUFFA_SECRET,
      uid,
      msg: JSON.stringify({ text }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Luffa send failed: ${response.status}`);
  }
}

async function luffaSendGroup(uid, text) {
  const response = await fetch('https://apibot.luffa.im/robot/sendGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: LUFFA_SECRET,
      uid,
      type: '1',
      msg: JSON.stringify({ text }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Luffa sendGroup failed: ${response.status}`);
  }
}

async function handleConversation(conversation) {
  const type = String(conversation?.type ?? '0');
  const targetUid = conversation?.uid;
  const rawMessages = Array.isArray(conversation?.message) ? conversation.message : [];

  for (const raw of rawMessages) {
    const msgObj = normalizeMessage(raw);
    if (!msgObj) continue;

    const msgId = String(msgObj.msgId || '');
    if (isSeen(msgId)) continue;
    remember(msgId);

    const text = String(msgObj.text || '').trim();
    if (!text) continue;

    try {
      const reply = await anthropicReply(text);
      if (type === '1') {
        await luffaSendGroup(targetUid, reply);
      } else {
        await luffaSendSingle(targetUid, reply);
      }
      console.log(`[reply] type=${type} target=${targetUid} msgId=${msgId}`);
    } catch (error) {
      console.error(`[error] reply failed msgId=${msgId}`, error);
    }
  }
}

async function run() {
  console.log('Luffa <> Anthropic bridge started.');
  console.log(`Model: ${ANTHROPIC_MODEL}`);
  console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);

  while (true) {
    try {
      const conversations = await luffaReceive();
      for (const convo of conversations) {
        await handleConversation(convo);
      }
    } catch (error) {
      console.error('[error] polling loop failed', error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

run().catch((error) => {
  console.error('[fatal]', error);
  process.exit(1);
});
