import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chatSessions: defineTable({
    ownerKey: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.string(),
    title: v.string(),
    messages: v.array(v.any()),
    controlValues: v.record(v.string(), v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerKey_sessionId", ["ownerKey", "sessionId"])
    .index("by_ownerKey_updatedAt", ["ownerKey", "updatedAt"]),
});
