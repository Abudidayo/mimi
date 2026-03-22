import '@/lib/zod-compat';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';
import { checkTopicGuard } from '@/lib/guardrails/topic-guard';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const params = await req.json();

  // Topic guardrail — block off-topic requests before they reach the agent
  // Also enforced by TopicGuardProcessor on the supervisor (Mastra inputProcessors) as defense-in-depth
  const messages = params?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    const userText =
      typeof lastMsg?.content === 'string'
        ? lastMsg.content
        : Array.isArray(lastMsg?.content)
          ? lastMsg.content.filter((p: { type?: string }) => p.type === 'text').map((p: { text?: string }) => p.text ?? '').join(' ')
          : '';

    if (userText) {
      const guard = await checkTopicGuard(userText);
      if (!guard.allowed) {
        const redirectStream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({ type: 'text', text: guard.redirectMessage ?? "I'm Mimi, your travel assistant! How can I help you plan a trip?" } as never);
          },
        });
        return createUIMessageStreamResponse({ stream: redirectStream });
      }
    }
  }

  const stream = await handleChatStream({
    mastra,
    agentId: 'supervisor',
    params,
  });

  const normalizedStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const reader = (stream as ReadableStream<unknown>).getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value || typeof value !== 'object') continue;

        const part = value as Record<string, unknown>;
        writer.write(part as never);

        if (part.type !== 'tool-output-available') continue;

        const output = part.output;
        if (!output || typeof output !== 'object') continue;

        const subAgentToolResults = (output as { subAgentToolResults?: unknown }).subAgentToolResults;
        if (!Array.isArray(subAgentToolResults)) continue;

        for (const nestedResult of subAgentToolResults) {
          if (!nestedResult || typeof nestedResult !== 'object') continue;

          const toolCall = nestedResult as {
            toolCallId?: string;
            toolName?: string;
            args?: unknown;
            result?: unknown;
          };

          if (!toolCall.toolCallId || !toolCall.toolName) continue;

          writer.write({
            type: 'tool-input-available',
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.args ?? {},
          } as never);

          writer.write({
            type: 'tool-output-available',
            toolCallId: toolCall.toolCallId,
            output: toolCall.result ?? null,
          } as never);
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream: normalizedStream });
}
