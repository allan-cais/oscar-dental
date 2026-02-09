import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    const results = await ctx.db
      .query("aiActions")
      .withIndex("by_status", (q: any) => q.eq("orgId", orgId).eq("status", "pending"))
      .order("desc")
      .collect();
    return results;
  },
});

export const listHistory = query({
  args: {
    actionType: v.optional(v.string()),
    outcome: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const limit = args.limit ?? 50;

    let results = await ctx.db
      .query("aiActions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .collect();

    results = results.filter(
      (a: any) => a.status !== "pending" && a.status !== "error"
    );

    if (args.actionType) {
      results = results.filter((a: any) => a.actionType === args.actionType);
    }

    if (args.outcome) {
      results = results.filter((a: any) => a.status === args.outcome);
    }

    return results.slice(0, limit);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    const all = await ctx.db
      .query("aiActions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const totalActions = all.length;
    const pendingCount = all.filter((a: any) => a.status === "pending").length;
    const approvedCount = all.filter((a: any) => a.status === "approved").length;
    const rejectedCount = all.filter((a: any) => a.status === "rejected").length;
    const completedCount = all.filter((a: any) => a.status === "completed").length;

    const decided = approvedCount + rejectedCount;
    const approvalRate = decided > 0 ? Math.round((approvedCount / decided) * 100) : 0;

    const withConfidence = all.filter((a: any) => a.confidence != null);
    const avgConfidence =
      withConfidence.length > 0
        ? Math.round(
            withConfidence.reduce((sum: number, a: any) => sum + a.confidence, 0) /
              withConfidence.length
          )
        : 0;

    const byType: Record<string, number> = {};
    for (const a of all) {
      const t = (a as any).actionType as string;
      byType[t] = (byType[t] ?? 0) + 1;
    }

    return {
      totalActions,
      pendingCount,
      approvedCount,
      rejectedCount,
      completedCount,
      approvalRate,
      avgConfidence,
      byType,
    };
  },
});
