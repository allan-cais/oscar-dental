import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

/**
 * Schedule push sync to NexHealth after a patient mutation.
 * Queries for first active NexHealth config for the org.
 * If config exists, pushes to NexHealth. If not, no-op.
 */
async function schedulePatientPushSync(
  ctx: MutationCtx,
  params: {
    patientId: string;
    orgId: string;
  }
) {
  // Find first active NexHealth config for the org
  const config = await ctx.db
    .query("nexhealthConfigs")
    .filter((q: any) =>
      q.and(q.eq(q.field("orgId"), params.orgId), q.eq(q.field("isActive"), true))
    )
    .first();

  if (!config) return;

  await ctx.scheduler.runAfter(
    0,
    internal.nexhealth.actions.pushPatientUpdate,
    {
      patientId: params.patientId as any,
      orgId: params.orgId,
      practiceId: config.practiceId as any,
    }
  );
}

// Reusable insurance object validator
const insuranceValidator = v.object({
  payerId: v.string(),
  payerName: v.string(),
  memberId: v.string(),
  groupNumber: v.optional(v.string()),
  subscriberName: v.optional(v.string()),
  subscriberDob: v.optional(v.string()),
  relationship: v.optional(v.string()),
});

/**
 * Create a new patient record.
 * Generates an oscarPatientId (MPI ID), sets matchStatus="matched",
 * isActive=true, and timestamps.
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    pmsPatientId: v.optional(v.string()),
    primaryInsurance: v.optional(insuranceValidator),
    secondaryInsurance: v.optional(insuranceValidator),
    smsConsent: v.optional(v.boolean()),
    emailConsent: v.optional(v.boolean()),
    preferredContactMethod: v.optional(
      v.union(v.literal("sms"), v.literal("email"), v.literal("phone"))
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Generate MPI ID
    const oscarPatientId =
      "oscar_" + now + "_" + Math.random().toString(36).slice(2);

    const patientId = await ctx.db.insert("patients", {
      orgId,
      oscarPatientId,
      pmsPatientId: args.pmsPatientId,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      email: args.email,
      phone: args.phone,
      address: args.address,
      primaryInsurance: args.primaryInsurance,
      secondaryInsurance: args.secondaryInsurance,
      smsConsent: args.smsConsent,
      smsConsentTimestamp: args.smsConsent !== undefined ? now : undefined,
      emailConsent: args.emailConsent,
      preferredContactMethod: args.preferredContactMethod,
      patientBalance: 0,
      insuranceBalance: 0,
      isActive: true,
      matchStatus: "matched",
      createdAt: now,
      updatedAt: now,
    });

    await createAuditLog(ctx, {
      action: "patient.create",
      resourceType: "patient",
      resourceId: patientId,
      details: { firstName: args.firstName, lastName: args.lastName },
      phiAccessed: true,
    });

    await schedulePatientPushSync(ctx, { patientId: patientId as string, orgId });

    return patientId;
  },
});

/**
 * Update patient fields. Accepts partial fields, updates updatedAt.
 */
export const update = mutation({
  args: {
    patientId: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    pmsPatientId: v.optional(v.string()),
    patientBalance: v.optional(v.number()),
    insuranceBalance: v.optional(v.number()),
    lastVisitDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const { patientId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(patientId, updates);

    await createAuditLog(ctx, {
      action: "patient.update",
      resourceType: "patient",
      resourceId: patientId,
      details: { updatedFields: Object.keys(fields).filter((k) => (fields as any)[k] !== undefined) },
      phiAccessed: true,
    });

    await schedulePatientPushSync(ctx, { patientId: patientId as string, orgId });

    return patientId;
  },
});

/**
 * Update insurance information for a patient.
 * Accepts primary and/or secondary insurance objects.
 */
export const updateInsurance = mutation({
  args: {
    patientId: v.id("patients"),
    primaryInsurance: v.optional(insuranceValidator),
    secondaryInsurance: v.optional(insuranceValidator),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.primaryInsurance !== undefined) {
      updates.primaryInsurance = args.primaryInsurance;
    }
    if (args.secondaryInsurance !== undefined) {
      updates.secondaryInsurance = args.secondaryInsurance;
    }

    await ctx.db.patch(args.patientId, updates);

    await createAuditLog(ctx, {
      action: "patient.updateInsurance",
      resourceType: "patient",
      resourceId: args.patientId,
      details: {
        updatedPrimary: args.primaryInsurance !== undefined,
        updatedSecondary: args.secondaryInsurance !== undefined,
      },
      phiAccessed: true,
    });

    return args.patientId;
  },
});

/**
 * Update communication preferences for a patient.
 * Records consent timestamp when consent fields change.
 */
export const updateCommunicationPreferences = mutation({
  args: {
    patientId: v.id("patients"),
    smsConsent: v.optional(v.boolean()),
    emailConsent: v.optional(v.boolean()),
    preferredContactMethod: v.optional(
      v.union(v.literal("sms"), v.literal("email"), v.literal("phone"))
    ),
    smsOptOutTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (args.smsConsent !== undefined) {
      updates.smsConsent = args.smsConsent;
      updates.smsConsentTimestamp = now;
      updates.smsConsentSource = "oscar_app";
    }
    if (args.emailConsent !== undefined) {
      updates.emailConsent = args.emailConsent;
    }
    if (args.preferredContactMethod !== undefined) {
      updates.preferredContactMethod = args.preferredContactMethod;
    }
    if (args.smsOptOutTypes !== undefined) {
      updates.smsOptOutTypes = args.smsOptOutTypes;
    }

    await ctx.db.patch(args.patientId, updates);

    await createAuditLog(ctx, {
      action: "patient.updateCommunicationPreferences",
      resourceType: "patient",
      resourceId: args.patientId,
      details: {
        smsConsent: args.smsConsent,
        emailConsent: args.emailConsent,
        preferredContactMethod: args.preferredContactMethod,
      },
      phiAccessed: false,
    });

    return args.patientId;
  },
});

/**
 * Update recall information for a patient.
 */
export const updateRecallInfo = mutation({
  args: {
    patientId: v.id("patients"),
    recallInterval: v.optional(v.number()),
    nextRecallDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.recallInterval !== undefined) {
      updates.recallInterval = args.recallInterval;
    }
    if (args.nextRecallDate !== undefined) {
      updates.nextRecallDate = args.nextRecallDate;
    }

    await ctx.db.patch(args.patientId, updates);

    return args.patientId;
  },
});

/**
 * Deactivate a patient (set isActive to false).
 */
export const deactivate = mutation({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    await ctx.db.patch(args.patientId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      action: "patient.deactivate",
      resourceType: "patient",
      resourceId: args.patientId,
      phiAccessed: false,
    });

    return args.patientId;
  },
});
