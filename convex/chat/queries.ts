import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentIdentity } from "../lib/auth";

/**
 * List conversations for the current user.
 */
export const listConversations = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await getCurrentIdentity(ctx);
    const userId = identity.subject;
    const limit = args.limit ?? 20;

    if (args.status) {
      return ctx.db
        .query("chatConversations")
        .withIndex("by_user_status", (q) =>
          q.eq("orgId", orgId).eq("userId", userId).eq("status", args.status!)
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("chatConversations")
      .withIndex("by_user", (q) =>
        q.eq("orgId", orgId).eq("userId", userId)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get a single conversation by ID.
 */
export const getConversation = query({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || (conversation as any).orgId !== orgId) {
      return null;
    }
    return conversation;
  },
});

/**
 * List messages for a conversation.
 */
export const listMessages = query({
  args: {
    conversationId: v.id("chatConversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 100;

    // Verify conversation belongs to caller's org
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || (conversation as any).orgId !== orgId) {
      return [];
    }

    return ctx.db
      .query("chatMessages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .take(limit);
  },
});

/**
 * Get the active conversation for a user in a specific section/page.
 */
export const getActiveBySection = query({
  args: {
    section: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await getCurrentIdentity(ctx);
    const userId = identity.subject;

    // Find active conversation for this user+section
    const conversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_user_status", (q) =>
        q.eq("orgId", orgId).eq("userId", userId).eq("status", "active")
      )
      .collect();

    const conversation = conversations.find(
      (c) => (c as any).contextPage === args.section
    );

    if (!conversation) return null;

    // Get messages for this conversation
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .order("asc")
      .take(100);

    return { conversation, messages };
  },
});

/**
 * Get pending agent messages for a specific agent in a team.
 */
export const getPendingAgentMessages = internalQuery({
  args: {
    teamId: v.string(),
    toAgent: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agentMessages")
      .withIndex("by_recipient", (q) =>
        q.eq("teamId", args.teamId).eq("toAgent", args.toAgent).eq("status", "sent")
      )
      .collect();
  },
});
