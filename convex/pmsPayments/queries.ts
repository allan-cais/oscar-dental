import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

export const list = query({
  args: {
    patientId: v.optional(v.string()),
    claimId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const results = await ctx.db
      .query("pmsPayments")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return results.filter((r: any) => {
      if (args.patientId && r.pmsPatientId !== args.patientId) return false;
      if (args.claimId && r.pmsClaimId !== args.claimId) return false;
      return true;
    });
  },
});

/**
 * List PMS payments for a specific patient by Convex patient ID.
 * Resolves the pmsPatientId from the patient record and queries payments.
 */
export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const patient = await ctx.db.get(args.patientId) as any;
    if (!patient || patient.orgId !== orgId) {
      return [];
    }
    const pmsPatientId = patient.pmsPatientId;
    if (!pmsPatientId) {
      return [];
    }
    return await ctx.db
      .query("pmsPayments")
      .withIndex("by_patient", (q: any) => q.eq("orgId", orgId).eq("pmsPatientId", pmsPatientId))
      .collect();
  },
});

/**
 * Get a single PMS payment by ID. Verifies orgId matches.
 */
export const getById = query({
  args: { id: v.id("pmsPayments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const record = await ctx.db.get(args.id);
    if (!record || record.orgId !== orgId) {
      throw new Error("Not found");
    }
    return record;
  },
});
