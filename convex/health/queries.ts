import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

const INTEGRATIONS = [
  "pms_sync",
  "clearinghouse",
  "stripe",
  "twilio",
  "google_business",
  "openai",
  "nexhealth",
] as const;

/**
 * Get overall system health status.
 * Aggregates from most recent health checks: uptime %, avg response time, error count last hour.
 */
export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const checks = await ctx.db
      .query("healthChecks")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    if (checks.length === 0) {
      return {
        overallStatus: "healthy" as const,
        uptimePercentage: 100,
        avgResponseTimeMs: 0,
        errorCountLastHour: 0,
        lastChecked: null,
        totalChecks: 0,
      };
    }

    // Get checks from last hour for error count
    const recentChecks = checks.filter((c: any) => c.timestamp >= oneHourAgo);
    const errorCountLastHour = recentChecks.filter(
      (c: any) => c.status === "down"
    ).length;

    // Calculate uptime from all checks
    const healthyCount = checks.filter(
      (c: any) => c.status === "healthy"
    ).length;
    const uptimePercentage =
      checks.length > 0
        ? Math.round((healthyCount / checks.length) * 1000) / 10
        : 100;

    // Average response time from checks that have it
    const withResponseTime = checks.filter(
      (c: any) => c.responseTimeMs !== undefined
    );
    const avgResponseTimeMs =
      withResponseTime.length > 0
        ? Math.round(
            withResponseTime.reduce(
              (sum: number, c: any) => sum + c.responseTimeMs,
              0
            ) / withResponseTime.length
          )
        : 0;

    // Determine overall status from most recent check per target
    const latestByTarget = new Map<string, any>();
    for (const check of checks) {
      const existing = latestByTarget.get(check.target);
      if (!existing || check.timestamp > existing.timestamp) {
        latestByTarget.set(check.target, check);
      }
    }

    let overallStatus: "healthy" | "degraded" | "down" = "healthy";
    for (const [, check] of latestByTarget) {
      if (check.status === "down") {
        overallStatus = "down";
        break;
      }
      if (check.status === "degraded") {
        overallStatus = "degraded";
      }
    }

    // Most recent check timestamp
    const lastChecked = Math.max(...checks.map((c: any) => c.timestamp));

    return {
      overallStatus,
      uptimePercentage,
      avgResponseTimeMs,
      errorCountLastHour,
      lastChecked,
      totalChecks: checks.length,
    };
  },
});

/**
 * Get practice-level health: last sync time, record counts, data freshness.
 */
export const getPracticeHealth = query({
  args: { practiceId: v.optional(v.id("practices")) },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Get practices
    let practices;
    if (args.practiceId) {
      const practice = await ctx.db.get(args.practiceId);
      if (!practice || practice.orgId !== orgId) {
        throw new Error("Practice not found");
      }
      practices = [practice];
    } else {
      practices = await ctx.db
        .query("practices")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    const results = [];

    for (const practice of practices) {
      // Get latest sync job for this practice
      const syncJobs = await ctx.db
        .query("syncJobs")
        .withIndex("by_practice", (q: any) =>
          q.eq("orgId", orgId).eq("practiceId", practice._id)
        )
        .collect();

      // Most recent sync
      syncJobs.sort((a: any, b: any) => b.createdAt - a.createdAt);
      const latestSync = syncJobs[0] ?? null;

      // Count patients for this practice (patients don't have practiceId, but appointments do)
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_practice_date", (q: any) =>
          q.eq("orgId", orgId).eq("practiceId", practice._id)
        )
        .collect();

      // Data freshness: how long since last sync completed
      const now = Date.now();
      const lastSyncTime = practice.lastSyncAt ?? latestSync?.completedAt ?? null;
      const dataFreshnessMs = lastSyncTime ? now - lastSyncTime : null;
      const dataFreshnessHours = dataFreshnessMs
        ? Math.round((dataFreshnessMs / (1000 * 60 * 60)) * 10) / 10
        : null;

      results.push({
        practiceId: practice._id,
        practiceName: practice.name,
        pmsType: practice.pmsType ?? "unknown",
        pmsConnectionStatus: practice.pmsConnectionStatus ?? "disconnected",
        lastSyncAt: lastSyncTime,
        dataFreshnessHours,
        appointmentCount: appointments.length,
        latestSync: latestSync
          ? {
              jobType: latestSync.jobType,
              status: latestSync.status,
              recordsProcessed: latestSync.recordsProcessed ?? 0,
              recordsFailed: latestSync.recordsFailed ?? 0,
              completedAt: latestSync.completedAt,
            }
          : null,
      });
    }

    return results;
  },
});

/**
 * Get status of each integration.
 * Returns: PMS Sync, Clearinghouse, Stripe, Twilio, Google Business, OpenAI.
 */
export const getIntegrationHealth = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const checks = await ctx.db
      .query("healthChecks")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const integrations = INTEGRATIONS.map((target) => {
      const targetChecks = checks.filter((c: any) => c.target === target);

      // Most recent check
      targetChecks.sort((a: any, b: any) => b.timestamp - a.timestamp);
      const latest = targetChecks[0] ?? null;

      // Error count in last hour
      const recentErrors = targetChecks.filter(
        (c: any) => c.timestamp >= oneHourAgo && c.status !== "healthy"
      ).length;

      return {
        target,
        status: latest?.status ?? ("unknown" as string),
        lastChecked: latest?.timestamp ?? null,
        responseTimeMs: latest?.responseTimeMs ?? null,
        errorCount: recentErrors,
        message: latest?.message ?? null,
      };
    });

    return integrations;
  },
});

/**
 * Get monthly API usage / token utilization.
 * Returns estimated usage for OpenAI, Twilio, Stripe, and budget percentages.
 */
export const getTokenUtilization = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    // Get this month's start
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    // Count AI actions this month (proxy for OpenAI token usage)
    const aiActions = await ctx.db
      .query("aiActions")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const monthlyAiActions = aiActions.filter(
      (a: any) => a.createdAt >= monthStartMs
    );

    // Estimate tokens from execution time (rough heuristic)
    const estimatedTokens = monthlyAiActions.reduce(
      (sum: number, a: any) => sum + (a.executionTimeMs ?? 0) * 2,
      0
    );

    // Count SMS/communications this month (proxy for Twilio)
    const reviewRequests = await ctx.db
      .query("reviewRequests")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const monthlyMessages = reviewRequests.filter(
      (r: any) =>
        r.sentAt && r.sentAt >= monthStartMs && r.sentVia === "sms"
    ).length;

    // Count payments this month (proxy for Stripe API calls)
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const monthlyPayments = payments.filter(
      (p: any) => p.createdAt >= monthStartMs
    ).length;

    // Budget defaults (these would come from practiceSettings in production)
    const budgets = {
      openAiTokenBudget: 1000000,
      twilioMessageBudget: 5000,
      stripeCallBudget: 10000,
    };

    return {
      openAi: {
        estimatedTokensUsed: estimatedTokens,
        aiActionsCount: monthlyAiActions.length,
        budgetPercentage:
          Math.round(
            (estimatedTokens / budgets.openAiTokenBudget) * 1000
          ) / 10,
      },
      twilio: {
        messagesSent: monthlyMessages,
        budgetPercentage:
          Math.round(
            (monthlyMessages / budgets.twilioMessageBudget) * 1000
          ) / 10,
      },
      stripe: {
        apiCalls: monthlyPayments,
        budgetPercentage:
          Math.round(
            (monthlyPayments / budgets.stripeCallBudget) * 1000
          ) / 10,
      },
      period: {
        start: monthStartMs,
        current: Date.now(),
      },
    };
  },
});
