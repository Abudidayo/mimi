import Anthropic from '@anthropic-ai/sdk';
import { getTokens } from '@civic/auth/nextjs';
import { readFileSync } from 'fs';
import { join } from 'path';

/** Read a key from .env.local if process.env has it empty/missing. */
function envOrFile(key: string): string | undefined {
  const val = process.env[key];
  if (val) return val;

  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const k = trimmed.slice(0, eqIdx);
      let v = trimmed.slice(eqIdx + 1);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k === key && v) return v;
    }
  } catch { /* file not found */ }

  return undefined;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = envOrFile('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Gets the Civic access token for the current user.
 *
 * In production: uses Civic Auth per-user session (getTokens).
 * In development: falls back to the static CIVIC_TOKEN from .env.local.
 */
async function getCivicToken(): Promise<string> {
  // Try per-user Civic Auth token first
  try {
    const tokens = await getTokens();
    if (tokens?.accessToken) return tokens.accessToken;
  } catch {
    // getTokens() fails outside of a request context or if Civic Auth
    // isn't configured yet — fall back to static token.
  }

  // Fallback: static dev token
  const staticToken = envOrFile('CIVIC_TOKEN');
  if (staticToken) return staticToken;

  throw new Error('No Civic token available. Log in or set CIVIC_TOKEN in .env.local.');
}

type Message = { role: 'user' | 'assistant'; content: Anthropic.MessageParam['content'] };

/**
 * Sends a prompt to Claude with Civic MCP tools available.
 * Automatically loops through tool calls until Claude finishes.
 *
 * Uses the per-user Civic Auth token when available,
 * falls back to static CIVIC_TOKEN for development.
 */
export async function callCivic(prompt: string, maxTokens = 4096, model = 'claude-sonnet-4-20250514') {
  const civicUrl = envOrFile('CIVIC_URL') ?? 'https://app.civic.com/hub/mcp';
  const civicToken = await getCivicToken();
  const client = getClient();

  const messages: Message[] = [{ role: 'user', content: prompt }];

  const mcpServerConfig = {
    type: 'url',
    name: 'civic',
    url: civicUrl,
    authorization_token: civicToken,
  };

  const mcpToolset = { type: 'mcp_toolset', mcp_server_name: 'civic' };

  const MAX_TURNS = 15;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const body = {
      model,
      max_tokens: maxTokens,
      messages,
      tools: [mcpToolset],
      mcp_servers: [mcpServerConfig],
    };

    const response = await client.messages.create(
      body as unknown as Anthropic.MessageCreateParamsNonStreaming,
      {
        headers: {
          'anthropic-beta': 'mcp-client-2025-11-20',
        },
      },
    );

    // If Claude is done (no more tool calls), return the final response
    if (response.stop_reason === 'end_turn' || response.stop_reason !== 'tool_use') {
      return response;
    }

    // Claude wants to use tools — add assistant response and continue
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      return response;
    }

    // Add tool results — the MCP connector executes tools server-side
    messages.push({
      role: 'user',
      content: toolUseBlocks.map((block) => ({
        type: 'tool_result' as const,
        tool_use_id: block.id,
        content: 'Tool executed via MCP connector.',
      })),
    });
  }

  throw new Error('Exceeded maximum tool call turns');
}

/**
 * Extracts text content from a Claude response.
 */
export function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}
