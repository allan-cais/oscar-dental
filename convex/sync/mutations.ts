import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Create a new sync job with pending status.
 */
export const createSyncJob = mutation({
  args: {
    practiceId: v.id("practices"),
    jobType: v.union(
      v.literal("full_sync"),
      v.literal("incremental"),
      v.literal("patient_sync"),
      v.literal("appointment_sync"),
      v.literal("claim_sync")
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("syncJobs", {
      orgId,
      practiceId: args.practiceId,
      jobType: args.jobType,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return jobId;
  },
});

/**
 * Update sync job progress (recordsProcessed, recordsFailed).
 * Transitions status to "running" if still pending.
 */
export const updateSyncJob = mutation({
  args: {
    jobId: v.id("syncJobs"),
    recordsProcessed: v.optional(v.number()),
    recordsFailed: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const job = await ctx.db.get(args.jobId);
    if (!job || job.orgId !== orgId) {
      throw new Error("Sync job not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (args.recordsProcessed !== undefined) {
      updates.recordsProcessed = args.recordsProcessed;
    }
    if (args.recordsFailed !== undefined) {
      updates.recordsFailed = args.recordsFailed;
    }
    if (args.errors !== undefined) {
      updates.errors = args.errors;
    }

    // Auto-transition to running if pending
    if (job.status === "pending") {
      updates.status = "running";
      updates.startedAt = now;
    }

    await ctx.db.patch(args.jobId, updates);
    return args.jobId;
  },
});

/**
 * Mark a sync job as completed or failed with final stats and timestamps.
 */
export const completeSyncJob = mutation({
  args: {
    jobId: v.id("syncJobs"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    recordsProcessed: v.optional(v.number()),
    recordsFailed: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const job = await ctx.db.get(args.jobId);
    if (!job || job.orgId !== orgId) {
      throw new Error("Sync job not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      completedAt: now,
      updatedAt: now,
    };

    if (args.recordsProcessed !== undefined) {
      updates.recordsProcessed = args.recordsProcessed;
    }
    if (args.recordsFailed !== undefined) {
      updates.recordsFailed = args.recordsFailed;
    }
    if (args.errors !== undefined) {
      updates.errors = args.errors;
    }

    await ctx.db.patch(args.jobId, updates);

    // Update the practice's lastSyncAt if completed successfully
    if (args.status === "completed") {
      await ctx.db.patch(job.practiceId, { lastSyncAt: now, updatedAt: now });
    }

    return args.jobId;
  },
});
