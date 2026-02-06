import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * Get production goal for a specific date and practice.
 * Returns goal data plus current actual production calculated from completed
 * appointments on that date.
 */
export const getDailyGoal = query({
  args: {
    practiceId: v.id("practices"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Get the goal record for this date
    const goal = await ctx.db
      .query("productionGoals")
      .withIndex("by_date", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("date", args.date)
      )
      .first();

    // Calculate actual production from completed appointments on this date
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_practice_date", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("date", args.date)
      )
      .collect();

    const completedAppointments = appointments.filter(
      (a: any) => a.status === "completed"
    );

    let actualProduction = 0;
    for (const appt of completedAppointments) {
      if (appt.productionAmount) {
        actualProduction += appt.productionAmount;
      } else if (appt.procedures) {
        for (const proc of appt.procedures) {
          actualProduction += proc.fee;
        }
      }
    }

    actualProduction = Math.round(actualProduction * 100) / 100;

    return {
      date: args.date,
      practiceId: args.practiceId,
      dailyGoal: goal?.dailyGoal ?? 0,
      monthlyGoal: goal?.monthlyGoal ?? 0,
      actualProduction,
      storedActual: goal?.actualDaily ?? null,
      percentComplete:
        goal && goal.dailyGoal > 0
          ? Math.round((actualProduction / goal.dailyGoal) * 10000) / 100
          : 0,
      goalId: goal?._id ?? null,
      providers: goal?.providers ?? [],
    };
  },
});

/**
 * Get monthly production overview for a practice.
 * Returns monthly goal, daily breakdown with goal + actual for each day,
 * total actual, percent complete, and projected month-end production.
 */
