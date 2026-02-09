import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import type { MutationCtx } from "../_generated/server";

async function scheduleAlertPushSync(
  ctx: MutationCtx,
  params: {
    alertId: string;
    orgId: string;
  }
) {
  const config = await ctx.db
    .query("nexhealthConfigs")
    .filter((q: any) =>
      q.and(q.eq(q.field("orgId"), params.orgId), q.eq(q.field("isActive"), true))
    )
    .first();

  if (!config) return;

  await ctx.scheduler.runAfter(
    0,
    internal.nexhealth.actions.pushPatientAlert as any,
    {
      alertId: params.alertId as any,
      orgId: params.orgId,
      practiceId: config.practiceId as any,
    }
  );
}

/**
 * Create a new patient alert.
 */
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    message: v.string(),
    alertType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || (patient as any).orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const alertId = await ctx.db.insert("patientAlerts", {
      orgId,
      patientId: args.patientId,
      pmsPatientId: (patient as any).pmsPatientId,
      message: args.message,
      alertType: args.alertType,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditLog(ctx, {
      action: "patientAlert.create",
      resourceType: "patient",
      resourceId: args.patientId,
      details: { alertType: args.alertType },
      phiAccessed: true,
    });

    await scheduleAlertPushSync(ctx, { alertId: alertId as string, orgId });

    return alertId;
  },
});

/**
 * Deactivate a patient alert.
 */
export const deactivate = mutation({
  args: { alertId: v.id("patientAlerts") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const alert = await ctx.db.get(args.alertId);
    if (!alert || (alert as any).orgId !== orgId) {
      throw new Error("Alert not found");
    }

    await ctx.db.patch(args.alertId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.alertId;
  },
});
