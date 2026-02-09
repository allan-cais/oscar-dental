import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getOrgId } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

// ---------------------------------------------------------------------------
// NexHealth Configuration — Mutations
// ---------------------------------------------------------------------------

/**
 * Save (create or update) a NexHealth configuration for a practice.
 * If a config already exists for the org+practice pair, it is updated.
 * Otherwise a new record is inserted.
 */
export const saveConfig = mutation({
  args: {
    practiceId: v.id("practices"),
    apiKey: v.string(),
    subdomain: v.string(),
    locationId: v.string(),
    environment: v.union(v.literal("sandbox"), v.literal("production")),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify practice belongs to org
    const practice = await ctx.db.get(args.practiceId);
    if (!practice || practice.orgId !== orgId) {
      throw new Error("Practice not found");
    }

    const now = Date.now();

    // Check for existing config
    const existing = await ctx.db
      .query("nexhealthConfigs")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", orgId).eq("practiceId", args.practiceId)
      )
      .first();

    let configId;

    if (existing) {
      // Update existing config
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        subdomain: args.subdomain,
        locationId: args.locationId,
        environment: args.environment,
        updatedAt: now,
      });
      configId = existing._id;
    } else {
      // Insert new config
      configId = await ctx.db.insert("nexhealthConfigs", {
        orgId,
        practiceId: args.practiceId,
        apiKey: args.apiKey,
        subdomain: args.subdomain,
        locationId: args.locationId,
        environment: args.environment,
        isActive: true,
        connectionStatus: "disconnected",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Audit log
    await createAuditLog(ctx, {
      action: "nexhealth.config.save",
      resourceType: "nexhealthConfig",
      resourceId: configId,
      phiAccessed: false,
    });

    return configId;
  },
});

/**
 * Update connection status for a NexHealth config.
 * Internal-only — called by sync actions, health checks, and webhooks.
 */
export const updateConnectionStatus = internalMutation({
  args: {
    configId: v.id("nexhealthConfigs"),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const updates: Record<string, unknown> = {
      connectionStatus: args.status,
      updatedAt: now,
    };

    // If connected, also record the sync timestamp
    if (args.status === "connected") {
      updates.lastSyncAt = now;
    }

    await ctx.db.patch(args.configId, updates);
  },
});

/**
 * Soft-delete a NexHealth configuration.
 * Sets isActive=false and connectionStatus="disconnected".
 */
export const deleteConfig = mutation({
  args: {
    configId: v.id("nexhealthConfigs"),
  },
  handler: async (ctx, args) => {
    const orgId = await getOrgId(ctx);

    // Verify config belongs to org
    const config = await ctx.db.get(args.configId);
    if (!config || config.orgId !== orgId) {
      throw new Error("NexHealth config not found");
    }

    const now = Date.now();

    // Soft delete
    await ctx.db.patch(args.configId, {
      isActive: false,
      connectionStatus: "disconnected",
      updatedAt: now,
    });

    // Audit log
    await createAuditLog(ctx, {
      action: "nexhealth.config.delete",
      resourceType: "nexhealthConfig",
      resourceId: args.configId,
      phiAccessed: false,
    });
  },
});

// ---------------------------------------------------------------------------
// NexHealth Pull Sync — Upsert Mutations
// Called by sync actions to upsert data pulled from NexHealth into Oscar tables.
// All are internalMutation (not client-callable).
// ---------------------------------------------------------------------------

/**
 * Upsert a patient synced from NexHealth / PMS.
 * Matches by pmsPatientId first, then fuzzy name+DOB, else creates new.
 */
