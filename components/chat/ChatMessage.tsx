"use client";

import { motion } from "framer-motion";
import { Sparkle, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { InlineUIRenderer } from "@/lib/inline-ui/renderer";
import { AgentPanel, type AgentData, type AgentType } from "@/components/AgentPanel";
import { ActionButtons } from "@/components/chat/ActionButtons";
import { BrowserTimeline } from "@/components/chat/BrowserTimeline";

// Maps each tool name from the API route to its AgentType
const TOOL_TO_AGENT: Record<string, AgentType> = {
  checkSafety:         'safety',
  getWeather:          'weather',
  getCurrency:         'currency',
  checkVisa:           'visa',
  getLocalEvents:      'events',
  getPackingList:      'shopping',
  searchFlights:       'flights',
  getTransportOptions: 'flights',
  findLodging:         'lodging',
  finalizeTripReservations: 'booking',
  tripPlanner:         'itinerary',
  suggestDestinations: 'suggestions',
};

function getAgentTypeForToolName(toolName: string | undefined): AgentType | undefined {
  if (!toolName) return undefined;
  return TOOL_TO_AGENT[toolName];
}

function extractAgentData(parts: unknown[] | undefined): { agentData: AgentData; loadingAgents: Set<AgentType> } {
  const agentData: AgentData = {};
  const loadingAgents = new Set<AgentType>();
  const toolCallNames = new Map<string, string>();

  if (!parts) return { agentData, loadingAgents };

  for (const part of parts) {
    const p = part as Record<string, unknown>;

    if (typeof p.toolCallId === 'string' && typeof p.toolName === 'string') {
      toolCallNames.set(p.toolCallId, p.toolName);
    }

    if (p.type === 'tool-invocation') {
      const invocation = p.toolInvocation as
        | { toolCallId?: string; toolName?: string }
        | undefined;
      if (typeof invocation?.toolCallId === 'string' && typeof invocation.toolName === 'string') {
        toolCallNames.set(invocation.toolCallId, invocation.toolName);
      }
    }

    if (p.type === 'dynamic-tool' && typeof p.toolCallId === 'string' && typeof p.toolName === 'string') {
      toolCallNames.set(p.toolCallId, p.toolName);
    }
  }

  for (const part of parts) {
    const p = part as Record<string, unknown>;

    if (p.type === 'tool-input-available' || p.type === 'tool-output-available') {
      const toolName =
        typeof p.toolName === 'string'
          ? p.toolName
          : typeof p.toolCallId === 'string'
            ? toolCallNames.get(p.toolCallId)
            : undefined;
      const agentKey = getAgentTypeForToolName(toolName);
      if (!agentKey) continue;

      if (p.type === 'tool-output-available' && p.output !== undefined) {
        (agentData as Record<string, unknown>)[agentKey] = p.output;
        loadingAgents.delete(agentKey);
      } else {
        loadingAgents.add(agentKey);
      }
      continue;
    }

    if (p.type === 'dynamic-tool') {
      const toolName = typeof p.toolName === 'string' ? p.toolName : undefined;
      const agentKey = getAgentTypeForToolName(toolName);
      if (!agentKey) continue;

      const state = typeof p.state === 'string' ? p.state : undefined;
      if (state === 'output-available' && p.output !== undefined) {
        (agentData as Record<string, unknown>)[agentKey] = p.output;
        loadingAgents.delete(agentKey);
      } else if (state === 'input-available' || state === 'input-streaming') {
        loadingAgents.add(agentKey);
      }
      continue;
    }

    if (typeof p.type === 'string' && p.type.startsWith('tool-') && p.type !== 'tool-invocation') {
      const toolName =
        typeof p.toolName === 'string'
          ? p.toolName
          : p.type.slice('tool-'.length);
      const agentKey = getAgentTypeForToolName(toolName);
      if (!agentKey) continue;

      const state = typeof p.state === 'string' ? p.state : undefined;
      if ((state === 'output-available' || state === 'result') && p.output !== undefined) {
        (agentData as Record<string, unknown>)[agentKey] = p.output;
        loadingAgents.delete(agentKey);
      } else if (state === 'input-available' || state === 'input-streaming' || state === 'call') {
        loadingAgents.add(agentKey);
      }
      continue;
    }

    if (p.type === 'tool-invocation') {
      const invocation = p.toolInvocation as
        | { toolCallId?: string; toolName?: string; state?: string; result?: unknown }
        | undefined;
      const toolName =
        invocation?.toolName ??
        (typeof invocation?.toolCallId === 'string'
          ? toolCallNames.get(invocation.toolCallId)
          : undefined);
      const agentKey = getAgentTypeForToolName(toolName);
      if (!agentKey || !invocation?.state) continue;

      if (invocation.state === 'result' && invocation.result !== undefined) {
        (agentData as Record<string, unknown>)[agentKey] = invocation.result;
        loadingAgents.delete(agentKey);
      } else if (invocation.state === 'call' || invocation.state === 'partial-call') {
        loadingAgents.add(agentKey);
      }
      continue;
    }

    if (p.type === 'data-tool-agent') {
      const data = p.data as
        | {
            id?: string;
            status?: string;
            toolCalls?: Array<{ toolName?: string }>;
            toolResults?: Array<{ toolName?: string; result?: unknown }>;
          }
        | undefined;

      for (const toolCall of data?.toolCalls ?? []) {
        const agentKey = getAgentTypeForToolName(toolCall.toolName);
        if (agentKey) loadingAgents.add(agentKey);
      }

      for (const toolResult of data?.toolResults ?? []) {
        const agentKey = getAgentTypeForToolName(toolResult.toolName);
        if (!agentKey || toolResult.result === undefined) continue;
        (agentData as Record<string, unknown>)[agentKey] = toolResult.result;
        loadingAgents.delete(agentKey);
      }

      if (data?.status === 'finished') {
        for (const toolCall of data.toolCalls ?? []) {
          const agentKey = getAgentTypeForToolName(toolCall.toolName);
          if (agentKey) loadingAgents.delete(agentKey);
        }
      }
    }
  }

  return { agentData, loadingAgents };
}

interface ChatMessageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  isLastAssistant: boolean;
  isLoading: boolean;
  controlValues: Record<string, unknown>;
  onControlChange: (id: string, value: unknown) => void;
  onAction?: (prompt: string) => void;
}

