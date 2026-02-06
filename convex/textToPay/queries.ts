import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List payment links for the org with optional status filter.
 * Sorted by createdAt descending.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("sent"),
        v.literal("paid"),
        v.literal("expired"),
        v.literal("failed")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results;

    if (args.status) {
      results = await ctx.db
        .query("payments")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
      // Further filter to text_to_pay type
      results = results.filter((p: any) => p.type === "text_to_pay");
    } else {
      results = await ctx.db
        .query("payments")
        .withIndex("by_type", (q: any) =>
          q.eq("orgId", orgId).eq("type", "text_to_pay")
        )
        .collect();
    }

    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return {
      paymentLinks: results.slice(0, limit),
      totalCount: results.length,
    };
  },
});

/**
 * Get a single payment link by ID with org check.
 */
export const getById = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.orgId !== orgId || payment.type !== "text_to_pay") {
      throw new Error("Payment link not found");
    }

    return payment;
  },
});

/**
 * Get payment links for a specific patient.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const results = await ctx.db
      .query("payments")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    return results
      .filter((p: any) => p.type === "text_to_pay")
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});