export const upsertSyncedPatient = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsPatientId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Try exact match by pmsPatientId
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsPatientId", args.pmsPatientId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        dateOfBirth: args.dateOfBirth,
        gender: args.gender,
        email: args.email,
        phone: args.phone,
        address: args.address,
        isActive: args.isActive,
        lastSyncAt: now,
        updatedAt: now,
      });

      await createAuditLog(ctx, {
        action: "nexhealth.sync.patient",
        resourceType: "patient",
        resourceId: existing._id,
        phiAccessed: true,
        details: { operation: "update", pmsPatientId: args.pmsPatientId },
      });

      return existing._id;
    }

    // 2. Fuzzy match by name + DOB
    const nameMatches = await ctx.db
      .query("patients")
      .withIndex("by_name", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("lastName", args.lastName)
          .eq("firstName", args.firstName)
      )
      .collect();

    const dobMatches = nameMatches.filter(
      (p) => p.dateOfBirth === args.dateOfBirth
    );

    if (dobMatches.length === 1) {
      // Exact single match — link it
      const match = dobMatches[0];
      await ctx.db.patch(match._id, {
        pmsPatientId: args.pmsPatientId,
        gender: args.gender,
        email: args.email,
        phone: args.phone,
        address: args.address,
        isActive: args.isActive,
        matchStatus: "matched",
        lastSyncAt: now,
        updatedAt: now,
      });

      await createAuditLog(ctx, {
        action: "nexhealth.sync.patient",
        resourceType: "patient",
        resourceId: match._id,
        phiAccessed: true,
        details: { operation: "link", pmsPatientId: args.pmsPatientId },
      });

      return match._id;
    }

    if (dobMatches.length > 1) {
      // Multiple matches — link first, queue for review
      const first = dobMatches[0];
      await ctx.db.patch(first._id, {
        pmsPatientId: args.pmsPatientId,
        matchStatus: "ambiguous",
        lastSyncAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("patientMatchQueue", {
        orgId: args.orgId,
        oscarPatientId: first.oscarPatientId,
        pmsPatientId: args.pmsPatientId,
        matchScore: 0.8,
        matchFields: ["name", "dateOfBirth"],
        status: "pending",
        createdAt: now,
      });

      await createAuditLog(ctx, {
        action: "nexhealth.sync.patient",
        resourceType: "patient",
        resourceId: first._id,
        phiAccessed: true,
        details: {
          operation: "ambiguous_match",
          pmsPatientId: args.pmsPatientId,
          candidateCount: dobMatches.length,
        },
      });

      return first._id;
    }

    // 3. No matches — create new patient
    const oscarPatientId =
      "OSC-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

    const patientId = await ctx.db.insert("patients", {
      orgId: args.orgId,
      oscarPatientId,
      pmsPatientId: args.pmsPatientId,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      email: args.email,
      phone: args.phone,
      address: args.address,
      isActive: args.isActive,
      matchStatus: "matched",
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await createAuditLog(ctx, {
      action: "nexhealth.sync.patient",
      resourceType: "patient",
      resourceId: patientId,
      phiAccessed: true,
      details: { operation: "create", pmsPatientId: args.pmsPatientId },
    });

    return patientId;
  },
});

/**
 * Upsert an appointment synced from NexHealth / PMS.
 * Resolves patient + provider by PMS IDs, then upserts the appointment.
 */
export const upsertSyncedAppointment = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsAppointmentId: v.string(),
    pmsPatientId: v.string(),
    pmsProviderId: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    duration: v.number(),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Resolve patientId by pmsPatientId
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsPatientId", args.pmsPatientId)
      )
      .first();

    if (!patient) return null;

    // Resolve providerId by practiceId + pmsProviderId
    const provider = await ctx.db
      .query("providers")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("pmsProviderId"), args.pmsProviderId))
      .first();

    if (!provider) return null;

    // Compute endTime if not provided
    let endTime = args.endTime;
    if (!endTime) {
      const [hours, minutes] = args.startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + args.duration;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMins = totalMinutes % 60;
      endTime =
        String(endHours).padStart(2, "0") +
        ":" +
        String(endMins).padStart(2, "0");
    }

    // Look up existing appointment by practice+date, filter by pmsAppointmentId
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_practice_date", (q) =>
        q
          .eq("orgId", args.orgId)
          .eq("practiceId", args.practiceId)
          .eq("date", args.date)
      )
      .filter((q) =>
        q.eq(q.field("pmsAppointmentId"), args.pmsAppointmentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        patientId: patient._id,
        providerId: provider._id,
        date: args.date,
        startTime: args.startTime,
        endTime,
        duration: args.duration,
        status: args.status as any,
        notes: args.notes,
        lastSyncAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    // Insert new appointment
    const appointmentId = await ctx.db.insert("appointments", {
      orgId: args.orgId,
      practiceId: args.practiceId,
      patientId: patient._id,
      providerId: provider._id,
      pmsAppointmentId: args.pmsAppointmentId,
      date: args.date,
      startTime: args.startTime,
      endTime,
      duration: args.duration,
      status: args.status as any,
      notes: args.notes,
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return appointmentId;
  },
});

/**
 * Upsert a provider synced from NexHealth / PMS.
 */
export const upsertSyncedProvider = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsProviderId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    npi: v.optional(v.string()),
    type: v.union(
      v.literal("dentist"),
      v.literal("hygienist"),
      v.literal("specialist"),
      v.literal("assistant")
    ),
    specialty: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("providers")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("pmsProviderId"), args.pmsProviderId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        npi: args.npi,
        type: args.type,
        specialty: args.specialty,
        isActive: args.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    const providerId = await ctx.db.insert("providers", {
      orgId: args.orgId,
      practiceId: args.practiceId,
      pmsProviderId: args.pmsProviderId,
      firstName: args.firstName,
      lastName: args.lastName,
      npi: args.npi,
      type: args.type,
      specialty: args.specialty,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    return providerId;
  },
});