export function ChatMessage({
  message,
  isLastAssistant,
  isLoading,
  controlValues,
  onControlChange,
  onAction,
}: ChatMessageProps) {
  const parts = message.parts as unknown[] | undefined;
  const { agentData, loadingAgents } = message.role === 'assistant'
    ? extractAgentData(parts)
    : { agentData: {} as AgentData, loadingAgents: new Set<AgentType>() };

  const showAgentPanel =
    message.role === 'assistant' &&
    (Object.keys(agentData).length > 0 || loadingAgents.size > 0);
  const isBookingInProgress =
    message.role === 'assistant' &&
    loadingAgents.has('booking') &&
    !agentData.booking;

  const textParts = (parts?.filter(
    (p) => (p as { type?: string }).type === 'text'
  ) as Array<{ type: 'text'; text: string }> | undefined) ?? [];
  const text =
    (textParts.map((part) => part.text).join('') || message.content) ??
    '';
  const hasText = text.trim().length > 0;
  const showActionButtons =
    isLastAssistant &&
    message.role === 'assistant' &&
    !!onAction &&
    (hasText || showAgentPanel);

  if (message.role === 'assistant' && !hasText && !showAgentPanel && !showActionButtons) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
    >
      {message.role === 'assistant' && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'linear-gradient(to bottom, #f87360, #e84e30, #d93c20)',
            boxShadow: '0 4px 0 #a82610, inset 0 2px 0 rgba(255,200,185,0.4), 0 5px 12px rgba(215,60,32,0.3)',
          }}
        >
          <Sparkle weight="fill" className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[85%]',
          message.role === 'user' ? 'rounded-2xl px-4 py-3 text-white shadow-sm' : 'py-1 min-w-0'
        )}
        style={
          message.role === 'user'
            ? {
                background: 'linear-gradient(135deg, rgba(61,126,204,0.6), rgba(29,77,158,0.6))',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
              }
            : undefined
        }
      >
        <div className={cn('text-sm', message.role === 'user' ? 'text-white' : 'text-white/88')}>
          {message.role === 'assistant' && hasText ? (
            <InlineUIRenderer
              text={text}
              controlValues={controlValues}
              onControlChange={onControlChange}
            />
          ) : message.role === 'user' ? (
            <p className="whitespace-pre-wrap m-0">{text}</p>
          ) : null}
        </div>
        {isBookingInProgress && (
          <BrowserTimeline active />
        )}
        {showAgentPanel && (
          <AgentPanel
            data={agentData}
            loading={loadingAgents}
            onAction={onAction}
            controlValues={controlValues}
            onControlChange={onControlChange}
          />
        )}
        {showActionButtons && (
          <ActionButtons
            agentData={agentData}
            controlValues={controlValues}
            assistantText={text}
            onAction={onAction}
            isLoading={isLoading}
          />
        )}
      </div>

      {message.role === 'user' && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <User weight="bold" className="w-4 h-4 text-white/65" />
        </div>
      )}
    </motion.div>
  );
}
