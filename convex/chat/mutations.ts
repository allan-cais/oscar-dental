import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentIdentity } from "../lib/auth";

/**
 * Create a new conversation.
 */
export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
    contextPage: v.optional(v.string()),
    contextEntityType: v.optional(v.string()),
    contextEntityId: v.optional(v.string()),
    contextSummary: v.optional(v.string()),
    personaMode: v.union(
      v.literal("read_only"),
      v.literal("read_action"),
      v.literal("full")
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const identity = await getCurrentIdentity(ctx);
    const userId = identity.subject;
    const now = Date.now();

    return ctx.db.insert("chatConversations", {
      orgId,
      userId,
      title: args.title ?? "New Conversation",
      status: "active",
      contextPage: args.contextPage,
      contextEntityType: args.contextEntityType,
      contextEntityId: args.contextEntityId,
      contextSummary: args.contextSummary,
      personaMode: args.personaMode,
      lastMessageAt: now,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Save a message to a conversation.
 */
export const saveMessage = mutation({
  args: {
    conversationId: v.id("chatConversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool_call"),
      v.literal("tool_result")
    ),
    content: v.string(),
    toolName: v.optional(v.string()),
    toolArgs: v.optional(v.string()),
    toolResult: v.optional(v.string()),
    toolStatus: v.optional(v.string()),
    containsPhi: v.optional(v.boolean()),
    phiCategories: v.optional(v.array(v.string())),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify conversation belongs to caller's org
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || (conversation as any).orgId !== orgId) {
      throw new Error("Conversation not found");
    }

    // Insert message
    const messageId = await ctx.db.insert("chatMessages", {
      orgId,
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      toolName: args.toolName,
      toolArgs: args.toolArgs,
      toolResult: args.toolResult,
      toolStatus: args.toolStatus,
      containsPhi: args.containsPhi,
      phiCategories: args.phiCategories,
      tokensUsed: args.tokensUsed,
      createdAt: now,
    });

    // Update conversation metadata
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      messageCount: conversation.messageCount + 1,
      updatedAt: now,
    });

    // Auto-title from first user message
    if (conversation.messageCount === 0 && args.role === "user") {
      const title = args.content.length > 60
        ? args.content.slice(0, 57) + "..."
        : args.content;
      await ctx.db.patch(args.conversationId, { title });
    }

    return messageId;
  },
});

/**
 * Archive a conversation.
 */
export const archiveConversation = mutation({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify conversation belongs to caller's org
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || (conversation as any).orgId !== orgId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Send an agent-to-agent message (internal, no auth required).
 */
export const sendAgentMessage = internalMutation({
  args: {
    orgId: v.string(),
    teamId: v.string(),
    fromAgent: v.string(),
    toAgent: v.string(),
    messageType: v.union(
      v.literal("message"),
      v.literal("broadcast"),
      v.literal("escalate")
    ),
    content: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("agentMessages", {
      orgId: args.orgId,
      teamId: args.teamId,
      fromAgent: args.fromAgent,
      toAgent: args.toAgent,
      messageType: args.messageType,
      content: args.content,
      metadata: args.metadata,
      status: "sent",
      createdAt: Date.now(),
    });
  },
});

/**
 * Mark an agent message as read.
 */
export const markAgentMessageRead = internalMutation({
  args: {
    messageId: v.id("agentMessages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { status: "read" });
  },
});
