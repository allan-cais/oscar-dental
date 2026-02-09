import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId, getCurrentUser } from "../lib/auth";

// Surgical procedure code prefixes that require tooth numbers (D7xxx)
const SURGICAL_CODE_PREFIXES = ["D7"];

// Procedure code prefixes that typically require tooth numbers
const TOOTH_REQUIRED_PREFIXES = [
  "D2", // Restorative
  "D3", // Endodontics
  "D4", // Periodontics (some)
  "D6", // Prosthodontics - fixed
  "D7", // Oral surgery
];

/**
 * Compute age bucket from an age in days.
 */
function computeAgeBucket(
  days: number
): "0-30" | "31-60" | "61-90" | "91-120" | "120+" {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

/**
 * Create a new claim in draft status.
 */
export const create = mutation({
  args: {
    practiceId: v.id("practices"),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
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

    // Verify appointment if provided
    if (args.appointmentId) {
      const appointment = await ctx.db.get(args.appointmentId);
      if (!appointment || appointment.orgId !== orgId) {
        throw new Error("Appointment not found");
      }
    }

    const now = Date.now();
    const claimId = await ctx.db.insert("claims", {
      orgId,
      practiceId: args.practiceId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      payerId: args.payerId,
      payerName: args.payerName,
      status: "draft",
      procedures: args.procedures,
      totalCharged: args.totalCharged,
      createdAt: now,
      updatedAt: now,
    });

    return claimId;
  },
});

/**
 * Run claim through the scrubbing engine.
 *
 * Checks:
 * 1. Required fields validation
 * 2. Payer-specific rules (from payerRules table)
 * 3. Fee schedule comparison (flag if billed >110% of scheduled fee)
 * 4. Common issues: duplicate codes, missing tooth numbers for surgical codes
 *
 * Results in status "ready" (pass) or "scrub_failed" (errors found).
 * Warnings alone do not cause failure.
 */
export const scrub = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    // Set status to scrubbing
    await ctx.db.patch(args.claimId, {
      status: "scrubbing",
      updatedAt: Date.now(),
    });

    const errors: Array<{
      code: string;
      message: string;
      severity: "error" | "warning" | "info";
      field?: string;
    }> = [];

    // ── 1. Required fields validation ──────────────────────────────────
    if (!claim.patientId) {
      errors.push({
        code: "MISSING_PATIENT",
        message: "Patient ID is required",
        severity: "error",
        field: "patientId",
      });
    }

    if (!claim.payerId) {
      errors.push({
        code: "MISSING_PAYER",
        message: "Payer ID is required",
        severity: "error",
        field: "payerId",
      });
    }

    if (!claim.procedures || claim.procedures.length === 0) {
      errors.push({
        code: "NO_PROCEDURES",
        message: "At least one procedure is required",
        severity: "error",
        field: "procedures",
      });
    }

    if (!claim.totalCharged || claim.totalCharged <= 0) {
      errors.push({
        code: "INVALID_TOTAL",
        message: "Total charged must be greater than zero",
        severity: "error",
        field: "totalCharged",
      });
    }

    // Validate each procedure has a code and fee
    if (claim.procedures) {
      for (let i = 0; i < claim.procedures.length; i++) {
        const proc = claim.procedures[i];
        if (!proc.code || proc.code.trim() === "") {
          errors.push({
            code: "MISSING_PROC_CODE",
            message: `Procedure ${i + 1}: missing procedure code`,
            severity: "error",
            field: `procedures[${i}].code`,
          });
        }
        if (proc.fee <= 0) {
          errors.push({
            code: "INVALID_PROC_FEE",
            message: `Procedure ${i + 1} (${proc.code}): fee must be greater than zero`,
            severity: "error",
            field: `procedures[${i}].fee`,
          });
        }
      }
    }

    // ── 2. Payer rules check ───────────────────────────────────────────
    const payerRulesDoc = await ctx.db
      .query("payerRules")
      .withIndex("by_payer", (q: any) =>
        q.eq("orgId", orgId).eq("payerId", claim.payerId)
      )
      .first();

    if (payerRulesDoc && payerRulesDoc.isActive && payerRulesDoc.rules) {
      const claimCodes = (claim.procedures ?? []).map((p: any) => p.code);

      for (const rule of payerRulesDoc.rules) {
        // Check if this rule applies to any of the claim's procedure codes
        const ruleCodes = rule.procedureCodes ?? [];
        const matchingCodes = ruleCodes.filter((rc: string) =>
          claimCodes.includes(rc)
        );

        if (ruleCodes.length > 0 && matchingCodes.length === 0) {
          // Rule doesn't apply to any procedures on this claim
          continue;
        }

        switch (rule.ruleType) {
          case "pre_auth_required":
            errors.push({
              code: "PRE_AUTH_REQUIRED",
              message: `Payer rule: ${rule.description}. Codes: ${matchingCodes.join(", ")}`,
              severity: "warning",
            });
            break;

          case "attachment_required":
            errors.push({
              code: "ATTACHMENT_REQUIRED",
              message: `Payer rule: ${rule.description}. Codes: ${matchingCodes.join(", ")}`,
              severity: "warning",
            });
            break;

          case "frequency_limit":
            errors.push({
              code: "FREQUENCY_LIMIT",
              message: `Payer rule: ${rule.description}. Codes: ${matchingCodes.join(", ")}`,
              severity: "warning",
            });
            break;

          case "procedure_combo":
            errors.push({
              code: "PROCEDURE_COMBO",
              message: `Payer rule: ${rule.description}`,
              severity: "warning",
            });
            break;

          case "age_limit":
            errors.push({
              code: "AGE_LIMIT",
              message: `Payer rule: ${rule.description}`,
              severity: "warning",
            });
            break;

          case "missing_data":
            errors.push({
              code: "MISSING_DATA",
              message: `Payer rule: ${rule.description}`,
              severity: "error",
            });
            break;
        }
      }
    }

    // ── 3. Fee schedule comparison ─────────────────────────────────────
    // Look for fee schedules for this practice (payer-specific first, then default)
    const feeSchedules = await ctx.db
      .query("feeSchedules")
      .withIndex("by_practice", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", claim.practiceId)
      )
      .collect();

    // Try payer-specific schedule first, fall back to default
    const payerSchedule = feeSchedules.find(
      (fs: any) => fs.payerId === claim.payerId && fs.isActive
    );
    const defaultSchedule = feeSchedules.find(
      (fs: any) => fs.isDefault && fs.isActive
    );
    const schedule = payerSchedule || defaultSchedule;

    if (schedule && schedule.fees && claim.procedures) {
      const feeMap = new Map<string, number>();
      for (const entry of schedule.fees) {
        feeMap.set(entry.code, entry.fee);
      }

      for (let i = 0; i < claim.procedures.length; i++) {
        const proc = claim.procedures[i];
        const scheduledFee = feeMap.get(proc.code);
        if (scheduledFee != null && scheduledFee > 0) {
          const ratio = proc.fee / scheduledFee;
          if (ratio > 1.1) {
            errors.push({
              code: "FEE_OVER_SCHEDULE",
              message: `Procedure ${proc.code}: billed $${proc.fee.toFixed(2)} is ${Math.round(ratio * 100)}% of scheduled fee $${scheduledFee.toFixed(2)} (>110% threshold)`,
              severity: "warning",
              field: `procedures[${i}].fee`,
            });
          }
        }
      }
    }

    // ── 4. Common issues ───────────────────────────────────────────────
    if (claim.procedures && claim.procedures.length > 0) {
      // Check for duplicate procedure codes
      const codeCounts = new Map<string, number>();
      for (const proc of claim.procedures) {
        codeCounts.set(proc.code, (codeCounts.get(proc.code) || 0) + 1);
      }
      for (const [code, count] of codeCounts) {
        if (count > 1) {
          errors.push({
            code: "DUPLICATE_PROCEDURE",
            message: `Procedure code ${code} appears ${count} times. Verify this is intentional.`,
            severity: "warning",
          });
        }
      }

      // Check for missing tooth numbers on surgical/restorative codes
      for (let i = 0; i < claim.procedures.length; i++) {
        const proc = claim.procedures[i];
        const needsTooth = TOOTH_REQUIRED_PREFIXES.some((prefix) =>
          proc.code.startsWith(prefix)
        );
        if (needsTooth && !proc.tooth) {
          const isSurgical = SURGICAL_CODE_PREFIXES.some((prefix) =>
            proc.code.startsWith(prefix)
          );
          errors.push({
            code: "MISSING_TOOTH_NUMBER",
            message: `Procedure ${proc.code}: tooth number is required for ${isSurgical ? "surgical" : "tooth-specific"} procedures`,
            severity: "error",
            field: `procedures[${i}].tooth`,
          });
        }
      }

      // Verify totalCharged matches sum of procedure fees
      const procedureTotal = claim.procedures.reduce(
        (sum: number, p: any) => sum + p.fee * (p.quantity ?? 1),
        0
      );
      // Allow small floating-point tolerance
      if (Math.abs(procedureTotal - claim.totalCharged) > 0.01) {
        errors.push({
          code: "TOTAL_MISMATCH",
          message: `Total charged ($${claim.totalCharged.toFixed(2)}) does not match sum of procedures ($${procedureTotal.toFixed(2)})`,
          severity: "warning",
          field: "totalCharged",
        });
      }
    }

    // ── Determine outcome ──────────────────────────────────────────────
    const hasErrors = errors.some((e) => e.severity === "error");
    const now = Date.now();

    if (hasErrors) {
      await ctx.db.patch(args.claimId, {
        status: "scrub_failed",
        scrubErrors: errors,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.claimId, {
        status: "ready",
        scrubErrors: errors.length > 0 ? errors : undefined,
        scrubPassedAt: now,
        updatedAt: now,
      });
    }

    return {
      claimId: args.claimId,
      status: hasErrors ? "scrub_failed" : "ready",
      errors,
      errorCount: errors.filter((e) => e.severity === "error").length,
      warningCount: errors.filter((e) => e.severity === "warning").length,
      infoCount: errors.filter((e) => e.severity === "info").length,
    };
  },
});

