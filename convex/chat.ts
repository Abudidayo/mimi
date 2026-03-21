import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const sessionShape = {
  sessionId: v.string(),
  title: v.string(),
  messages: v.array(v.any()),
  controlValues: v.record(v.string(), v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

export const listSessions = queryGeneric({
  args: {
    ownerKey: v.string(),
  },
  returns: v.array(v.object(sessionShape)),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_ownerKey_updatedAt", (q) => q.eq("ownerKey", args.ownerKey))
      .collect();

    return sessions
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((session) => ({
        sessionId: session.sessionId,
        title: session.title,
        messages: session.messages,
        controlValues: session.controlValues,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));
  },
});

export const getSession = queryGeneric({
  args: {
    ownerKey: v.string(),
    sessionId: v.string(),
  },
  returns: v.union(v.object(sessionShape), v.null()),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_ownerKey_updatedAt", (q) => q.eq("ownerKey", args.ownerKey))
      .collect();
    const session = sessions.find((item) => item.sessionId === args.sessionId);

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      title: session.title,
      messages: session.messages,
      controlValues: session.controlValues,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  },
});

export const createSession = mutationGeneric({
  args: {
    ownerKey: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.string(),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_ownerKey_updatedAt", (q) => q.eq("ownerKey", args.ownerKey))
      .collect();
    const existing = existingSessions.find((item) => item.sessionId === args.sessionId);

    if (existing) {
      return null;
    }

    const now = Date.now();

    await ctx.db.insert("chatSessions", {
      ownerKey: args.ownerKey,
      userId: args.userId,
      sessionId: args.sessionId,
      title: args.title,
      messages: [],
      controlValues: {},
      createdAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const saveSession = mutationGeneric({
  args: {
    ownerKey: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.string(),
    title: v.optional(v.string()),
    messages: v.array(v.any()),
    controlValues: v.record(v.string(), v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_ownerKey_updatedAt", (q) => q.eq("ownerKey", args.ownerKey))
      .collect();
    const existing = existingSessions.find((item) => item.sessionId === args.sessionId);

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        title: args.title ?? existing.title,
        messages: args.messages,
        controlValues: args.controlValues,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.insert("chatSessions", {
      ownerKey: args.ownerKey,
      userId: args.userId,
      sessionId: args.sessionId,
      title: args.title ?? "Untitled session",
      messages: args.messages,
      controlValues: args.controlValues,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const renameSession = mutationGeneric({
  args: {
    ownerKey: v.string(),
    sessionId: v.string(),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_ownerKey_updatedAt", (q) => q.eq("ownerKey", args.ownerKey))
      .collect();
    const session = sessions.find((item) => item.sessionId === args.sessionId);

    if (!session) {
      return null;
    }

    await ctx.db.patch(session._id, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteSession = mutationGeneric({
  args: {
    ownerKey: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_ownerKey_updatedAt", (q) => q.eq("ownerKey", args.ownerKey))
      .collect();
    const session = sessions.find((item) => item.sessionId === args.sessionId);

    if (!session) {
      return null;
    }

    await ctx.db.delete(session._id);
    return null;
  },
});
