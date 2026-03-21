"use client";

import { ChatExperience } from "@/components/chat/ChatExperience";
import { usePersistedChatSessions } from "@/lib/hooks/usePersistedChatSessions";

const CONVEX_ENABLED = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

function PersistedHome() {
  const chatSessions = usePersistedChatSessions();

  return (
    <ChatExperience
      sessions={chatSessions.sessions}
      activeSessionId={chatSessions.activeSessionId}
      activeSession={chatSessions.activeSession}
      activeSessionReady={chatSessions.activeSessionReady}
      onSelectSession={chatSessions.handleSelectSession}
      onCreateSession={chatSessions.handleCreateSession}
      onRenameSession={chatSessions.handleRenameSession}
      onDeleteSession={chatSessions.handleDeleteSession}
      onSaveSession={chatSessions.handleSaveSession}
      onReturnHome={chatSessions.handleReturnHome}
    />
  );
}

export default function Home() {
  if (!CONVEX_ENABLED) {
    return (
      <ChatExperience
        sessions={[]}
        activeSessionReady
        onSelectSession={() => {}}
        onCreateSession={async () => undefined}
        onRenameSession={async () => {}}
        onDeleteSession={async () => {}}
        onReturnHome={() => {}}
      />
    );
  }

  return <PersistedHome />;
}
