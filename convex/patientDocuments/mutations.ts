import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { createAuditLog } from "../lib/audit";
import type { MutationCtx } from "../_generated/server";

async function scheduleDocumentPushSync(
  ctx: MutationCtx,
  params: {
    documentId: string;
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
    internal.nexhealth.actions.pushPatientDocument as any,
    {
      documentId: params.documentId as any,
      orgId: params.orgId,
      practiceId: config.practiceId as any,
    }
  );
}

/**
 * Create a new patient document record.
 * This is a metadata stub -- no file upload, just name + optional URL.
 */
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    name: v.string(),
    documentType: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    const patient = await ctx.db.get(args.patientId);
    if (!patient || (patient as any).orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const documentId = await ctx.db.insert("patientDocuments", {
      orgId,
      patientId: args.patientId,
      pmsPatientId: (patient as any).pmsPatientId,
      name: args.name,
      documentType: args.documentType,
      url: args.url,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditLog(ctx, {
      action: "patientDocument.create",
      resourceType: "patient",
      resourceId: args.patientId,
      details: { documentType: args.documentType, name: args.name },
      phiAccessed: true,
    });

    await scheduleDocumentPushSync(ctx, { documentId: documentId as string, orgId });

    return documentId;
  },
});
