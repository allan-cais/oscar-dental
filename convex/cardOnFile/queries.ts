import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List card-on-file consents for a patient.
 */
export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const consents = await ctx.db
      .query("cardOnFileConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    return consents.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

/**
 * Get the active card-on-file consent for a patient (if any).
 */
export const getActiveConsent = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const consents = await ctx.db
      .query("cardOnFileConsents")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    return consents.find((c: any) => c.isActive) ?? null;
  },
});
