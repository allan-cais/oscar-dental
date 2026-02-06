import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List pre-determination claims with optional status filter.
 */
export const list = query({
  args: {
    preDetStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("partial")
      )
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter to pre-determinations only
    let predets = claims.filter((c: any) => c.isPreDetermination === true);

    // Apply status filter if provided
    if (args.preDetStatus) {
      predets = predets.filter(
        (c: any) => c.preDetStatus === args.preDetStatus
      );
    }

    // Sort by createdAt descending
    predets.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return predets;
  },
});

/**
 * Get pre-determinations for a specific patient.
 */
export const getByPatient = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    // Filter to pre-determinations only
    const predets = claims.filter(
      (c: any) => c.isPreDetermination === true
    );

    // Sort by createdAt descending
    predets.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return predets;
  },
});