export const getMonthlyOverview = query({
  args: {
    practiceId: v.id("practices"),
    month: v.string(), // "YYYY-MM"
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Parse month to get date range
    const [year, monthNum] = args.month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startDate = `${args.month}-01`;
    const endDate = `${args.month}-${String(daysInMonth).padStart(2, "0")}`;

    // Get all production goals for this month
    const goals = await ctx.db
      .query("productionGoals")
      .withIndex("by_date", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .collect();

    const monthGoals = goals.filter(
      (g: any) => g.date >= startDate && g.date <= endDate
    );

    // Build a map of date -> goal
    const goalMap: Record<string, any> = {};
    for (const g of monthGoals) {
      goalMap[g.date] = g;
    }

    // Get all completed appointments for the month
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_practice_date", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .collect();

    const monthAppointments = appointments.filter(
      (a: any) =>
        a.date >= startDate &&
        a.date <= endDate &&
        a.status === "completed"
    );

    // Build actual production by date
    const actualByDate: Record<string, number> = {};
    for (const appt of monthAppointments) {
      let amount = 0;
      if (appt.productionAmount) {
        amount = appt.productionAmount;
      } else if (appt.procedures) {
        for (const proc of appt.procedures) {
          amount += proc.fee;
        }
      }
      actualByDate[appt.date] = (actualByDate[appt.date] || 0) + amount;
    }

    // Build daily goals array
    const dailyGoals = [];
    let totalActual = 0;
    let totalGoal = 0;
    let daysWithData = 0;

    const today = new Date().toISOString().split("T")[0];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${args.month}-${String(d).padStart(2, "0")}`;
      const goal = goalMap[dateStr];
      const actual = Math.round((actualByDate[dateStr] || 0) * 100) / 100;

      dailyGoals.push({
        date: dateStr,
        goal: goal?.dailyGoal ?? 0,
        actual,
        percentComplete:
          goal && goal.dailyGoal > 0
            ? Math.round((actual / goal.dailyGoal) * 10000) / 100
            : 0,
      });

      totalActual += actual;
      totalGoal += goal?.dailyGoal ?? 0;

      if (dateStr <= today && (actual > 0 || goal)) {
        daysWithData++;
      }
    }

    totalActual = Math.round(totalActual * 100) / 100;

    // Monthly goal comes from the first goal record (all records for the month share the same monthlyGoal)
    const monthlyGoal = monthGoals.length > 0 ? monthGoals[0].monthlyGoal : 0;

    // Projected month-end: extrapolate from current pace
    const avgDailyProduction =
      daysWithData > 0 ? totalActual / daysWithData : 0;
    const projectedMonthEnd = Math.round(avgDailyProduction * daysInMonth * 100) / 100;

    return {
      month: args.month,
      practiceId: args.practiceId,
      monthlyGoal,
      dailyGoals,
      totalActual,
      totalGoal: Math.round(totalGoal * 100) / 100,
      percentComplete:
        monthlyGoal > 0
          ? Math.round((totalActual / monthlyGoal) * 10000) / 100
          : 0,
      projectedMonthEnd,
      daysWithData,
      daysInMonth,
    };
  },
});

/**
 * Break down daily production by provider.
 * Returns array of provider production data for a specific date.
 */
export const getProviderBreakdown = query({
  args: {
    practiceId: v.id("practices"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Get all appointments for this practice + date
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_practice_date", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("date", args.date)
      )
      .collect();

    // Group by provider
    const providerMap: Record<
      string,
      {
        providerId: string;
        scheduledProduction: number;
        completedProduction: number;
        appointmentCount: number;
      }
    > = {};

    for (const appt of appointments) {
      const pid = appt.providerId as string;
      if (!providerMap[pid]) {
        providerMap[pid] = {
          providerId: pid,
          scheduledProduction: 0,
          completedProduction: 0,
          appointmentCount: 0,
        };
      }

      let amount = 0;
      if (appt.productionAmount) {
        amount = appt.productionAmount;
      } else if (appt.procedures) {
        for (const proc of appt.procedures) {
          amount += proc.fee;
        }
      }

      providerMap[pid].appointmentCount++;
      providerMap[pid].scheduledProduction += amount;

      if (appt.status === "completed") {
        providerMap[pid].completedProduction += amount;
      }
    }

    // Fetch provider names
    const result = [];
    for (const [pid, data] of Object.entries(providerMap)) {
      const provider = await ctx.db.get(pid as any);
      result.push({
        providerId: data.providerId,
        providerName: provider
          ? `${(provider as any).firstName} ${(provider as any).lastName}`
          : "Unknown",
        scheduledProduction:
          Math.round(data.scheduledProduction * 100) / 100,
        completedProduction:
          Math.round(data.completedProduction * 100) / 100,
        appointmentCount: data.appointmentCount,
      });
    }

    // Sort by completed production descending
    result.sort((a, b) => b.completedProduction - a.completedProduction);

    return result;
  },
});

/**
 * Get a week of daily production data starting from weekStartDate.
 * Returns 7 days of { date, goal, actual, percentComplete }.
 */
export const getWeeklyTrend = query({
  args: {
    practiceId: v.id("practices"),
    weekStartDate: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Generate 7 dates
    const startDate = new Date(args.weekStartDate + "T00:00:00Z");
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Get all goals in this range
    const goals = await ctx.db
      .query("productionGoals")
      .withIndex("by_date", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .collect();

    const weekGoals = goals.filter(
      (g: any) => dates.includes(g.date)
    );

    const goalMap: Record<string, any> = {};
    for (const g of weekGoals) {
      goalMap[g.date] = g;
    }

    // Get completed appointments in this range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_practice_date", (q: any) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .collect();

    const weekAppointments = appointments.filter(
      (a: any) =>
        dates.includes(a.date) && a.status === "completed"
    );

    // Actual by date
    const actualByDate: Record<string, number> = {};
    for (const appt of weekAppointments) {
      let amount = 0;
      if (appt.productionAmount) {
        amount = appt.productionAmount;
      } else if (appt.procedures) {
        for (const proc of appt.procedures) {
          amount += proc.fee;
        }
      }
      actualByDate[appt.date] = (actualByDate[appt.date] || 0) + amount;
    }

    const days = dates.map((date) => {
      const goal = goalMap[date];
      const actual = Math.round((actualByDate[date] || 0) * 100) / 100;
      return {
        date,
        goal: goal?.dailyGoal ?? 0,
        actual,
        percentComplete:
          goal && goal.dailyGoal > 0
            ? Math.round((actual / goal.dailyGoal) * 10000) / 100
            : 0,
      };
    });

    return { weekStartDate: args.weekStartDate, days };
  },
});
