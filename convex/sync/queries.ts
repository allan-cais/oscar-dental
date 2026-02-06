import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Get the most recent completed sync job for a practice.
 */
export const getLastSync = query({
  args: { practiceId: v.id("practices") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const job = await ctx.db
      .query("syncJobs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    return job;
  },
});

/**
 * List sync jobs for a practice, ordered by createdAt desc, with pagination.
 */
export const listSyncJobs = query({
  args: {
    practiceId: v.id("practices"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const results = await ctx.db
      .query("syncJobs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return results;
  },
});

/**
 * Overall sync health for a practice.
 * Returns { lastSyncAt, status, jobsRunning }.
 */
export const getSyncStatus = query({
  args: { practiceId: v.id("practices") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Get the most recent completed job
    const lastCompleted = await ctx.db
      .query("syncJobs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    // Count currently running jobs
    const runningJobs = await ctx.db
      .query("syncJobs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("status"), "running"))
      .collect();

    // Determine overall status
    let status: "healthy" | "syncing" | "stale" | "never_synced" = "never_synced";
    if (runningJobs.length > 0) {
      status = "syncing";
    } else if (lastCompleted) {
      const hoursSinceSync =
        (Date.now() - (lastCompleted.completedAt ?? lastCompleted.createdAt)) /
        (1000 * 60 * 60);
      status = hoursSinceSync > 24 ? "stale" : "healthy";
    }

    return {
      lastSyncAt: lastCompleted?.completedAt ?? null,
      status,
      jobsRunning: runningJobs.length,
    };
  },
});
