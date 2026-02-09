import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List collection sequences with optional filters.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("paused"),
        v.literal("paid")
      )
    ),
    step: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results;

    if (args.status) {
      results = await ctx.db
        .query("collectionSequences")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("collectionSequences")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Filter by step if provided
    if (args.step !== undefined) {
      results = results.filter((s: any) => s.currentStep === args.step);
    }

    // Sort by createdAt desc
    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    const page = results.slice(0, limit);

    // Join patient data
    const sequencesWithPatients = await Promise.all(
      page.map(async (seq: any) => {
        const patient = await ctx.db.get(seq.patientId) as any;
        return {
          ...seq,
          patient: patient
            ? {
                firstName: patient.firstName,
                lastName: patient.lastName,
                phone: patient.phone,
                email: patient.email,
              }
            : null,
        };
      })
    );

    return {
      sequences: sequencesWithPatients,
      totalCount: results.length,
    };
  },
});

/**
 * Get a single collection sequence by ID with full step history.
 */
export const getById = query({
  args: { sequenceId: v.id("collectionSequences") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.orgId !== orgId) {
      throw new Error("Collection sequence not found");
    }

    // Fetch linked patient for context
    const patient = await ctx.db.get(sequence.patientId);

    return {
      ...sequence,
      patient: patient
        ? {
            _id: patient._id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            phone: patient.phone,
            email: patient.email,
          }
        : null,
    };
  },
});

/**
 * Get all collection sequences for a specific patient.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const sequences = await ctx.db
      .query("collectionSequences")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    // Sort by createdAt desc
    sequences.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return sequences;
  },
});

/**
 * Aggregate collection stats for the org.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const all = await ctx.db
      .query("collectionSequences")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const active = all.filter((s: any) => s.status === "active");
    const totalOutstandingBalance = active.reduce(
      (sum: number, s: any) => sum + (s.totalBalance ?? 0),
      0
    );

    // Count by step
    const stepCounts: Record<number, number> = {};
    for (const seq of active) {
      const step = seq.currentStep ?? 0;
      stepCounts[step] = (stepCounts[step] || 0) + 1;
    }

    // Average days to resolve (for completed/paid sequences)
    const resolved = all.filter(
      (s: any) => s.status === "completed" || s.status === "paid"
    );
    let avgDaysToResolve = 0;
    if (resolved.length > 0) {
      const totalDays = resolved.reduce((sum: number, s: any) => {
        const end = s.updatedAt ?? s.createdAt;
        const start = s.startedAt ?? s.createdAt;
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDaysToResolve = Math.round((totalDays / resolved.length) * 10) / 10;
    }

    return {
      totalActiveSequences: active.length,
      totalOutstandingBalance: Math.round(totalOutstandingBalance * 100) / 100,
      stepCounts,
      avgDaysToResolve,
      totalCompleted: resolved.length,
      totalPaused: all.filter((s: any) => s.status === "paused").length,
    };
  },
});
