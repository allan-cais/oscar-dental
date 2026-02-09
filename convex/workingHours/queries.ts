import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List working hours for the current organization.
 * Optionally filter by provider PMS ID.
 */
export const list = query({
  args: {
    providerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // When filtering by provider, use the by_provider index for efficiency
    if (args.providerId) {
      const results = await ctx.db
        .query("workingHours")
        .withIndex("by_provider", (q: any) =>
          q.eq("orgId", orgId).eq("pmsProviderId", args.providerId)
        )
        .filter((q: any) => q.eq(q.field("isActive"), true))
        .collect();

      return results;
    }

    const results = await ctx.db
      .query("workingHours")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    return results;
  },
});
