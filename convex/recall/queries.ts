import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List recall due items with optional filters.
 * Joins patient name. Sorted by dueDate ascending (most overdue first).
 */
export const getDueList = query({
  args: {
    recallType: v.optional(
      v.union(
        v.literal("hygiene"),
        v.literal("periodic_exam"),
        v.literal("perio_maintenance")
      )
    ),
    overdueBucket: v.optional(
      v.union(
        v.literal("1month"),
        v.literal("2months"),
        v.literal("3plus")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("sms_sent"),
        v.literal("email_sent"),
        v.literal("called"),
        v.literal("scheduled"),
        v.literal("refused")
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
        .query("recallDueList")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("outreachStatus", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("recallDueList")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Apply recall type filter
    if (args.recallType) {
      results = results.filter(
        (r: any) => r.recallType === args.recallType
      );
    }

    // Apply overdue bucket filter
    if (args.overdueBucket) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const oneMonthAgoStr = oneMonthAgo.toISOString().split("T")[0];
      const twoMonthsAgoStr = twoMonthsAgo.toISOString().split("T")[0];
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

      results = results.filter((r: any) => {
        // Only include items that are actually overdue (dueDate < today)
        if (r.dueDate >= todayStr) return false;

        if (args.overdueBucket === "1month") {
          // Overdue by up to 1 month: dueDate between oneMonthAgo and today
          return r.dueDate >= oneMonthAgoStr && r.dueDate < todayStr;
        } else if (args.overdueBucket === "2months") {
          // Overdue by 1-2 months: dueDate between twoMonthsAgo and oneMonthAgo
          return r.dueDate >= twoMonthsAgoStr && r.dueDate < oneMonthAgoStr;
        } else if (args.overdueBucket === "3plus") {
          // Overdue by 3+ months: dueDate before threeMonthsAgo
          return r.dueDate < threeMonthsAgoStr;
        }
        return true;
      });
    }

    // Sort by dueDate ascending (most overdue first)
    results.sort((a: any, b: any) => {
      if (a.dueDate < b.dueDate) return -1;
      if (a.dueDate > b.dueDate) return 1;
      return 0;
    });

    // Join patient names
    const enriched = await Promise.all(
      results.slice(0, limit).map(async (item: any) => {
        const patient = await ctx.db.get(item.patientId) as any;
        return {
          ...item,
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`
            : "Unknown",
          patientPhone: patient?.phone ?? null,
          patientEmail: patient?.email ?? null,
        };
      })
    );

    return {
      items: enriched,
      totalCount: results.length,
    };
  },
});

/**
 * Aggregate overdue recalls into buckets: 1 month, 2 months, 3+ months overdue.
 * Returns counts and total estimated value per bucket.
 */
export const getOverdueReport = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allRecalls = await ctx.db
      .query("recallDueList")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const oneMonthAgoStr = oneMonthAgo.toISOString().split("T")[0];
    const twoMonthsAgoStr = twoMonthsAgo.toISOString().split("T")[0];
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

    // Filter to only overdue items (not yet scheduled/refused)
    const overdueStatuses = ["pending", "sms_sent", "email_sent", "called"];
    const overdue = allRecalls.filter(
      (r: any) =>
        r.dueDate < todayStr && overdueStatuses.includes(r.outreachStatus)
    );

    // Average value per recall type
    const recallValues: Record<string, number> = {
      hygiene: 200,
      periodic_exam: 150,
      perio_maintenance: 250,
    };

    const buckets = {
      "1month": { count: 0, estimatedValue: 0 },
      "2months": { count: 0, estimatedValue: 0 },
      "3plus": { count: 0, estimatedValue: 0 },
    };

    for (const r of overdue) {
      const value = recallValues[r.recallType] ?? 150;

      if (r.dueDate >= oneMonthAgoStr) {
        buckets["1month"].count++;
        buckets["1month"].estimatedValue += value;
      } else if (r.dueDate >= twoMonthsAgoStr) {
        buckets["2months"].count++;
        buckets["2months"].estimatedValue += value;
      } else {
        buckets["3plus"].count++;
        buckets["3plus"].estimatedValue += value;
      }
    }

    return {
      totalOverdue: overdue.length,
      buckets,
      totalEstimatedValue:
        buckets["1month"].estimatedValue +
        buckets["2months"].estimatedValue +
        buckets["3plus"].estimatedValue,
    };
  },
});

/**
 * Get recall items for a specific patient.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    const recalls = await ctx.db
      .query("recallDueList")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter by patient (no patient index on recallDueList)
    const patientRecalls = recalls.filter(
      (r: any) => r.patientId === args.patientId
    );

    // Sort by dueDate descending (most recent first)
    patientRecalls.sort((a: any, b: any) => {
      if (a.dueDate > b.dueDate) return -1;
      if (a.dueDate < b.dueDate) return 1;
      return 0;
    });

    return patientRecalls;
  },
});
