import { makeFunctionReference, type FunctionReference } from "convex/server";
import type { PersistedChatSession } from "@/lib/chatPersistence";

export const convexApi = {
  chat: {
    listSessions: makeFunctionReference<
      "query",
      { ownerKey: string },
      PersistedChatSession[]
    >("chat:listSessions") as FunctionReference<
      "query",
      "public",
      { ownerKey: string },
      PersistedChatSession[]
    >,
    getSession: makeFunctionReference<
      "query",
      { ownerKey: string; sessionId: string },
      PersistedChatSession | null
    >("chat:getSession") as FunctionReference<
      "query",
      "public",
      { ownerKey: string; sessionId: string },
      PersistedChatSession | null
    >,
    createSession: makeFunctionReference<
      "mutation",
      { ownerKey: string; userId?: string; sessionId: string; title: string },
      null
    >("chat:createSession") as FunctionReference<
      "mutation",
      "public",
      { ownerKey: string; userId?: string; sessionId: string; title: string },
      null
    >,
    saveSession: makeFunctionReference<
      "mutation",
      {
        ownerKey: string;
        userId?: string;
        sessionId: string;
        title?: string;
        messages: unknown[];
        controlValues: Record<string, unknown>;
      },
      null
    >("chat:saveSession") as FunctionReference<
      "mutation",
      "public",
      {
        ownerKey: string;
        userId?: string;
        sessionId: string;
        title?: string;
        messages: unknown[];
        controlValues: Record<string, unknown>;
      },
      null
    >,
    renameSession: makeFunctionReference<
      "mutation",
      { ownerKey: string; sessionId: string; title: string },
      null
    >("chat:renameSession") as FunctionReference<
      "mutation",
      "public",
      { ownerKey: string; sessionId: string; title: string },
      null
    >,
    deleteSession: makeFunctionReference<
      "mutation",
      { ownerKey: string; sessionId: string },
      null
    >("chat:deleteSession") as FunctionReference<
      "mutation",
      "public",
      { ownerKey: string; sessionId: string },
      null
    >,
  },
};
