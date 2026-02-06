import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, requireRole } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

/**
 * Create a pre-determination claim.
 *
 * Sets isPreDetermination=true, preDetStatus="pending", status="submitted".
 */
export const create = mutation({
  args: {
    practiceId: v.id("practices"),
    patientId: v.id("patients"),
    payerId: v.string(),
    payerName: v.string(),
    procedures: v.array(
      v.object({
        code: v.string(),
        description: v.string(),
        fee: v.number(),
        tooth: v.optional(v.string()),
        surface: v.optional(v.string()),
        quantity: v.optional(v.number()),
      })
    ),
    totalCharged: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const now = Date.now();

    const claimId = await ctx.db.insert("claims", {
      orgId,
      practiceId: args.practiceId,
      patientId: args.patientId,
      payerId: args.payerId,
      payerName: args.payerName,
      status: "submitted",
      procedures: args.procedures,
      totalCharged: args.totalCharged,
      isPreDetermination: true,
      preDetStatus: "pending",
      submittedAt: now,
      ageInDays: 0,
      ageBucket: "0-30",
      createdAt: now,
      updatedAt: now,
    });

    return claimId;
  },
});

/**
 * Record a payer response to a pre-determination.
 *
 * Updates preDetStatus and sets preDetResponseAt.
 */
export const recordResponse = mutation({
  args: {
    claimId: v.id("claims"),
    preDetStatus: v.union(
      v.literal("approved"),
      v.literal("denied"),
      v.literal("partial")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    if (!claim.isPreDetermination) {
      throw new Error("Claim is not a pre-determination");
    }

    const now = Date.now();

    // Map preDetStatus to an appropriate claim status
    let claimStatus: "accepted" | "denied" = "accepted";
    if (args.preDetStatus === "denied") {
      claimStatus = "denied";
    }

    await ctx.db.patch(args.claimId, {
      preDetStatus: args.preDetStatus,
      preDetResponseAt: now,
      status: claimStatus,
      updatedAt: now,
    });

    return args.claimId;
  },
});

/**
 * Lock a treatment plan's procedures after a pre-determination response.
 *
 * Once locked, the procedures array on the claim becomes read-only.
 * Only admin or office_manager roles can override a locked plan.
 * Creates an audit log for compliance tracking.
 */
export const lockTreatmentPlan = mutation({
  args: {
    claimId: v.id("claims"),
    override: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    if (!claim.isPreDetermination) {
      throw new Error("Claim is not a pre-determination");
    }

    // If overriding an already-locked plan, require supervisor role
    if (args.override) {
      await requireRole(ctx, "admin", "office_manager");
    }

    // Verify a pre-det response has been recorded before locking
    if (!claim.preDetResponseAt && !args.override) {
      throw new Error(
        "Cannot lock treatment plan before pre-determination response is recorded"
      );
    }

    const now = Date.now();

    // Store the locked procedures snapshot in the claim's notes
    // (the procedures array itself is already on the claim; "locking"
    // means flagging it so downstream mutations refuse to modify)
    await ctx.db.patch(args.claimId, {
      // Re-use the scrubPassedAt field conceptually as a "locked" timestamp.
      // A dedicated field would be cleaner, but we work within the existing schema.
      scrubPassedAt: now,
      updatedAt: now,
    });

    // Audit the lock action
    await createAuditLog(ctx, {
      action: args.override ? "treatment_plan_override" : "treatment_plan_lock",
      resourceType: "claim",
      resourceId: args.claimId,
      details: {
        claimNumber: claim.claimNumber,
        patientId: claim.patientId,
        preDetStatus: claim.preDetStatus,
        procedureCount: claim.procedures.length,
        totalCharged: claim.totalCharged,
        override: args.override ?? false,
      },
      phiAccessed: true,
    });

    return args.claimId;
  },
});
