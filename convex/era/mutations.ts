import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Ingest an ERA (Electronic Remittance Advice) record.
 * For each line item, auto-matches to claims by claimNumber.
 * - Match found + amounts reconcile -> "matched"
 * - Match found but amounts differ -> "exception"
 * - No match -> "unmatched"
 */
export const ingest = mutation({
  args: {
    payerId: v.string(),
    payerName: v.string(),
    checkNumber: v.optional(v.string()),
    checkDate: v.optional(v.string()),
    checkAmount: v.number(),
    lineItems: v.array(
      v.object({
        claimNumber: v.string(),
        patientName: v.optional(v.string()),
        procedureCode: v.optional(v.string()),
        chargedAmount: v.number(),
        paidAmount: v.number(),
        adjustmentAmount: v.optional(v.number()),
        remarkCodes: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Generate a unique ERA ID
    const eraId = `ERA-${now}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Process each line item: attempt to match against claims
    const claimPayments = [];

    for (const item of args.lineItems) {
      // Try to find a claim by claimNumber in this org
      const matchedClaim = await ctx.db
        .query("claims")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .filter((q: any) =>
          q.eq(q.field("claimNumber"), item.claimNumber)
        )
        .first();

      let matchStatus: "matched" | "unmatched" | "exception";
      let matchedClaimId = undefined;

      if (!matchedClaim) {
        // No matching claim found
        matchStatus = "unmatched";
      } else {
        matchedClaimId = matchedClaim._id;

        // Check if amounts reconcile
        // Compare charged amount to claim's totalCharged
        const chargedMatches =
          Math.abs(matchedClaim.totalCharged - item.chargedAmount) < 0.01;
        // For a match, the paid + adjustment should account for the charged amount
        const adjustmentAmount = item.adjustmentAmount ?? 0;
        const totalAccounted = item.paidAmount + adjustmentAmount;
        const amountsReconcile =
          chargedMatches && Math.abs(totalAccounted - item.chargedAmount) < 0.01;

        if (amountsReconcile) {
          matchStatus = "matched";
        } else {
          matchStatus = "exception";
        }
      }

      claimPayments.push({
        claimNumber: item.claimNumber,
        patientName: item.patientName,
        amountPaid: item.paidAmount,
        adjustments: item.adjustmentAmount,
        matchedClaimId: matchedClaimId,
        matchStatus,
      });
    }

    // Calculate match rate
    const totalItems = claimPayments.length;
    const matchedItems = claimPayments.filter(
      (cp) => cp.matchStatus === "matched"
    ).length;
    const matchRate = totalItems > 0 ? matchedItems / totalItems : 0;

    // Insert the ERA record
    const recordId = await ctx.db.insert("eraRecords", {
      orgId,
      eraId,
      payerId: args.payerId,
      payerName: args.payerName,
      checkNumber: args.checkNumber,
      checkDate: args.checkDate,
      totalPaid: args.checkAmount,
      claimPayments,
      matchRate: Math.round(matchRate * 10000) / 100,
      processedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // For matched claims, update the claim records with payment info
    for (const cp of claimPayments) {
      if (cp.matchStatus === "matched" && cp.matchedClaimId) {
        await ctx.db.patch(cp.matchedClaimId, {
          status: "paid",
          totalPaid: cp.amountPaid,
          adjustments: cp.adjustments,
          paidAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      eraRecordId: recordId,
      eraId,
      matchRate: Math.round(matchRate * 10000) / 100,
      matched: matchedItems,
      unmatched: claimPayments.filter((cp) => cp.matchStatus === "unmatched")
        .length,
      exceptions: claimPayments.filter((cp) => cp.matchStatus === "exception")
        .length,
    };
  },
});

/**
 * Resolve an ERA exception line item.
 * Links to a claim and optionally posts payment.
 */
export const resolveException = mutation({
  args: {
    eraId: v.id("eraRecords"),
    claimId: v.id("claims"),
    lineItemIndex: v.number(),
    resolution: v.union(
      v.literal("accept"),
      v.literal("reject"),
      v.literal("adjust")
    ),
    adjustedAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    const era = await ctx.db.get(args.eraId);
    if (!era || era.orgId !== orgId) {
      throw new Error("ERA record not found");
    }

    // Verify claim belongs to org
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.orgId !== orgId) {
      throw new Error("Claim not found");
    }

    const payments = [...era.claimPayments];
    if (args.lineItemIndex < 0 || args.lineItemIndex >= payments.length) {
      throw new Error("Invalid line item index");
    }

    const lineItem = payments[args.lineItemIndex] as any;
    if (lineItem.matchStatus !== "exception" && lineItem.matchStatus !== "unmatched") {
      throw new Error("Line item is not an exception or unmatched");
    }

    // Update the line item
    payments[args.lineItemIndex] = {
      ...lineItem,
      matchedClaimId: args.claimId,
      matchStatus: "matched" as const,
    };

    // Recalculate match rate
    const totalItems = payments.length;
    const matchedItems = payments.filter(
      (cp: any) => cp.matchStatus === "matched"
    ).length;
    const matchRate = totalItems > 0 ? matchedItems / totalItems : 0;

    await ctx.db.patch(args.eraId, {
      claimPayments: payments,
      matchRate: Math.round(matchRate * 10000) / 100,
      updatedAt: now,
    });

    // Post payment if accepted or adjusted
    if (args.resolution === "accept" || args.resolution === "adjust") {
      const paymentAmount =
        args.resolution === "adjust" && args.adjustedAmount !== undefined
          ? args.adjustedAmount
          : lineItem.amountPaid;

      // Update claim with payment
      await ctx.db.patch(args.claimId, {
        status: "paid",
        totalPaid: paymentAmount,
        adjustments: lineItem.adjustments,
        paidAt: now,
        updatedAt: now,
      });

      // Create a payment record
      await ctx.db.insert("payments", {
        orgId,
        patientId: claim.patientId,
        claimId: args.claimId,
        amount: paymentAmount,
        type: "insurance",
        method: "insurance",
        status: "completed",
        paidAt: now,
        notes: `ERA resolution: ${args.resolution}. ERA ID: ${era.eraId}, Check #${era.checkNumber ?? "N/A"}`,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      eraId: args.eraId,
      resolution: args.resolution,
      lineItemIndex: args.lineItemIndex,
    };
  },
});

/**
 * Bulk resolve multiple ERA exceptions with the same resolution.
 */
export const bulkResolve = mutation({
  args: {
    items: v.array(
      v.object({
        eraId: v.id("eraRecords"),
        lineItemIndex: v.number(),
        claimId: v.id("claims"),
      })
    ),
    resolution: v.union(
      v.literal("accept"),
      v.literal("reject"),
      v.literal("adjust")
    ),
    adjustedAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();
    let resolvedCount = 0;

    for (const item of args.items) {
      const era = await ctx.db.get(item.eraId);
      if (!era || era.orgId !== orgId) continue;

      const claim = await ctx.db.get(item.claimId);
      if (!claim || claim.orgId !== orgId) continue;

      const payments = [...era.claimPayments];
      if (item.lineItemIndex < 0 || item.lineItemIndex >= payments.length) {
        continue;
      }

      const lineItem = payments[item.lineItemIndex] as any;
      if (lineItem.matchStatus !== "exception" && lineItem.matchStatus !== "unmatched") {
        continue;
      }

      // Update line item
      payments[item.lineItemIndex] = {
        ...lineItem,
        matchedClaimId: item.claimId,
        matchStatus: "matched" as const,
      };

      // Recalculate match rate
      const totalItems = payments.length;
      const matchedItems = payments.filter(
        (cp: any) => cp.matchStatus === "matched"
      ).length;
      const matchRate = totalItems > 0 ? matchedItems / totalItems : 0;

      await ctx.db.patch(item.eraId, {
        claimPayments: payments,
        matchRate: Math.round(matchRate * 10000) / 100,
        updatedAt: now,
      });

      // Post payment if accepted
      if (args.resolution === "accept" || args.resolution === "adjust") {
        const paymentAmount =
          args.resolution === "adjust" && args.adjustedAmount !== undefined
            ? args.adjustedAmount
            : lineItem.amountPaid;

        await ctx.db.patch(item.claimId, {
          status: "paid",
          totalPaid: paymentAmount,
          adjustments: lineItem.adjustments,
          paidAt: now,
          updatedAt: now,
        });

        await ctx.db.insert("payments", {
          orgId,
          patientId: claim.patientId,
          claimId: item.claimId,
          amount: paymentAmount,
          type: "insurance",
          method: "insurance",
          status: "completed",
          paidAt: now,
          notes: `Bulk ERA resolution: ${args.resolution}. ERA ID: ${era.eraId}`,
          createdAt: now,
          updatedAt: now,
        });
      }

      resolvedCount++;
    }

    return { resolvedCount, total: args.items.length };
  },
});

/**
 * Generate a patient statement based on ERA data.
 * Creates within 48 hours of ERA ingestion per spec.
 */
export const generateStatement = mutation({
  args: {
    patientId: v.id("patients"),
    claimIds: v.array(v.id("claims")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Gather claim details
    const claimDetails = [];
    let totalPatientOwes = 0;

    for (const claimId of args.claimIds) {
      const claim = await ctx.db.get(claimId);
      if (!claim || claim.orgId !== orgId) {
        throw new Error(`Claim ${claimId} not found`);
      }

      const patientPortion = claim.patientPortion ?? 0;
      const totalPaid = claim.totalPaid ?? 0;
      const patientOwes = Math.max(0, patientPortion - totalPaid);

      claimDetails.push({
        claimId: claim._id,
        claimNumber: claim.claimNumber ?? "N/A",
        procedures: claim.procedures,
        totalCharged: claim.totalCharged,
        insurancePaid: totalPaid,
        adjustments: claim.adjustments ?? 0,
        patientPortion: patientPortion,
        patientOwes,
      });

      totalPatientOwes += patientOwes;
    }

    // Create a task for statement delivery (HITL)
    await ctx.db.insert("tasks", {
      orgId,
      title: `Send statement to ${patient.firstName} ${patient.lastName} - $${totalPatientOwes.toFixed(2)}`,
      description: `Generate and send patient statement. Total patient responsibility: $${totalPatientOwes.toFixed(2)} across ${args.claimIds.length} claim(s).`,
      resourceType: "payment",
      resourceId: args.patientId,
      assignedRole: "billing",
      priority: totalPatientOwes > 500 ? "high" : "medium",
      status: "open",
      slaDeadline: now + 48 * 60 * 60 * 1000, // 48 hours per spec
      slaStatus: "on_track",
      isHitlFallback: false,
      workPacket: JSON.stringify({
        action: "send_statement",
        patientId: args.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        claims: claimDetails,
        totalAmount: totalPatientOwes,
      }),
      createdAt: now,
      updatedAt: now,
    });

    return {
      patientId: args.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      claimCount: args.claimIds.length,
      totalPatientOwes: Math.round(totalPatientOwes * 100) / 100,
      claims: claimDetails,
      generatedAt: now,
    };
  },
});
