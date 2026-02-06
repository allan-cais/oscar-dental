import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Set or update production goal for a specific date and practice.
 * Upserts: checks if goal exists for that practice+date first.
 */
export const setGoal = mutation({
  args: {
    practiceId: v.id("practices"),
    date: v.string(),
    dailyGoal: v.number(),
    monthlyGoal: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const now = Date.now();

    // Check if goal already exists for this practice + date
    const existing = await ctx.db
      .query("productionGoals")
      .withIndex("by_date", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dailyGoal: args.dailyGoal,
        monthlyGoal: args.monthlyGoal,
        updatedAt: now,
      });
      return existing._id;
    }

    const goalId = await ctx.db.insert("productionGoals", {
      orgId,
      practiceId: args.practiceId,
      date: args.date,
      dailyGoal: args.dailyGoal,
      monthlyGoal: args.monthlyGoal,
      updatedAt: now,
    });

    return goalId;
  },
});

/**
 * Set goals for a date range. Creates or updates a goal record for each date.
 */
export const setBulkGoals = mutation({
  args: {
    practiceId: v.id("practices"),
    startDate: v.string(),
    endDate: v.string(),
    dailyGoal: v.number(),
    monthlyGoal: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const now = Date.now();

    // Generate all dates in range
    const start = new Date(args.startDate + "T00:00:00Z");
    const end = new Date(args.endDate + "T00:00:00Z");
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Get existing goals in range
    const existingGoals = await ctx.db
      .query("productionGoals")
      .withIndex("by_date", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .collect();

    const existingMap: Record<string, any> = {};
    for (const g of existingGoals) {
      if (dates.includes(g.date)) {
        existingMap[g.date] = g;
      }
    }

    const ids: string[] = [];
    for (const date of dates) {
      const existing = existingMap[date];
      if (existing) {
        await ctx.db.patch(existing._id, {
          dailyGoal: args.dailyGoal,
          monthlyGoal: args.monthlyGoal,
          updatedAt: now,
        });
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert("productionGoals", {
          orgId,
          practiceId: args.practiceId,
          date,
          dailyGoal: args.dailyGoal,
          monthlyGoal: args.monthlyGoal,
          updatedAt: now,
        });
        ids.push(id);
      }
    }

    return { count: ids.length, ids };
  },
});

/**
 * Internal mutation for the daily cron.
 * Iterates all practices across all orgs, calculates actual production from
 * completed appointments for today, and updates the productionGoals record.
 * If no goal record exists for today, creates one with zero defaults.
 */
export const updateDailyActuals = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Get all practices (cross-org, cron has no auth context)
    const allPractices = await ctx.db.query("practices").collect();

    let updatedCount = 0;
    let createdCount = 0;

    for (const practice of allPractices) {
      const orgId = practice.orgId;

      // Get completed appointments for today at this practice
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_practice_date", (q: any) =>
          q
            .eq("orgId", orgId)
            .eq("practiceId", practice._id)
            .eq("date", today)
        )
        .collect();

      const completedAppointments = appointments.filter(
        (a: any) => a.status === "completed"
      );

      let actualDaily = 0;
      for (const appt of completedAppointments) {
        if (appt.productionAmount) {
          actualDaily += appt.productionAmount;
        } else if (appt.procedures) {
          for (const proc of appt.procedures) {
            actualDaily += proc.fee;
          }
        }
      }
      actualDaily = Math.round(actualDaily * 100) / 100;

      // Check if a goal record exists for today
      const existingGoal = await ctx.db
        .query("productionGoals")
        .withIndex("by_date", (q: any) =>
          q
            .eq("orgId", orgId)
            .eq("practiceId", practice._id)
            .eq("date", today)
        )
        .first();

      if (existingGoal) {
        await ctx.db.patch(existingGoal._id, {
          actualDaily,
          updatedAt: now,
        });
        updatedCount++;
      } else {
        // Create with zero defaults — practice hasn't set goals yet
        await ctx.db.insert("productionGoals", {
          orgId,
          practiceId: practice._id,
          date: today,
          dailyGoal: 0,
          monthlyGoal: 0,
          actualDaily,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    return { today, updatedCount, createdCount };
  },
});
