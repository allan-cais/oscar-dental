import { query } from "../_generated/server";
import { v } from "convex/values";
import { computeEntryHash } from "../lib/audit";
import { getOrgId } from "../lib/auth";

// ---------------------------------------------------------------------------
// Audit Log — Query Functions
// All queries are read-only and scoped to the caller's org.
// ---------------------------------------------------------------------------

/**
 * List audit logs with pagination and optional filters.
 *
 * Supports filtering by: action, resourceType, userId, date range.
 * Uses Convex cursor-based pagination via `.paginate()`.
 */
export const list = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
    // Optional filters
    action: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    userId: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Pick the best index based on supplied filters.
    let baseQuery;
    if (args.userId) {
      baseQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_user", (q) => q.eq("orgId", orgId).eq("userId", args.userId as string));
    } else if (args.action) {
      baseQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("orgId", orgId).eq("action", args.action as string));
    } else {
      baseQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_org_time", (q) => q.eq("orgId", orgId));
    }

    // Order newest-first.
    const ordered = baseQuery.order("desc");

    // Apply time and additional in-memory filters after index scan.
    const page = await ordered.paginate(args.paginationOpts);

    const filtered = page.page.filter((entry) => {
      if (args.startTime && entry.timestamp < args.startTime) return false;
      if (args.endTime && entry.timestamp > args.endTime) return false;
      if (args.resourceType && entry.resourceType !== args.resourceType) return false;
      // userId and action already handled by index when provided, but if both
      // are given we need the secondary filter in-memory.
      if (args.userId && args.action && entry.action !== args.action) return false;
      if (args.action && args.userId && entry.userId !== args.userId) return false;
      return true;
    });

    return {
      page: filtered,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Get all audit log entries for a specific resource.
 * Uses the `by_resource` index for efficient lookup.
 */
export const getByResource = query({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const entries = await ctx.db
      .query("auditLogs")
      .withIndex("by_resource", (q) =>
        q
          .eq("orgId", orgId)
          .eq("resourceType", args.resourceType)
          .eq("resourceId", args.resourceId),
      )
      .order("desc")
      .collect();

    return entries;
  },
});

/**
 * Verify the hash chain integrity for a date range.
 *
 * Walks through entries in chronological order and recomputes each hash.
 * Returns `{ valid: true }` if the chain is intact, or
 * `{ valid: false, brokenAt }` with the first entry whose hash doesn't match.
 */
export const verifyChain = query({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Fetch entries in chronological order (oldest first).
    const entries = await ctx.db
      .query("auditLogs")
      .withIndex("by_org_time", (q) => q.eq("orgId", orgId))
      .order("asc")
      .collect();

    // Apply optional time window.
    const windowed = entries.filter((e) => {
      if (args.startTime && e.timestamp < args.startTime) return false;
      if (args.endTime && e.timestamp > args.endTime) return false;
      return true;
    });

    let checkedCount = 0;

    for (const entry of windowed) {
      const expectedHash = computeEntryHash(
        entry.previousHash ?? "genesis",
        entry.timestamp,
        entry.action,
        entry.resourceType,
        entry.resourceId ?? "",
        entry.userId ?? "system",
      );

      if (expectedHash !== entry.entryHash) {
        return {
          valid: false as const,
          brokenAt: {
            _id: entry._id,
            timestamp: entry.timestamp,
            action: entry.action,
            expectedHash,
            actualHash: entry.entryHash,
          },
          checkedCount,
        };
      }

      checkedCount++;
    }

    return { valid: true as const, checkedCount };
  },
});
