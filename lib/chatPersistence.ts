import type { UIMessage } from "ai";

export type PersistedChatMessage = {
  id: string;
  role: UIMessage["role"];
  parts: Record<string, unknown>[];
};

export type PersistedChatSnapshot = {
  messages: PersistedChatMessage[];
  controlValues: Record<string, unknown>;
};

export type PersistedChatSession = PersistedChatSnapshot & {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

export function getSessionTitleFromPrompt(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New session";
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

export function toConvexSafeSnapshot(
  messages: UIMessage[],
  controlValues: Record<string, unknown>
): PersistedChatSnapshot {
  const sanitizedMessages = messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: sanitizeMessageParts((message as UIMessage & { parts?: unknown[] }).parts),
  }));

  return JSON.parse(
    JSON.stringify({
      messages: sanitizedMessages,
      controlValues,
    })
  ) as PersistedChatSnapshot;
}

function sanitizeMessageParts(parts: unknown[] | undefined) {
  if (!Array.isArray(parts)) return [];

  return parts
    .map((part) => sanitizeMessagePart(part))
    .filter((part): part is Record<string, unknown> => part !== null);
}

function sanitizeMessagePart(part: unknown): Record<string, unknown> | null {
  if (!part || typeof part !== "object") return null;

  const candidate = part as Record<string, unknown>;
  const type = typeof candidate.type === "string" ? candidate.type : null;
  if (!type) return null;

  if (type === "text") {
    return {
      type,
      text: typeof candidate.text === "string" ? candidate.text : "",
      state: typeof candidate.state === "string" ? candidate.state : undefined,
    };
  }

  if (type === "step-start") {
    return { type };
  }

  if (type === "tool-invocation") {
    const invocation =
      candidate.toolInvocation && typeof candidate.toolInvocation === "object"
        ? (candidate.toolInvocation as Record<string, unknown>)
        : null;

    if (!invocation) return null;

    return {
      type,
      toolInvocation: {
        toolName: typeof invocation.toolName === "string" ? invocation.toolName : undefined,
        state: typeof invocation.state === "string" ? invocation.state : undefined,
        result: invocation.result,
      },
    };
  }

  if (type.startsWith("tool-") && !type.startsWith("tool-agent-") && type !== "data-tool-agent") {
    return {
      type,
      toolName: typeof candidate.toolName === "string" ? candidate.toolName : undefined,
      state: typeof candidate.state === "string" ? candidate.state : undefined,
      output: candidate.output,
      toolCallId: typeof candidate.toolCallId === "string" ? candidate.toolCallId : undefined,
    };
  }

  return null;
}
