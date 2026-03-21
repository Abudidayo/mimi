"use client";

import { useState, useCallback, useEffect, useMemo, useRef, startTransition } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowClockwise, CaretLeft, House, Warning, X } from "@phosphor-icons/react";
import { LandingPage } from "@/components/landing/LandingPage";
import { ChatFooter } from "@/components/chat/ChatFooter";
import { ChatMessage } from "@/components/chat/ChatMessage";
import {
  ThinkingSkeleton,
  StreamingDots,
  ReplanningIndicator,
} from "@/components/chat/StatusIndicators";
import { useReplan, formatReplanPrompt } from "@/lib/hooks/useReplan";
import {
  toConvexSafeSnapshot,
  type PersistedChatSession,
  type PersistedChatSnapshot,
} from "@/lib/chatPersistence";

interface ChatExperienceProps {
  sessions: PersistedChatSession[];
  activeSessionId?: string;
  activeSession?: PersistedChatSession | null;
  activeSessionReady: boolean;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: (prompt: string) => Promise<string | undefined>;
  onRenameSession: (sessionId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onSaveSession?: (sessionId: string, snapshot: PersistedChatSnapshot) => Promise<unknown>;
  onReturnHome?: () => void;
}

export function ChatExperience({
  sessions,
  activeSessionId,
  activeSession,
  activeSessionReady,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  onSaveSession,
  onReturnHome,
}: ChatExperienceProps) {
  const canPersist = Boolean(activeSessionId && onSaveSession);
  const [controlValues, setControlValues] = useState<Record<string, unknown>>({});
  const [isReplanning, setIsReplanning] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [hasHydratedSession, setHasHydratedSession] = useState(!activeSessionId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { messages, setMessages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/plan-trip" }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const isThinking = status === "submitted";
  const isChat = messages.length > 0;

  useEffect(() => {
    startTransition(() => {
      setHasHydratedSession(!activeSessionId);
    });
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionReady) return;

    startTransition(() => {
      setMessages((activeSession?.messages ?? []) as Parameters<typeof setMessages>[0]);
      setControlValues(activeSession?.controlValues ?? {});
      setHasHydratedSession(true);
    });
  }, [
    activeSession?.sessionId,
    activeSession?.messages,
    activeSession?.controlValues,
    activeSessionReady,
    setMessages,
  ]);

  useEffect(() => {
    if (!canPersist || !activeSessionId || !hasHydratedSession || !onSaveSession) return;

    const snapshot = toConvexSafeSnapshot(messages, controlValues);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void onSaveSession(activeSessionId, snapshot);
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    activeSessionId,
    canPersist,
    controlValues,
    hasHydratedSession,
    messages,
    onSaveSession,
  ]);

  const latestUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return messages[i].id;
      }
    }

    return messages[messages.length - 1]?.id;
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;

      const text = inputValue.trim();
      setInputValue("");

      if (!activeSessionId) {
        await onCreateSession(text);
      }

