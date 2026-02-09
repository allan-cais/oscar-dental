import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List all Perfect Day templates for a practice, sorted by dayOfWeek.
 */
export const getTemplates = query({
  args: {
    practiceId: v.optional(v.id("practices")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const templates = await ctx.db
      .query("perfectDayTemplates")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // Filter by practiceId if provided, otherwise return all org templates
    const practiceTemplates = args.practiceId
      ? templates.filter((t: any) => t.practiceId === args.practiceId)
      : templates;

    // Sort by dayOfWeek ascending
    practiceTemplates.sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);

    return practiceTemplates;
  },
});

/**
 * Get template for a specific practice + day of week.
 */
export const getByDay = query({
  args: {
    practiceId: v.id("practices"),
    dayOfWeek: v.number(), // 0-6
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const template = await ctx.db
      .query("perfectDayTemplates")
      .withIndex("by_practice_day", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("dayOfWeek", args.dayOfWeek)
      )
      .first();

    return template;
  },
});

/**
 * Compare today's actual schedule against the Perfect Day template.
 * Returns template, actual slots, balance score, and mismatches showing
 * which slot types are over/under-filled.
 */
export const getScheduleBalance = query({
  args: {
    practiceId: v.id("practices"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Determine day of week for the given date
    const dateObj = new Date(args.date + "T00:00:00Z");
    const dayOfWeek = dateObj.getUTCDay();

    // Get the template for this day
    const template = await ctx.db
      .query("perfectDayTemplates")
      .withIndex("by_practice_day", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("dayOfWeek", dayOfWeek)
      )
      .first();

    if (!template || !template.isActive) {
      return {
        template: null,
        actualSlots: [],
        balanceScore: 0,
        mismatches: [],
        message: template
          ? "Template is inactive for this day"
          : "No template defined for this day of week",
      };
    }

    // Get actual appointments for this date
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_practice_date", (q: any) =>
        q
          .eq("orgId", orgId)
          .eq("practiceId", args.practiceId)
          .eq("date", args.date)
      )
      .collect();

    // Exclude cancelled/no-show
    const activeAppointments = appointments.filter(
      (a: any) => a.status !== "cancelled" && a.status !== "no_show"
    );

    // Fetch appointment type info for each appointment
    const actualSlots = [];
    for (const appt of activeAppointments) {
      let category = "other";
      if (appt.appointmentTypeId) {
        const apptType = await ctx.db.get(appt.appointmentTypeId);
        if (apptType) {
          category = (apptType as any).category;
        }
      }
      actualSlots.push({
        startTime: appt.startTime,
        endTime: appt.endTime,
        category,
        status: appt.status,
        appointmentId: appt._id,
      });
    }

    // Count template slots by category
    const templateCounts: Record<string, number> = {};
    for (const slot of template.slots) {
      const cat = slot.category;
      templateCounts[cat] = (templateCounts[cat] || 0) + 1;
    }

    // Count actual appointments by category
    const actualCounts: Record<string, number> = {};
    for (const slot of actualSlots) {
      actualCounts[slot.category] = (actualCounts[slot.category] || 0) + 1;
    }

    // Compute mismatches
    const allCategories = new Set([
      ...Object.keys(templateCounts),
      ...Object.keys(actualCounts),
    ]);

    const mismatches = [];
    let matchedSlots = 0;
    let totalTemplateSlots = template.slots.length;

    for (const category of allCategories) {
      const expected = templateCounts[category] || 0;
      const actual = actualCounts[category] || 0;
      const diff = actual - expected;

      if (diff !== 0) {
        mismatches.push({
          category,
          expected,
          actual,
          difference: diff,
          status: diff > 0 ? "over" : "under",
        });
      }

      matchedSlots += Math.min(expected, actual);
    }

    // Balance score: percentage of template slots that are correctly filled
    const balanceScore =
      totalTemplateSlots > 0
        ? Math.round((matchedSlots / totalTemplateSlots) * 10000) / 100
        : 100;

    return {
      template: {
        _id: template._id,
        name: template.name,
        dayOfWeek: template.dayOfWeek,
        slots: template.slots,
      },
      actualSlots,
      balanceScore,
      mismatches,
    };
  },
});
