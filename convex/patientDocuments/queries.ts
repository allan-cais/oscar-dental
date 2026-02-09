import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List documents for a specific patient.
 */
export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    return await ctx.db
      .query("patientDocuments")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();
  },
});
