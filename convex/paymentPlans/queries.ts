import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List payment plans with optional status filter.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("defaulted"),
        v.literal("cancelled")
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
        .query("paymentPlans")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("paymentPlans")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return {
      plans: results.slice(0, limit),
      totalCount: results.length,
    };
  },
});

/**
 * Get a single payment plan by ID with installment schedule.
 */
export const getById = query({
  args: { planId: v.id("paymentPlans") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.orgId !== orgId) {
      throw new Error("Payment plan not found");
    }

    return plan;
  },
});

/**
 * Get payment plans for a specific patient.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const results = await ctx.db
      .query("paymentPlans")
      .withIndex("by_patient", (q: any) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    return results.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

/**
 * Get payment plans with installments due in the next 7 days.
 */
export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const activePlans = await ctx.db
      .query("paymentPlans")
      .withIndex("by_status", (q: any) =>
        q.eq("orgId", orgId).eq("status", "active")
      )
      .collect();

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const futureStr = sevenDaysFromNow.toISOString().split("T")[0];

    const upcoming = activePlans.filter((plan: any) =>
      plan.installments.some(
        (inst: any) =>
          inst.status === "pending" &&
          inst.dueDate >= todayStr &&
          inst.dueDate <= futureStr
      )
    );

    return upcoming.sort((a: any, b: any) => {
      const aNext = a.installments.find((i: any) => i.status === "pending")?.dueDate ?? "";
      const bNext = b.installments.find((i: any) => i.status === "pending")?.dueDate ?? "";
      return aNext.localeCompare(bNext);
    });
  },
});
