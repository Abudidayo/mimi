"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  CaretDown,
  ClockCounterClockwise,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { PersistedChatSession } from "@/lib/chatPersistence";
import { cn } from "@/lib/utils";

interface SessionHistoryMenuProps {
  sessions: PersistedChatSession[];
  onSelect: (sessionId: string) => void;
  onRename: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function SessionHistoryMenu({
  sessions,
  onSelect,
  onRename,
  onDelete,
}: SessionHistoryMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "h-14 shrink-0 rounded-full px-4",
            "inline-flex items-center justify-center gap-2",
            "bg-white/92 text-[#2559b7] border border-white/70",
            "shadow-[0_10px_28px_rgba(9,24,62,0.16)] transition-all duration-200",
            "hover:bg-white hover:scale-[1.03]"
          )}
          aria-label="View chat history"
        >
          <ClockCounterClockwise weight="bold" className="w-5 h-5" />
          <span className="hidden text-sm font-semibold sm:inline">History</span>
          <CaretDown weight="bold" className="hidden h-3.5 w-3.5 sm:block" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="fixed inset-0 z-40 bg-[#06122f]/45 backdrop-blur-[3px]"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 28 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl rounded-t-[32px] p-4 text-left"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,255,0.96) 100%)",
                    boxShadow:
                      "0 -18px 52px rgba(8,19,56,0.25), inset 0 1px 0 rgba(255,255,255,0.85)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#b7c8ea]" />

                  <div className="px-2 pb-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#4f73b6]/80">
                      History
                    </p>
                    <Dialog.Title className="text-[#17315f] text-xl font-bold">
                      Saved sessions
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-[#6279a8]">
                      Pick up an older trip plan or tidy up your saved chats.
                    </p>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-1 pb-2">
                    {sessions.length === 0 ? (
                      <div className="rounded-3xl border border-[#dce8ff] bg-white/80 px-4 py-8 text-sm text-[#5b73a6]">
                        No sessions yet. Your next search will create one.
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className="group rounded-3xl border border-[#dce8ff] bg-white/88 px-4 py-4"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              onSelect(session.sessionId);
                            }}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#18325f]">
                                  {session.title}
                                </p>
                                <p className="mt-1 text-xs text-[#6279a8]">
                                  {formatTimestamp(session.updatedAt)}
                                </p>
                              </div>
                              <div className="rounded-full bg-[#edf4ff] px-3 py-1 text-[11px] font-semibold text-[#4b72b8]">
                                Open
                              </div>
                            </div>
                          </button>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onRename(session.sessionId)}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#2559b7] bg-[#eef4ff] hover:bg-[#e2edff]"
                            >
                              <PencilSimple className="w-3.5 h-3.5" weight="bold" />
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(session.sessionId)}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c54134] bg-[#fff0ee] hover:bg-[#ffe3df]"
                            >
                              <Trash className="w-3.5 h-3.5" weight="bold" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
