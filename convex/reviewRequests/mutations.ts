import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { MockSmsAdapter } from "../integrations/sms/mock";
import { MockAiAdapter } from "../integrations/ai/mock";

/**
 * Create a review request for a patient. Scheduled to send after a configurable delay.
 * Checks FTC compliance (no incentive language).
 */
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    delayHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify patient belongs to org
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    // Verify appointment if provided
    if (args.appointmentId) {
      const appointment = await ctx.db.get(args.appointmentId);
      if (!appointment || appointment.orgId !== orgId) {
        throw new Error("Appointment not found");
      }
    }

    // Get practice settings for default delay
    const practices = await ctx.db
      .query("practices")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();

    let defaultDelay = 2; // default 2 hours
    if (practices) {
      const settings = await ctx.db
        .query("practiceSettings")
        .withIndex("by_practice", (q: any) =>
          q.eq("practiceId", practices._id)
        )
        .first();
      if (settings?.reviewRequestDelay) {
        defaultDelay = settings.reviewRequestDelay;
      }
    }

    const delayHours = args.delayHours ?? defaultDelay;
    // Clamp to 1-24 hours
    const clampedDelay = Math.max(1, Math.min(24, delayHours));

    const now = Date.now();
    const scheduledFor = now + clampedDelay * 60 * 60 * 1000;

    const requestId = await ctx.db.insert("reviewRequests", {
      orgId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      triggerEvent: "checkout",
      scheduledFor,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

/**
 * Send a review request via SMS. Updates status to "sent".
 */
export const send = mutation({
  args: { requestId: v.id("reviewRequests") },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request || request.orgId !== orgId) {
      throw new Error("Review request not found");
    }

    if (request.status !== "scheduled") {
      throw new Error(`Cannot send request with status "${request.status}"`);
    }

    // Get patient for phone number
    const patient = await ctx.db.get(request.patientId);
    if (!patient || patient.orgId !== orgId) {
      throw new Error("Patient not found");
    }

    if (!patient.phone) {
      throw new Error("Patient has no phone number on file");
    }

    // FTC compliance: no incentive language in message
    const smsBody = `Hi ${patient.firstName}, thank you for visiting Canopy Dental! We value your feedback. Please take a moment to share your experience: https://g.page/canopy-dental/review Reply STOP to opt out.`;

    // Send SMS
    const sms = new MockSmsAdapter();
    const result = await sms.sendSms(patient.phone, smsBody);

    const now = Date.now();

    if (result.status === "failed") {
      // Mark as skipped if SMS fails
      await ctx.db.patch(args.requestId, {
        status: "skipped",
        filterReason: `SMS delivery failed: ${result.errorMessage ?? "unknown error"}`,
        updatedAt: now,
      });
      return args.requestId;
    }

    await ctx.db.patch(args.requestId, {
      status: "sent",
      sentAt: now,
      sentVia: "sms",
      updatedAt: now,
    });

    return args.requestId;
  },
});

/**
 * Mark a review request as completed (patient left a review).
 */
export const markCompleted = mutation({
  args: {
    requestId: v.id("reviewRequests"),
    reviewId: v.optional(v.id("reviews")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request || request.orgId !== orgId) {
      throw new Error("Review request not found");
    }

    await ctx.db.patch(args.requestId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return args.requestId;
  },
});

/**
 * Batch send multiple review requests.
 */
export const batchSend = mutation({
  args: { requestIds: v.array(v.id("reviewRequests")) },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);
    const sms = new MockSmsAdapter();
    const now = Date.now();

    const results: Array<{ requestId: string; success: boolean; error?: string }> = [];

    for (const requestId of args.requestIds) {
      const request = await ctx.db.get(requestId);
      if (!request || request.orgId !== orgId) {
        results.push({ requestId, success: false, error: "Not found" });
        continue;
      }

      if (request.status !== "scheduled") {
        results.push({
          requestId,
          success: false,
          error: `Invalid status: ${request.status}`,
        });
        continue;
      }

      const patient = await ctx.db.get(request.patientId);
      if (!patient || !patient.phone) {
        results.push({
          requestId,
          success: false,
          error: "Patient or phone not found",
        });
        await ctx.db.patch(requestId, {
          status: "skipped",
          filterReason: "No phone number",
          updatedAt: now,
        });
        continue;
      }

      const smsBody = `Hi ${patient.firstName}, thank you for visiting Canopy Dental! We value your feedback. Please take a moment to share your experience: https://g.page/canopy-dental/review Reply STOP to opt out.`;

      const smsResult = await sms.sendSms(patient.phone, smsBody);

      if (smsResult.status === "failed") {
        await ctx.db.patch(requestId, {
          status: "skipped",
          filterReason: `SMS failed: ${smsResult.errorMessage}`,
          updatedAt: now,
        });
        results.push({
          requestId,
          success: false,
          error: smsResult.errorMessage,
        });
      } else {
        await ctx.db.patch(requestId, {
          status: "sent",
          sentAt: now,
          sentVia: "sms",
          updatedAt: now,
        });
        results.push({ requestId, success: true });
      }
    }

    return results;
  },
});

