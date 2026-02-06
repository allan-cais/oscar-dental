import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List operatories for the current org.
 * Optionally filter by practiceId and isActive.
 */
export const list = query({
  args: {
    practiceId: v.optional(v.id("practices")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    let q;
    if (args.practiceId) {
      q = ctx.db
        .query("operatories")
        .withIndex("by_practice", (q) =>
          q.eq("orgId", orgId).eq("practiceId", args.practiceId!)
        );
    } else {
      q = ctx.db
        .query("operatories")
        .withIndex("by_org", (q) => q.eq("orgId", orgId));
    }

    let results = await q.collect();

    if (args.isActive !== undefined) {
      results = results.filter((op) => op.isActive === args.isActive);
    }

    return results;
  },
});

/**
 * Get a single operatory by ID. Verifies org ownership.
 */
export const getById = query({
  args: { operatoryId: v.id("operatories") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const operatory = await ctx.db.get(args.operatoryId);
    if (!operatory || operatory.orgId !== orgId) {
      throw new Error("Operatory not found");
    }

    return operatory;
  },
});
