import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

export const list = query({
  args: {
    patientId: v.optional(v.string()),
    appointmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const results = await ctx.db
      .query("procedures")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return results.filter((r: any) => {
      if (args.patientId && r.pmsPatientId !== args.patientId) return false;
      if (args.appointmentId && r.pmsAppointmentId !== args.appointmentId) return false;
      return true;
    });
  },
});

/**
 * Get a single procedure by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("procedures") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }
    return record;
  },
});
