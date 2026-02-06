import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List appointment types for the current org.
 * Optionally filter by category and isActive.
 */
export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("hygiene"),
        v.literal("restorative"),
        v.literal("surgical"),
        v.literal("diagnostic"),
        v.literal("preventive"),
        v.literal("endodontic"),
        v.literal("prosthodontic"),
        v.literal("orthodontic"),
        v.literal("emergency"),
        v.literal("other")
      )
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    let results = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    if (args.category !== undefined) {
      results = results.filter((at) => at.category === args.category);
    }
    if (args.isActive !== undefined) {
      results = results.filter((at) => at.isActive === args.isActive);
    }

    return results;
  },
});

/**
 * Get a single appointment type by ID. Verifies org ownership.
 */
export const getById = query({
  args: { appointmentTypeId: v.id("appointmentTypes") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointmentType = await ctx.db.get(args.appointmentTypeId);
    if (!appointmentType || appointmentType.orgId !== orgId) {
      throw new Error("Appointment type not found");
    }

    return appointmentType;
  },
});
