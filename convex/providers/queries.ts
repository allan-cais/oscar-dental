import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List providers for the current org.
 * Optionally filter by practiceId, type, and isActive.
 */
export const list = query({
  args: {
    practiceId: v.optional(v.id("practices")),
    type: v.optional(
      v.union(
        v.literal("dentist"),
        v.literal("hygienist"),
        v.literal("specialist"),
        v.literal("assistant")
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    let q;
    if (args.practiceId) {
      q = ctx.db
        .query("providers")
        .withIndex("by_practice", (q) =>
          q.eq("orgId", orgId).eq("practiceId", args.practiceId!)
        );
    } else {
      q = ctx.db
        .query("providers")
        .withIndex("by_org", (q) => q.eq("orgId", orgId));
    }

    let results = await q.collect();

    if (args.type !== undefined) {
      results = results.filter((p) => p.type === args.type);
    }
    if (args.isActive !== undefined) {
      results = results.filter((p) => p.isActive === args.isActive);
    }

    return results;
  },
});

/**
 * Get a single provider by ID. Verifies org ownership.
 */
export const getById = query({
  args: { providerId: v.id("providers") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const provider = await ctx.db.get(args.providerId);
    if (!provider || provider.orgId !== orgId) {
      throw new Error("Provider not found");
    }

    return provider;
  },
});
