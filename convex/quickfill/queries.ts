import { query } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";

/**
 * List Quick Fill queue items with optional status filter.
 * Joins patient name from patients table. Sorted by priority (urgency) desc.
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("contacted"),
        v.literal("scheduled"),
        v.literal("removed")
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
        .query("quickFillQueue")
        .withIndex("by_status", (q: any) =>
          q.eq("orgId", orgId).eq("status", args.status!)
        )
        .collect();
    } else {
      results = await ctx.db
        .query("quickFillQueue")
        .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
        .collect();
    }

    // Score for sorting: urgent=4, high=3, medium=2, low=1, plus production value weight
    const urgencyScores: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    // Join patient names and compute priority scores
    const enriched = await Promise.all(
      results.map(async (item: any) => {
        const patient = await ctx.db.get(item.patientId) as any;
        const urgencyScore = urgencyScores[item.urgency] ?? 1;
        const valueScore = item.productionValue
          ? Math.min(item.productionValue / 500, 3)
          : 0;
        const priorityScore = urgencyScore * 10 + valueScore;

        return {
          ...item,
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`
            : "Unknown",
          priorityScore,
        };
      })
    );

    // Sort by priority score descending
    enriched.sort((a: any, b: any) => b.priorityScore - a.priorityScore);

    return {
      items: enriched.slice(0, limit),
      totalCount: enriched.length,
    };
  },
});

/**
 * Get a single Quick Fill queue item by ID with org check.
 */
export const getById = query({
  args: { queueItemId: v.id("quickFillQueue") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const item = await ctx.db.get(args.queueItemId);
    if (!item || item.orgId !== orgId) {
      throw new Error("Quick Fill queue item not found");
    }

    // Join patient name
    const patient = await ctx.db.get(item.patientId);

    return {
      ...item,
      patientName: patient
        ? `${patient.firstName} ${patient.lastName}`
        : "Unknown",
    };
  },
});

/**
 * AI "Suggest Patient" for an open slot.
 * Scores waiting queue items by: procedure value, urgency, preferred day/time match, time on waitlist.
 * Returns top 3 suggestions with rationale.
 */