/**
 * Upsert an operatory synced from NexHealth / PMS.
 */
export const upsertSyncedOperatory = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsOperatoryId: v.string(),
    name: v.string(),
    shortName: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("operatories")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("pmsOperatoryId"), args.pmsOperatoryId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        shortName: args.shortName,
        isActive: args.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    const operatoryId = await ctx.db.insert("operatories", {
      orgId: args.orgId,
      practiceId: args.practiceId,
      pmsOperatoryId: args.pmsOperatoryId,
      name: args.name,
      shortName: args.shortName,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    return operatoryId;
  },
});

/**
 * Upsert an appointment type synced from NexHealth / PMS.
 */
export const upsertSyncedAppointmentType = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsAppointmentTypeId: v.string(),
    name: v.string(),
    duration: v.number(),
    color: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("pmsAppointmentTypeId"), args.pmsAppointmentTypeId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        duration: args.duration,
        color: args.color,
        isActive: args.isActive,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("appointmentTypes", {
      orgId: args.orgId,
      practiceId: args.practiceId,
      pmsAppointmentTypeId: args.pmsAppointmentTypeId,
      name: args.name,
      duration: args.duration,
      color: args.color,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert an insurance coverage synced from NexHealth / PMS.
 * Updates the patient's primaryInsurance or secondaryInsurance fields based on coverage rank.
 */
export const upsertSyncedInsuranceCoverage = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsInsuranceCoverageId: v.string(),
    pmsPatientId: v.string(),
    insurancePlanId: v.optional(v.string()),
    memberId: v.optional(v.string()),
    groupNumber: v.optional(v.string()),
    subscriberName: v.optional(v.string()),
    subscriberDob: v.optional(v.string()),
    relationship: v.optional(v.string()),
    rank: v.optional(v.string()),
    effectiveDate: v.optional(v.string()),
    terminationDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the patient by PMS ID
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsPatientId", args.pmsPatientId)
      )
      .first();

    if (!patient) return null;

    // Look up the insurance plan to get payer name and ID
    let payerName = "";
    let payerId = args.insurancePlanId ?? "";
    if (args.insurancePlanId) {
      const plan = await ctx.db
        .query("insurancePlans")
        .withIndex("by_pms_id", (q) =>
          q.eq("orgId", args.orgId).eq("pmsInsurancePlanId", args.insurancePlanId!)
        )
        .first();
      if (plan) {
        payerName = plan.payerName ?? plan.name;
        payerId = plan.payerId ?? args.insurancePlanId;
      }
    }

    // Build insurance data object
    const insuranceData = {
      payerId,
      payerName,
      memberId: args.memberId ?? "",
      groupNumber: args.groupNumber,
      subscriberName: args.subscriberName,
      subscriberDob: args.subscriberDob,
      relationship: args.relationship,
    };

    // Update patient's insurance fields based on rank
    const updates: Record<string, unknown> = { updatedAt: now, lastSyncAt: now };
    if (args.rank === "secondary") {
      updates.secondaryInsurance = insuranceData;
    } else {
      // Default to primary
      updates.primaryInsurance = insuranceData;
    }

    await ctx.db.patch(patient._id, updates);
    return patient._id;
  },
});

/**
 * Upsert a recall synced from NexHealth / PMS.
 * Updates the patient's nextRecallDate rather than maintaining a separate recalls table.
 */