      await sendMessage({ text });
    },
    [activeSessionId, inputValue, isLoading, onCreateSession, sendMessage]
  );

  const handleSuggestionClick = useCallback(
    async (prompt: string) => {
      if (isLoading) return;

      if (!activeSessionId) {
        await onCreateSession(prompt);
      }

      await sendMessage({ text: prompt });
    },
    [activeSessionId, isLoading, onCreateSession, sendMessage]
  );

  const handleAction = useCallback(
    async (prompt: string) => {
      if (isLoading) return;
      await sendMessage({ text: prompt });
    },
    [isLoading, sendMessage]
  );

  const handleReplan = useCallback(
    async (changes: Map<string, unknown>) => {
      if (messages.length === 0) return;
      setIsReplanning(true);
      await sendMessage({ text: formatReplanPrompt(changes) });
      setIsReplanning(false);
    },
    [messages.length, sendMessage]
  );

  const { handleControlChange: triggerReplan } = useReplan({
    onReplan: handleReplan,
    debounceMs: 1500,
  });

  const handleControlChange = (id: string, value: unknown) => {
    setControlValues((prev) => ({ ...prev, [id]: value }));
    triggerReplan(id, value);
  };

  const handleReturnHome = useCallback(async () => {
    if (canPersist && activeSessionId && hasHydratedSession && onSaveSession) {
      const snapshot = toConvexSafeSnapshot(messages, controlValues);
      await onSaveSession(activeSessionId, snapshot);
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setMessages([]);
    setControlValues({});
    setInputValue("");
    setDismissedError(null);
    onReturnHome?.();
  }, [
    activeSessionId,
    canPersist,
    controlValues,
    hasHydratedSession,
    messages,
    onReturnHome,
    onSaveSession,
    setMessages,
  ]);

  useEffect(() => {
    if (!isChat || !latestUserMessageId) return;

    const container = scrollContainerRef.current;
    const anchor = messageRefs.current.get(latestUserMessageId);
    if (!container || !anchor) return;

    const topPadding = 24;
    container.scrollTo({
      top: Math.max(anchor.offsetTop - topPadding, 0),
      behavior: "smooth",
    });
  }, [isChat, latestUserMessageId, status]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: isChat
          ? "linear-gradient(180deg, #11265b 0%, #0c1d49 42%, #081338 100%)"
          : "linear-gradient(180deg, #3d7ecc 0%, #1d4d9e 38%, #102966 68%, #09183e 100%)",
      }}
    >
      <AnimatePresence>
        {isReplanning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
            style={{ background: "rgba(30,70,160,0.7)", backdropFilter: "blur(12px)" }}
          >
            <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <ArrowClockwise className="w-4 h-4" weight="bold" />
              </motion.div>
              <span>Updating your travel plan...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && error.message !== dismissedError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
            style={{ background: "rgba(160,30,30,0.6)", backdropFilter: "blur(12px)" }}
          >
            <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2 text-red-100 text-sm">
              <Warning className="w-4 h-4 shrink-0" weight="fill" />
              <span className="flex-1">Something went wrong. Please try again.</span>
              <button
                onClick={() => setDismissedError(error?.message ?? "")}
                className="p-1 hover:bg-red-800/40 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        {isChat && (
          <div className="sticky top-0 z-20 px-4 pt-4">
            <div className="mx-auto flex max-w-5xl justify-start">
              <button
                type="button"
                onClick={() => {
                  void handleReturnHome();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(8,19,56,0.22)] backdrop-blur-md transition-all duration-200 hover:bg-white/16"
              >
                <span className="inline-flex items-center gap-1.5 sm:hidden">
                  <House weight="fill" className="h-4 w-4" />
                  Home
                </span>
                <span className="hidden items-center gap-1.5 sm:inline-flex">
                  <CaretLeft weight="bold" className="h-4 w-4" />
                  Back to Home
                </span>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isChat && (
            <LandingPage
              inputValue={inputValue}
              onInputChange={setInputValue}
              isLoading={isLoading}
              onSubmit={handleSubmit}
              onSuggestionClick={handleSuggestionClick}
              sessions={sessions}
              onSessionSelect={onSelectSession}
              onSessionRename={(sessionId) => {
                void onRenameSession(sessionId);
              }}
              onSessionDelete={(sessionId) => {
                void onDeleteSession(sessionId);
              }}
            />
          )}
        </AnimatePresence>

        {isChat && (
          <div className="max-w-5xl mx-auto px-4 pt-6 pb-24 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message, msgIdx) => (
                <div
                  key={message.id}
                  ref={(node) => {
                    if (node) {
                      messageRefs.current.set(message.id, node);
                    } else {
                      messageRefs.current.delete(message.id);
                    }
                  }}
                >
                  <ChatMessage
                    message={message}
                    isLastAssistant={message.role === "assistant" && msgIdx === messages.length - 1}
                    isLoading={isLoading}
                    controlValues={controlValues}
                    onControlChange={handleControlChange}
                    onAction={handleAction}
                  />
                </div>
              ))}
            </AnimatePresence>

            <ThinkingSkeleton show={isThinking} />
            <StreamingDots show={status === "streaming"} />
            <ReplanningIndicator show={isReplanning && !isLoading} />

            <AnimatePresence>
              {!isLoading && (
                <ChatFooter
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                  variant="inline"
                />
              )}
            </AnimatePresence>

            <div className="h-24" />
          </div>
        )}
      </div>
    </div>
  );
}