/**
 * Mark a claim as submitted. Validates status is "ready".
 */
export const submit = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    if (claim.status !== "ready") {
      throw new Error(
        `Cannot submit claim with status "${claim.status}". Only "ready" claims can be submitted.`
      );
    }

    const user = await getCurrentUser(ctx);
    const now = Date.now();

    await ctx.db.patch(args.claimId, {
      status: "submitted",
      submittedAt: now,
      submittedBy: user?._id,
      ageInDays: 0,
      ageBucket: "0-30",
      updatedAt: now,
    });

    return args.claimId;
  },
});

/**
 * Generic status update for a claim.
 * Used for downstream status transitions (accepted, rejected, paid, denied, appealed).
 */
export const updateStatus = mutation({
  args: {
    claimId: v.id("claims"),
    status: v.union(
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("paid"),
      v.literal("denied"),
      v.literal("appealed")
    ),
    paidAmount: v.optional(v.number()),
    adjustments: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "accepted") {
      updates.acceptedAt = now;
    }

    if (args.status === "paid") {
      updates.paidAt = now;
      if (args.paidAmount != null) {
        updates.totalPaid = args.paidAmount;
      }
    }

    if (args.adjustments != null) {
      updates.adjustments = args.adjustments;
    }

    await ctx.db.patch(args.claimId, updates);
    return args.claimId;
  },
});

/**
 * Recalculate ageInDays and ageBucket for a claim based on submittedAt vs now.
 */
export const recalculateAge = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    if (!claim.submittedAt) {
      // Not submitted yet, nothing to recalculate
      return { ageInDays: 0, ageBucket: "0-30" as const };
    }

    // Don't age claims that are already in terminal states
    const terminalStatuses = ["paid", "denied"];
    if (terminalStatuses.includes(claim.status)) {
      return {
        ageInDays: claim.ageInDays ?? 0,
        ageBucket: claim.ageBucket ?? "0-30",
      };
    }

    const now = Date.now();
    const ageInDays = Math.floor(
      (now - claim.submittedAt) / (1000 * 60 * 60 * 24)
    );
    const ageBucket = computeAgeBucket(ageInDays);

    await ctx.db.patch(args.claimId, {
      ageInDays,
      ageBucket,
      updatedAt: now,
    });

    return { ageInDays, ageBucket };
  },
});
