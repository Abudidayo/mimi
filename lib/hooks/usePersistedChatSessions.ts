"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@civic/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  createSessionId,
  getSessionTitleFromPrompt,
  type PersistedChatSession,
  type PersistedChatSnapshot,
} from "@/lib/chatPersistence";
import { convexApi } from "@/lib/convexApi";
import {
  getStoredGuestOwnerKey,
  readStoredActiveSessionId,
  writeStoredActiveSessionId,
} from "@/lib/chatSessionStorage";

export function usePersistedChatSessions() {
  const { user } = useUser();
  const [guestOwnerKey] = useState<string | null>(() => getStoredGuestOwnerKey());
  const ownerKey = user?.id ?? guestOwnerKey ?? undefined;
  const convexUserId = useMemo(
    () => (typeof user?.id === "string" && user.id.length > 0 ? user.id : undefined),
    [user?.id]
  );
  const [sessionSelections, setSessionSelections] = useState<Record<string, string | undefined>>({});

  const sessionsQuery = useQuery(
    convexApi.chat.listSessions,
    ownerKey ? { ownerKey } : "skip"
  );
  const sessions = useMemo<PersistedChatSession[]>(() => sessionsQuery ?? [], [sessionsQuery]);
  const sessionsHaveLoaded = sessionsQuery !== undefined;

  /** Until list includes a row we just created, keep persisting so saveSession can patch, not insert a duplicate. */
  const [pendingNewSessionId, setPendingNewSessionId] = useState<string | null>(null);

  const desiredSessionId = ownerKey
    ? sessionSelections[ownerKey] ?? readStoredActiveSessionId(ownerKey) ?? undefined
    : undefined;

  useEffect(() => {
    if (!pendingNewSessionId) return;
    if (sessions.some((s) => s.sessionId === pendingNewSessionId)) {
      setPendingNewSessionId(null);
    }
  }, [pendingNewSessionId, sessions]);

  const activeSessionId =
    desiredSessionId &&
    (!sessionsHaveLoaded ||
      sessions.some((session) => session.sessionId === desiredSessionId) ||
      pendingNewSessionId === desiredSessionId)
      ? desiredSessionId
      : undefined;

  const activeSession = useQuery(
    convexApi.chat.getSession,
    ownerKey && activeSessionId ? { ownerKey, sessionId: activeSessionId } : "skip"
  );

  const createSessionMutation = useMutation(convexApi.chat.createSession);
  const saveSessionMutation = useMutation(convexApi.chat.saveSession);
  const renameSessionMutation = useMutation(convexApi.chat.renameSession);
  const deleteSessionMutation = useMutation(convexApi.chat.deleteSession);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (!ownerKey) return;
      setPendingNewSessionId(null);
      setSessionSelections((prev) => ({ ...prev, [ownerKey]: sessionId }));
      writeStoredActiveSessionId(ownerKey, sessionId);
    },
    [ownerKey]
  );

  const handleReturnHome = useCallback(() => {
    if (!ownerKey) return;

    setPendingNewSessionId(null);
    setSessionSelections((prev) => ({ ...prev, [ownerKey]: undefined }));
    writeStoredActiveSessionId(ownerKey, null);
  }, [ownerKey]);

  const handleCreateSession = useCallback(
    async (prompt: string) => {
      if (!ownerKey) return undefined;

      const sessionId = createSessionId();

      await createSessionMutation({
        ownerKey,
        userId: convexUserId,
        sessionId,
        title: getSessionTitleFromPrompt(prompt),
      });

      setPendingNewSessionId(sessionId);
      setSessionSelections((prev) => ({ ...prev, [ownerKey]: sessionId }));
      writeStoredActiveSessionId(ownerKey, sessionId);
      return sessionId;
    },
    [convexUserId, createSessionMutation, ownerKey]
  );

  const handleRenameSession = useCallback(
    async (sessionId: string) => {
      if (!ownerKey) return;

      const session = sessions.find((item) => item.sessionId === sessionId);
      const nextTitle = window.prompt("Rename session", session?.title ?? "New session");
      if (!nextTitle) return;

      const title = nextTitle.trim();
      if (!title) return;

      await renameSessionMutation({
        ownerKey,
        sessionId,
        title,
      });
    },
    [ownerKey, renameSessionMutation, sessions]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!ownerKey) return;

      const session = sessions.find((item) => item.sessionId === sessionId);
      const shouldDelete = window.confirm(`Delete "${session?.title ?? "this session"}"?`);
      if (!shouldDelete) return;

      await deleteSessionMutation({
        ownerKey,
        sessionId,
      });

      if (activeSessionId === sessionId) {
        setPendingNewSessionId(null);
        setSessionSelections((prev) => ({ ...prev, [ownerKey]: undefined }));
        writeStoredActiveSessionId(ownerKey, null);
      }
    },
    [activeSessionId, deleteSessionMutation, ownerKey, sessions]
  );

  const handleSaveSession = useCallback(
    async (sessionId: string, snapshot: PersistedChatSnapshot) => {
      if (!ownerKey) return;

      const existingSession = sessions.find((session) => session.sessionId === sessionId);
      try {
        await saveSessionMutation({
          ownerKey,
          userId: convexUserId,
          sessionId,
          title: existingSession?.title,
          messages: snapshot.messages as unknown[],
          controlValues: snapshot.controlValues,
        });
      } catch (e) {
        console.error("[chat] saveSession failed", e);
      }
    },
    [convexUserId, ownerKey, saveSessionMutation, sessions]
  );

  return {
    sessions,
    activeSessionId,
    activeSession,
    activeSessionReady: !activeSessionId || activeSession !== undefined,
    handleSelectSession,
    handleReturnHome,
    handleCreateSession,
    handleRenameSession,
    handleDeleteSession,
    handleSaveSession,
  };
}