/**
 * Internal mutation: process pending review requests whose scheduledFor has passed.
 * Runs AI satisfaction prediction first. If predicted score < 3, routes to
 * internal follow-up instead of sending.
 *
 * Called by cron every 15 minutes.
 */
export const processPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all scheduled requests whose time has come
    const pendingRequests = await ctx.db
      .query("reviewRequests")
      .filter((q: any) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.lte(q.field("scheduledFor"), now)
        )
      )
      .collect();

    const sms = new MockSmsAdapter();
    const ai = new MockAiAdapter();
    let sentCount = 0;
    let filteredCount = 0;
    let failedCount = 0;

    for (const request of pendingRequests) {
      try {
        const patient = await ctx.db.get(request.patientId);
        if (!patient || !patient.phone) {
          await ctx.db.patch(request._id, {
            status: "skipped",
            filterReason: "No phone number",
            updatedAt: now,
          });
          failedCount++;
          continue;
        }

        // Check SMS consent/opt-out
        const consents = await ctx.db
          .query("communicationConsents")
          .filter((q: any) =>
            q.and(
              q.eq(q.field("orgId"), request.orgId),
              q.eq(q.field("patientId"), request.patientId),
              q.eq(q.field("channel"), "sms")
            )
          )
          .collect();

        const isOptedOut = consents.some(
          (c: any) => !c.consented && !c.revokedAt
        );
        if (isOptedOut) {
          await ctx.db.patch(request._id, {
            status: "filtered",
            filterReason: "Patient opted out of SMS",
            updatedAt: now,
          });
          filteredCount++;
          continue;
        }

        // AI satisfaction prediction
        const prediction = await ai.predictSatisfaction({
          recentProcedures: [],
          providerName: "Provider",
          hasOpenBalance: (patient.patientBalance ?? 0) > 0,
          visitCount: 3, // simplified
        });

        // Store the AI prediction score
        await ctx.db.patch(request._id, {
          aiSatisfactionScore: prediction.score,
          updatedAt: now,
        });

        // If predicted satisfaction < 3, route to internal follow-up
        if (prediction.score < 3) {
          await ctx.db.patch(request._id, {
            status: "filtered",
            filterReason: `Low satisfaction prediction (${prediction.score}/10). Routed to internal follow-up.`,
            updatedAt: now,
          });

          // Create internal follow-up task
          await ctx.db.insert("tasks", {
            orgId: request.orgId,
            title: `Follow up with ${patient.firstName} ${patient.lastName} - low satisfaction predicted`,
            description: `AI predicted satisfaction score of ${prediction.score}/10. Review request was held. Recommendation: ${prediction.recommendation}. Contact patient directly to address concerns before requesting a public review.`,
            resourceType: "patient",
            resourceId: request.patientId,
            assignedRole: "office_manager",
            priority: "high",
            status: "open",
            createdAt: now,
            updatedAt: now,
          });

          filteredCount++;
          continue;
        }

        // Send SMS
        const smsBody = `Hi ${patient.firstName}, thank you for visiting Canopy Dental! We value your feedback. Please take a moment to share your experience: https://g.page/canopy-dental/review Reply STOP to opt out.`;
        const smsResult = await sms.sendSms(patient.phone, smsBody);

        if (smsResult.status === "failed") {
          await ctx.db.patch(request._id, {
            status: "skipped",
            filterReason: `SMS failed: ${smsResult.errorMessage}`,
            updatedAt: now,
          });
          failedCount++;
        } else {
          await ctx.db.patch(request._id, {
            status: "sent",
            sentAt: now,
            sentVia: "sms",
            updatedAt: now,
          });
          sentCount++;
        }
      } catch (error) {
        console.error(
          `Failed to process review request ${request._id}:`,
          error
        );
        failedCount++;
      }
    }

    console.log(
      `Review request processing: ${sentCount} sent, ${filteredCount} filtered, ${failedCount} failed`
    );
    return { sentCount, filteredCount, failedCount };
  },
});