export const getSuggestedPatients = query({
  args: {
    date: v.string(),
    startTime: v.string(),
    duration: v.number(),
    providerId: v.optional(v.id("providers")),
    operatoryId: v.optional(v.id("operatories")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Get all "active" (waiting) queue items
    const waitingItems = await ctx.db
      .query("quickFillQueue")
      .withIndex("by_status", (q: any) =>
        q.eq("orgId", orgId).eq("status", "active")
      )
      .collect();

    const now = Date.now();

    // Determine day of week from date string (e.g., "2026-02-05" -> "Thursday")
    const dayOfWeek = new Date(args.date + "T12:00:00Z").toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    // Score each item
    const scored = await Promise.all(
      waitingItems.map(async (item: any) => {
        const patient = await ctx.db.get(item.patientId) as any;
        const patientName = patient
          ? `${patient.firstName} ${patient.lastName}`
          : "Unknown";

        // Get appointment type for production value
        let appointmentTypeName = "General";
        let procedureValue = 0;
        if (item.appointmentTypeId) {
          const apptType = await ctx.db.get(item.appointmentTypeId) as any;
          if (apptType) {
            appointmentTypeName = apptType.name;
            procedureValue = apptType.productionValue ?? 0;
          }
        }

        // Use item's productionValue if set, otherwise use appointment type value
        const estimatedValue = item.productionValue ?? procedureValue;

        // Scoring factors (each 0-25 points, total max ~100)
        const rationale: string[] = [];

        // 1. Production value score (0-25): higher value = higher score
        const valueScore = Math.min(estimatedValue / 40, 25);
        if (estimatedValue > 0) {
          rationale.push(`$${estimatedValue} production value`);
        }

        // 2. Urgency score (0-25)
        const urgencyScores: Record<string, number> = {
          urgent: 25,
          high: 18,
          medium: 10,
          low: 5,
        };
        const urgencyScore = urgencyScores[item.urgency] ?? 5;
        rationale.push(`${item.urgency} urgency`);

        // 3. Preferred day/time match (0-25)
        let preferenceScore = 0;
        if (item.preferredDays && item.preferredDays.length > 0) {
          const dayMatch = item.preferredDays.some(
            (d: string) => d.toLowerCase() === dayOfWeek.toLowerCase()
          );
          if (dayMatch) {
            preferenceScore += 12;
            rationale.push(`prefers ${dayOfWeek}`);
          }
        } else {
          // No day preference means any day works
          preferenceScore += 6;
        }

        if (item.preferredTimes && item.preferredTimes.length > 0) {
          const slotHour = parseInt(args.startTime.split(":")[0], 10);
          const timeMatch = item.preferredTimes.some((t: string) => {
            if (t.toLowerCase() === "morning") return slotHour < 12;
            if (t.toLowerCase() === "afternoon")
              return slotHour >= 12 && slotHour < 17;
            if (t.toLowerCase() === "evening") return slotHour >= 17;
            return false;
          });
          if (timeMatch) {
            preferenceScore += 13;
            rationale.push(`prefers ${item.preferredTimes.join("/")}`);
          }
        } else {
          preferenceScore += 6;
        }

        // 4. Time on waitlist score (0-25): longer wait = higher priority
        const daysWaiting = Math.floor(
          (now - item.createdAt) / (1000 * 60 * 60 * 24)
        );
        const waitScore = Math.min(daysWaiting * 2, 25);
        if (daysWaiting > 0) {
          rationale.push(`${daysWaiting} days on waitlist`);
        }

        const totalScore = Math.round(
          valueScore + urgencyScore + preferenceScore + waitScore
        );

        return {
          patientId: item.patientId,
          patientName,
          appointmentType: appointmentTypeName,
          score: totalScore,
          rationale: rationale.join("; "),
          queueItemId: item._id,
          estimatedValue,
        };
      })
    );

    // Sort by score descending and return top 3
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  },
});

/**
 * Gap Fill Toolbox: Returns three lists of patients to fill gaps.
 * 1. Overdue hygiene patients (last hygiene > 6 months ago)
 * 2. Unscheduled treatment (patients with no upcoming appointments)
 * 3. ASAP list (patients flagged as urgent in Quick Fill queue)
 */
export const getGapFillToolbox = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    const allPatients = await ctx.db
      .query("patients")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const activePatients = allPatients.filter((p: any) => p.isActive);
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    // 1. Overdue hygiene patients: lastVisitDate > 6 months ago
    const overdueHygiene = activePatients
      .filter((p: any) => {
        if (!p.lastVisitDate) return true; // Never visited = overdue
        return p.lastVisitDate < sixMonthsAgoStr;
      })
      .map((p: any) => ({
        patientId: p._id,
        patientName: `${p.firstName} ${p.lastName}`,
        reason: p.lastVisitDate
          ? `Last visit: ${p.lastVisitDate}`
          : "No visit on record",
        lastVisit: p.lastVisitDate ?? null,
        estimatedValue: 200, // Average hygiene visit value
      }))
      .slice(0, 50);

    // 2. Unscheduled treatment: patients with no upcoming appointments
    // Get all future appointments
    const todayStr = now.toISOString().split("T")[0];
    const futureAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const scheduledPatientIds = new Set(
      futureAppointments
        .filter(
          (a: any) =>
            a.date >= todayStr &&
            (a.status === "scheduled" || a.status === "confirmed")
        )
        .map((a: any) => a.patientId as string)
    );

    const unscheduledTreatment = activePatients
      .filter((p: any) => !scheduledPatientIds.has(p._id as string))
      .map((p: any) => ({
        patientId: p._id,
        patientName: `${p.firstName} ${p.lastName}`,
        reason: "No upcoming appointment scheduled",
        lastVisit: p.lastVisitDate ?? null,
        estimatedValue: p.patientBalance ?? 0,
      }))
      .slice(0, 50);

    // 3. ASAP list: urgent items from Quick Fill queue
    const urgentItems = await ctx.db
      .query("quickFillQueue")
      .withIndex("by_status", (q: any) =>
        q.eq("orgId", orgId).eq("status", "active")
      )
      .collect();

    const asapList = await Promise.all(
      urgentItems
        .filter(
          (item: any) =>
            item.urgency === "urgent" || item.urgency === "high"
        )
        .slice(0, 20)
        .map(async (item: any) => {
          const patient = await ctx.db.get(item.patientId) as any;
          return {
            patientId: item.patientId,
            patientName: patient
              ? `${patient.firstName} ${patient.lastName}`
              : "Unknown",
            reason: `${item.urgency} priority${item.reason ? ` - ${item.reason}` : ""}`,
            lastVisit: patient?.lastVisitDate ?? null,
            estimatedValue: item.productionValue ?? 0,
          };
        })
    );

    return {
      overdueHygiene,
      unscheduledTreatment,
      asapList,
    };
  },
});
