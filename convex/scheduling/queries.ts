import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List appointments with optional filters.
 */
export const list = query({
  args: {
    date: v.optional(v.string()),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
    providerId: v.optional(v.id("providers")),
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("confirmed"),
        v.literal("checked_in"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("no_show")
      )
    ),
    practiceId: v.optional(v.id("practices")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Choose the best index based on provided filters
    let results;

    if (args.providerId && args.date) {
      results = await ctx.db
        .query("appointments")
        .withIndex("by_provider_date", (q) =>
          q
            .eq("orgId", orgId)
            .eq("providerId", args.providerId!)
            .eq("date", args.date!)
        )
        .collect();
    } else if (args.practiceId && args.date) {
      results = await ctx.db
        .query("appointments")
        .withIndex("by_practice_date", (q) =>
          q
            .eq("orgId", orgId)
            .eq("practiceId", args.practiceId!)
            .eq("date", args.date!)
        )
        .collect();
    } else if (args.date) {
      results = await ctx.db
        .query("appointments")
        .withIndex("by_date", (q) =>
          q.eq("orgId", orgId).eq("date", args.date!)
        )
        .collect();
    } else if (args.status) {
      results = await ctx.db
        .query("appointments")
        .withIndex("by_status", (q) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else if (args.practiceId && args.dateRangeStart) {
      // Date range with practice: use practice_date index with range
      results = await ctx.db
        .query("appointments")
        .withIndex("by_practice_date", (q) => {
          const base = q
            .eq("orgId", orgId)
            .eq("practiceId", args.practiceId!);
          if (args.dateRangeStart && args.dateRangeEnd) {
            return base
              .gte("date", args.dateRangeStart)
              .lte("date", args.dateRangeEnd);
          }
          return base.gte("date", args.dateRangeStart!);
        })
        .collect();
    } else if (args.dateRangeStart) {
      // Date range: use by_date index with range
      results = await ctx.db
        .query("appointments")
        .withIndex("by_date", (q) => {
          const base = q.eq("orgId", orgId);
          if (args.dateRangeStart && args.dateRangeEnd) {
            return base
              .gte("date", args.dateRangeStart)
              .lte("date", args.dateRangeEnd);
          }
          return base.gte("date", args.dateRangeStart!);
        })
        .collect();
    } else {
      results = await ctx.db
        .query("appointments")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
    }

    // Apply remaining filters not already handled by the chosen index path.
    // The index selection above picks the most specific index, but secondary
    // filters (e.g., status when the primary index was by_date) still need
    // client-side filtering.
    const usedStatusIndex =
      !args.date && !args.providerId && !args.practiceId && !args.dateRangeStart && !!args.status;
    const usedProviderIndex = !!args.providerId && !!args.date;
    const usedPracticeIndex =
      (!!args.practiceId && !!args.date) ||
      (!!args.practiceId && !!args.dateRangeStart);

    if (args.providerId && !usedProviderIndex) {
      results = results.filter((a) => a.providerId === args.providerId);
    }
    if (args.practiceId && !usedPracticeIndex) {
      results = results.filter((a) => a.practiceId === args.practiceId);
    }
    if (args.status && !usedStatusIndex) {
      results = results.filter((a) => a.status === args.status);
    }

    return results;
  },
});

/**
 * Get a single appointment by ID with org check.
 */
export const getById = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.orgId !== orgId) {
      throw new Error("Appointment not found");
    }

    return appointment;
  },
});

/**
 * Get all appointments for a specific date, ordered by startTime.
 */
export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("orgId", orgId).eq("date", args.date))
      .collect();

    return appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

/**
 * Get appointments for a specific provider on a date.
 */
export const getByProvider = query({
  args: {
    providerId: v.id("providers"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_provider_date", (q) =>
        q
          .eq("orgId", orgId)
          .eq("providerId", args.providerId)
          .eq("date", args.date)
      )
      .collect();

    return appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },
});

/**
 * Get all appointments for a patient, ordered by date descending.
 */
export const getByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) =>
        q.eq("orgId", orgId).eq("patientId", args.patientId)
      )
      .collect();

    return appointments.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.startTime.localeCompare(a.startTime);
    });
  },
});

/**
 * Get upcoming appointments for the next 7 days.
 */
export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 7);
    const futureStr = futureDate.toISOString().split("T")[0];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) =>
        q.eq("orgId", orgId).gte("date", todayStr).lte("date", futureStr)
      )
      .collect();

    return appointments.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });
  },
});