export const upsertSyncedRecall = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsRecallId: v.string(),
    pmsPatientId: v.string(),
    recallTypeId: v.optional(v.string()),
    dueDate: v.string(),
    status: v.optional(v.string()),
    completedDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the patient by PMS ID to get their nextRecallDate updated
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsPatientId", args.pmsPatientId)
      )
      .first();

    if (!patient) return null;

    // Update patient's nextRecallDate if this recall's due date is relevant
    if (args.status !== "completed" && (!patient.nextRecallDate || args.dueDate < patient.nextRecallDate)) {
      await ctx.db.patch(patient._id, {
        nextRecallDate: args.dueDate,
        updatedAt: now,
      });
    }

    return patient._id;
  },
});

/**
 * Upsert a fee schedule synced from NexHealth / PMS.
 */
export const upsertSyncedFeeSchedule = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsFeeScheduleId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("feeSchedules")
      .withIndex("by_practice", (q) =>
        q.eq("orgId", args.orgId).eq("practiceId", args.practiceId)
      )
      .filter((q) => q.eq(q.field("pmsFeeScheduleId"), args.pmsFeeScheduleId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        isDefault: args.isDefault,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("feeSchedules", {
      orgId: args.orgId,
      practiceId: args.practiceId,
      pmsFeeScheduleId: args.pmsFeeScheduleId,
      name: args.name,
      description: args.description,
      isDefault: args.isDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// ---------------------------------------------------------------------------
// PMS-Synced Financial & Clinical Data Upserts
// Called by sync actions to upsert financial and clinical data from NexHealth.
// All are internalMutation (not client-callable).
// ---------------------------------------------------------------------------

/**
 * Upsert a dental procedure synced from NexHealth / PMS.
 */
export const upsertSyncedProcedure = internalMutation({
  args: {
    orgId: v.string(),
    pmsProcedureId: v.string(),
    pmsPatientId: v.optional(v.string()),
    pmsAppointmentId: v.optional(v.string()),
    pmsProviderId: v.optional(v.string()),
    code: v.string(),
    description: v.optional(v.string()),
    fee: v.optional(v.number()),
    tooth: v.optional(v.string()),
    surface: v.optional(v.string()),
    status: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("procedures")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsProcedureId", args.pmsProcedureId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        pmsAppointmentId: args.pmsAppointmentId,
        pmsProviderId: args.pmsProviderId,
        code: args.code,
        description: args.description,
        fee: args.fee,
        tooth: args.tooth,
        surface: args.surface,
        status: args.status,
        completedAt: args.completedAt,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("procedures", {
      orgId: args.orgId,
      pmsProcedureId: args.pmsProcedureId,
      pmsPatientId: args.pmsPatientId,
      pmsAppointmentId: args.pmsAppointmentId,
      pmsProviderId: args.pmsProviderId,
      code: args.code,
      description: args.description,
      fee: args.fee,
      tooth: args.tooth,
      surface: args.surface,
      status: args.status,
      completedAt: args.completedAt,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a financial charge synced from NexHealth / PMS.
 */
export const upsertSyncedCharge = internalMutation({
  args: {
    orgId: v.string(),
    pmsChargeId: v.string(),
    pmsPatientId: v.optional(v.string()),
    pmsProviderId: v.optional(v.string()),
    amount: v.number(),
    procedureCode: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    status: v.optional(v.string()),
    pmsClaimId: v.optional(v.string()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("charges")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsChargeId", args.pmsChargeId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        pmsProviderId: args.pmsProviderId,
        amount: args.amount,
        procedureCode: args.procedureCode,
        description: args.description,
        date: args.date,
        status: args.status,
        pmsClaimId: args.pmsClaimId,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("charges", {
      orgId: args.orgId,
      pmsChargeId: args.pmsChargeId,
      pmsPatientId: args.pmsPatientId,
      pmsProviderId: args.pmsProviderId,
      amount: args.amount,
      procedureCode: args.procedureCode,
      description: args.description,
      date: args.date,
      status: args.status,
      pmsClaimId: args.pmsClaimId,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a PMS payment record synced from NexHealth / PMS.
 * Distinct from Oscar's text-to-pay `payments` table.
 */
export const upsertSyncedPmsPayment = internalMutation({
  args: {
    orgId: v.string(),
    pmsPaymentId: v.string(),
    pmsPatientId: v.optional(v.string()),
    amount: v.number(),
    paymentTypeId: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    date: v.optional(v.string()),
    note: v.optional(v.string()),
    pmsClaimId: v.optional(v.string()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("pmsPayments")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsPaymentId", args.pmsPaymentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        paymentTypeId: args.paymentTypeId,
        paymentMethod: args.paymentMethod,
        date: args.date,
        note: args.note,
        pmsClaimId: args.pmsClaimId,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("pmsPayments", {
      orgId: args.orgId,
      pmsPaymentId: args.pmsPaymentId,
      pmsPatientId: args.pmsPatientId,
      amount: args.amount,
      paymentTypeId: args.paymentTypeId,
      paymentMethod: args.paymentMethod,
      date: args.date,
      note: args.note,
      pmsClaimId: args.pmsClaimId,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a financial adjustment synced from NexHealth / PMS.
 */
export const upsertSyncedAdjustment = internalMutation({
  args: {
    orgId: v.string(),
    pmsAdjustmentId: v.string(),
    pmsPatientId: v.optional(v.string()),
    pmsProviderId: v.optional(v.string()),
    amount: v.number(),
    adjustmentTypeId: v.optional(v.number()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("adjustments")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsAdjustmentId", args.pmsAdjustmentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        pmsProviderId: args.pmsProviderId,
        amount: args.amount,
        adjustmentTypeId: args.adjustmentTypeId,
        description: args.description,
        date: args.date,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("adjustments", {
      orgId: args.orgId,
      pmsAdjustmentId: args.pmsAdjustmentId,
      pmsPatientId: args.pmsPatientId,
      pmsProviderId: args.pmsProviderId,
      amount: args.amount,
      adjustmentTypeId: args.adjustmentTypeId,
      description: args.description,
      date: args.date,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a guarantor balance synced from NexHealth / PMS.
 */
export const upsertSyncedGuarantorBalance = internalMutation({
  args: {
    orgId: v.string(),
    pmsGuarantorBalanceId: v.string(),
    pmsPatientId: v.optional(v.string()),
    balance: v.number(),
    lastPaymentDate: v.optional(v.string()),
    lastPaymentAmount: v.optional(v.number()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("guarantorBalances")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsGuarantorBalanceId", args.pmsGuarantorBalanceId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        balance: args.balance,
        lastPaymentDate: args.lastPaymentDate,
        lastPaymentAmount: args.lastPaymentAmount,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("guarantorBalances", {
      orgId: args.orgId,
      pmsGuarantorBalanceId: args.pmsGuarantorBalanceId,
      pmsPatientId: args.pmsPatientId,
      balance: args.balance,
      lastPaymentDate: args.lastPaymentDate,
      lastPaymentAmount: args.lastPaymentAmount,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert an insurance balance synced from NexHealth / PMS.
 */
export const upsertSyncedInsuranceBalance = internalMutation({
  args: {
    orgId: v.string(),
    pmsInsuranceBalanceId: v.string(),
    pmsPatientId: v.optional(v.string()),
    insurancePlanId: v.optional(v.number()),
    balance: v.number(),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("insuranceBalances")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsInsuranceBalanceId", args.pmsInsuranceBalanceId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        insurancePlanId: args.insurancePlanId,
        balance: args.balance,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("insuranceBalances", {
      orgId: args.orgId,
      pmsInsuranceBalanceId: args.pmsInsuranceBalanceId,
      pmsPatientId: args.pmsPatientId,
      insurancePlanId: args.insurancePlanId,
      balance: args.balance,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a treatment plan synced from NexHealth / PMS.
 */
export const upsertSyncedTreatmentPlan = internalMutation({
  args: {
    orgId: v.string(),
    pmsTreatmentPlanId: v.string(),
    pmsPatientId: v.optional(v.string()),
    pmsProviderId: v.optional(v.string()),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    totalFee: v.optional(v.number()),
    procedures: v.optional(
      v.array(
        v.object({
          code: v.string(),
          description: v.optional(v.string()),
          fee: v.optional(v.number()),
          tooth: v.optional(v.string()),
          surface: v.optional(v.string()),
          status: v.optional(v.string()),
        })
      )
    ),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("treatmentPlans")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsTreatmentPlanId", args.pmsTreatmentPlanId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        pmsProviderId: args.pmsProviderId,
        name: args.name,
        status: args.status,
        totalFee: args.totalFee,
        procedures: args.procedures,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("treatmentPlans", {
      orgId: args.orgId,
      pmsTreatmentPlanId: args.pmsTreatmentPlanId,
      pmsPatientId: args.pmsPatientId,
      pmsProviderId: args.pmsProviderId,
      name: args.name,
      status: args.status,
      totalFee: args.totalFee,
      procedures: args.procedures,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a PMS claim synced from NexHealth / PMS.
 * Distinct from Oscar's scrubbing `claims` table.
 */
export const upsertSyncedPmsClaim = internalMutation({
  args: {
    orgId: v.string(),
    pmsClaimId: v.string(),
    pmsPatientId: v.optional(v.string()),
    insurancePlanId: v.optional(v.number()),
    totalAmount: v.number(),
    paidAmount: v.optional(v.number()),
    status: v.optional(v.string()),
    submittedDate: v.optional(v.string()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("pmsClaims")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsClaimId", args.pmsClaimId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsPatientId: args.pmsPatientId,
        insurancePlanId: args.insurancePlanId,
        totalAmount: args.totalAmount,
        paidAmount: args.paidAmount,
        status: args.status,
        submittedDate: args.submittedDate,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("pmsClaims", {
      orgId: args.orgId,
      pmsClaimId: args.pmsClaimId,
      pmsPatientId: args.pmsPatientId,
      insurancePlanId: args.insurancePlanId,
      totalAmount: args.totalAmount,
      paidAmount: args.paidAmount,
      status: args.status,
      submittedDate: args.submittedDate,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert a working hour record synced from NexHealth / PMS.
 */
export const upsertSyncedWorkingHour = internalMutation({
  args: {
    orgId: v.string(),
    pmsWorkingHourId: v.string(),
    pmsProviderId: v.optional(v.string()),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    locationId: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("workingHours")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsWorkingHourId", args.pmsWorkingHourId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pmsProviderId: args.pmsProviderId,
        dayOfWeek: args.dayOfWeek,
        startTime: args.startTime,
        endTime: args.endTime,
        locationId: args.locationId,
        isActive: args.isActive,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("workingHours", {
      orgId: args.orgId,
      pmsWorkingHourId: args.pmsWorkingHourId,
      pmsProviderId: args.pmsProviderId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      locationId: args.locationId,
      isActive: args.isActive,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Upsert an insurance plan synced from NexHealth / PMS.
 */
export const upsertSyncedInsurancePlan = internalMutation({
  args: {
    orgId: v.string(),
    pmsInsurancePlanId: v.string(),
    name: v.string(),
    payerName: v.optional(v.string()),
    payerId: v.optional(v.string()),
    groupNumber: v.optional(v.string()),
    employerName: v.optional(v.string()),
    foreignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("insurancePlans")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsInsurancePlanId", args.pmsInsurancePlanId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        payerName: args.payerName,
        payerId: args.payerId,
        groupNumber: args.groupNumber,
        employerName: args.employerName,
        foreignId: args.foreignId,
        lastSyncedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("insurancePlans", {
      orgId: args.orgId,
      pmsInsurancePlanId: args.pmsInsurancePlanId,
      name: args.name,
      payerName: args.payerName,
      payerId: args.payerId,
      groupNumber: args.groupNumber,
      employerName: args.employerName,
      foreignId: args.foreignId,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

// ---------------------------------------------------------------------------
// Webhook Event — Payment + Charge Record Mutations
// These store webhook-delivered payment/charge data for reconciliation.
// ---------------------------------------------------------------------------

/**
 * Record a payment received via webhook.
 * Logs the payment for ERA matching and reconciliation.
 */
export const _recordWebhookPayment = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsPaymentId: v.string(),
    pmsPatientId: v.string(),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    date: v.optional(v.string()),
    note: v.optional(v.string()),
    claimId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Upsert into pmsPayments table for reconciliation and ERA matching
    const existingPayment = await ctx.db
      .query("pmsPayments")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsPaymentId", args.pmsPaymentId)
      )
      .first();

    if (existingPayment) {
      await ctx.db.patch(existingPayment._id, {
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        paymentMethod: args.paymentMethod,
        date: args.date,
        note: args.note,
        pmsClaimId: args.claimId,
        lastSyncedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("pmsPayments", {
        orgId: args.orgId,
        pmsPaymentId: args.pmsPaymentId,
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        paymentMethod: args.paymentMethod,
        date: args.date,
        note: args.note,
        pmsClaimId: args.claimId,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log payment event for audit trail
    await createAuditLog(ctx, {
      action: "nexhealth.webhook.payment",
      resourceType: "payment",
      phiAccessed: false,
      details: {
        pmsPaymentId: args.pmsPaymentId,
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        date: args.date,
      },
    });

    return { recorded: true, pmsPaymentId: args.pmsPaymentId, timestamp: now };
  },
});

/**
 * Record a charge received via webhook.
 * Logs the charge for production tracking and A/R.
 */
export const _recordWebhookCharge = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    pmsChargeId: v.string(),
    pmsPatientId: v.string(),
    amount: v.number(),
    procedureCode: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    status: v.optional(v.string()),
    claimId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Upsert into charges table for production tracking and A/R
    const existingCharge = await ctx.db
      .query("charges")
      .withIndex("by_pms_id", (q) =>
        q.eq("orgId", args.orgId).eq("pmsChargeId", args.pmsChargeId)
      )
      .first();

    if (existingCharge) {
      await ctx.db.patch(existingCharge._id, {
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        procedureCode: args.procedureCode,
        description: args.description,
        date: args.date,
        status: args.status,
        pmsClaimId: args.claimId,
        lastSyncedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("charges", {
        orgId: args.orgId,
        pmsChargeId: args.pmsChargeId,
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        procedureCode: args.procedureCode,
        description: args.description,
        date: args.date,
        status: args.status,
        pmsClaimId: args.claimId,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log charge event for audit trail
    await createAuditLog(ctx, {
      action: "nexhealth.webhook.charge",
      resourceType: "charge",
      phiAccessed: false,
      details: {
        pmsChargeId: args.pmsChargeId,
        pmsPatientId: args.pmsPatientId,
        amount: args.amount,
        procedureCode: args.procedureCode,
        date: args.date,
      },
    });

    return { recorded: true, pmsChargeId: args.pmsChargeId, timestamp: now };
  },
});

// ---------------------------------------------------------------------------
// NexHealth Pull Sync — Internal Sync Job Helpers
// Thin wrappers around sync job mutations that accept orgId as an explicit arg
// instead of extracting it from auth context (actions can't provide auth context).
// ---------------------------------------------------------------------------

/**
 * Create a sync job from an internal action (no auth context required).
 * Inserts a new syncJobs record with "pending" status.
 */
export const _createSyncJobInternal = internalMutation({
  args: {
    orgId: v.string(),
    practiceId: v.id("practices"),
    jobType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = await ctx.db.insert("syncJobs", {
      orgId: args.orgId,
      practiceId: args.practiceId,
      jobType: args.jobType as any,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return jobId;
  },
});

/**
 * Complete a sync job from an internal action (no auth context required).
 * Patches the syncJob with final status, timestamps, and optional stats.
 */
export const _completeSyncJobInternal = internalMutation({
  args: {
    jobId: v.id("syncJobs"),
    status: v.string(),
    recordsProcessed: v.optional(v.number()),
    recordsFailed: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status as any,
      completedAt: now,
      updatedAt: now,
    };

    if (args.recordsProcessed !== undefined) {
      updates.recordsProcessed = args.recordsProcessed;
    }
    if (args.recordsFailed !== undefined) {
      updates.recordsFailed = args.recordsFailed;
    }
    if (args.errors !== undefined) {
      updates.errors = args.errors;
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

// ---------------------------------------------------------------------------
// Webhook Event Tracking
// ---------------------------------------------------------------------------

/**
 * Record a received webhook event for audit/debugging.
 */
export const _recordWebhookEvent = internalMutation({
  args: {
    orgId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("webhookEvents", {
      orgId: args.orgId,
      eventId: args.eventId,
      eventType: args.eventType,
      payload: args.payload,
      status: "pending",
      receivedAt: now,
    });
  },
});

/**
 * Mark a webhook event as successfully processed.
 */
export const _markWebhookProcessed = internalMutation({
  args: { eventDocId: v.id("webhookEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventDocId, {
      status: "processed",
      processedAt: Date.now(),
    });
  },
});

/**
 * Mark a webhook event as failed with error details.
 */
export const _markWebhookFailed = internalMutation({
  args: {
    eventDocId: v.id("webhookEvents"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventDocId, {
      status: "failed",
      error: args.error,
      processedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// HITL Fallback — Task Creation for Operations NexHealth Doesn't Support
// ---------------------------------------------------------------------------

/**
 * Create a HITL fallback task when an operation can't be automated via NexHealth.
 * Used when NexHealth doesn't expose an endpoint for a specific operation,
 * or when NexHealth config is not available for a practice.
 */
export const _createHitlTask = internalMutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    description: v.string(),
    resourceType: v.union(
      v.literal("appointment"),
      v.literal("patient"),
      v.literal("claim"),
      v.literal("general")
    ),
    resourceId: v.optional(v.string()),
    assignedRole: v.union(
      v.literal("front_desk"),
      v.literal("billing"),
      v.literal("clinical"),
      v.literal("office_manager"),
      v.literal("admin")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    workPacket: v.string(), // JSON with actionable details
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

    // Dedupe key prevents duplicate tasks for the same resource
    const dedupeKey = args.resourceId
      ? `hitl:${args.resourceType}:${args.resourceId}`
      : undefined;

    // Check for existing open task with same dedupe key
    if (dedupeKey) {
      const existing = await ctx.db
        .query("tasks")
        .withIndex("by_dedupe", (q) =>
          q.eq("orgId", args.orgId).eq("dedupeKey", dedupeKey)
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "open"),
            q.eq(q.field("status"), "in_progress")
          )
        )
        .first();

      if (existing) {
        // Update existing task instead of creating duplicate
        await ctx.db.patch(existing._id, {
          description: args.description,
          workPacket: args.workPacket,
          updatedAt: now,
        });
        return existing._id;
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      orgId: args.orgId,
      title: args.title,
      description: args.description,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      assignedRole: args.assignedRole,
      priority: args.priority,
      status: "open",
      slaDeadline: now + FOUR_HOURS_MS,
      slaStatus: "on_track",
      isHitlFallback: true,
      workPacket: args.workPacket,
      dedupeKey,
      createdAt: now,
      updatedAt: now,
    });

    return taskId;
  },
});

// ---------------------------------------------------------------------------
// Push Sync — Patch mutations for storing PMS IDs after push to NexHealth
// ---------------------------------------------------------------------------

/**
 * Patch an appointment with its NexHealth PMS ID after push sync.
 */
export const _patchAppointmentPmsId = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    pmsAppointmentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      pmsAppointmentId: args.pmsAppointmentId,
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Patch a patient with its NexHealth PMS ID after push sync.
 */
export const _patchPatientPmsId = internalMutation({
  args: {
    patientId: v.id("patients"),
    pmsPatientId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.patientId, {
      pmsPatientId: args.pmsPatientId,
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Patch an appointment type with its NexHealth PMS ID after push sync.
 */
export const _patchAppointmentTypePmsId = internalMutation({
  args: {
    appointmentTypeId: v.id("appointmentTypes"),
    pmsAppointmentTypeId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentTypeId, {
      pmsAppointmentTypeId: args.pmsAppointmentTypeId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Patch a working hour with its NexHealth PMS ID after push sync.
 */
export const _patchWorkingHourPmsId = internalMutation({
  args: {
    workingHourId: v.id("workingHours"),
    pmsWorkingHourId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workingHourId, {
      pmsWorkingHourId: args.pmsWorkingHourId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Patch a patient alert with its NexHealth PMS ID after push sync.
 */
export const _patchPatientAlertPmsId = internalMutation({
  args: {
    alertId: v.id("patientAlerts"),
    pmsAlertId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      pmsAlertId: args.pmsAlertId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Patch a patient document with its NexHealth PMS ID after push sync.
 */
export const _patchPatientDocumentPmsId = internalMutation({
  args: {
    documentId: v.id("patientDocuments"),
    pmsDocumentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      pmsDocumentId: args.pmsDocumentId,
      updatedAt: Date.now(),
    });
  },
});
