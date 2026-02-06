import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// Oscar Dental Platform — Full Convex Schema
// Every tenant-scoped table has orgId field + by_org index
// ============================================================================

export default defineSchema({
  // --------------------------------------------------------------------------
  // PRACTICES & SETTINGS
  // --------------------------------------------------------------------------
  practices: defineTable({
    orgId: v.string(),
    name: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    phone: v.string(),
    email: v.string(),
    npi: v.optional(v.string()),
    taxId: v.optional(v.string()),
    timezone: v.string(),
    businessHours: v.optional(
      v.array(
        v.object({
          day: v.string(),
          open: v.string(),
          close: v.string(),
          closed: v.boolean(),
        })
      )
    ),
    pmsType: v.optional(
      v.union(
        v.literal("opendental"),
        v.literal("eaglesoft"),
        v.literal("dentrix")
      )
    ),
    pmsConnectionStatus: v.optional(
      v.union(
        v.literal("connected"),
        v.literal("disconnected"),
        v.literal("error")
      )
    ),
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"]),

  practiceSettings: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    // Reputation settings
    reviewRequestDelay: v.optional(v.number()), // hours (1-24)
    reviewMinSatisfactionScore: v.optional(v.number()),
    // Scheduling settings
    defaultAppointmentDuration: v.optional(v.number()), // minutes
    scheduleStartTime: v.optional(v.string()),
    scheduleEndTime: v.optional(v.string()),
    // Collections settings
    collectionsThresholds: v.optional(
      v.object({
        day0: v.number(),
        day7: v.number(),
        day14: v.number(),
        day30: v.number(),
        day60: v.number(),
        day90: v.number(),
      })
    ),
    // TCPA compliance
    smsOptOutKeywords: v.optional(v.array(v.string())),
    // General
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice", ["practiceId"]),

  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  users: defineTable({
    orgId: v.string(),
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("office_manager"),
      v.literal("billing"),
      v.literal("clinical"),
      v.literal("front_desk"),
      v.literal("provider")
    ),
    practiceId: v.optional(v.id("practices")),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_clerk_id", ["clerkUserId"])
    .index("by_email", ["orgId", "email"]),

  // --------------------------------------------------------------------------
  // PROVIDERS & OPERATORIES
  // --------------------------------------------------------------------------
  providers: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
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
    color: v.optional(v.string()), // for calendar display
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice", ["orgId", "practiceId"]),

  operatories: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    name: v.string(),
    shortName: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice", ["orgId", "practiceId"]),

  appointmentTypes: defineTable({
    orgId: v.string(),
    name: v.string(),
    code: v.optional(v.string()), // CDT code
    duration: v.number(), // minutes
    color: v.optional(v.string()),
    category: v.union(
      v.literal("hygiene"),
      v.literal("restorative"),
      v.literal("surgical"),
      v.literal("diagnostic"),
      v.literal("preventive"),
      v.literal("endodontic"),
      v.literal("prosthodontic"),
      v.literal("orthodontic"),
      v.literal("emergency"),
      v.literal("other")
    ),
    productionValue: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"]),

  // --------------------------------------------------------------------------
  // PATIENTS
  // --------------------------------------------------------------------------
  patients: defineTable({
    orgId: v.string(),
    oscarPatientId: v.string(), // MPI ID
    pmsPatientId: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(), // ISO date
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
    // Insurance
    primaryInsurance: v.optional(
      v.object({
        payerId: v.string(),
        payerName: v.string(),
        memberId: v.string(),
        groupNumber: v.optional(v.string()),
        subscriberName: v.optional(v.string()),
        subscriberDob: v.optional(v.string()),
        relationship: v.optional(v.string()),
      })
    ),
    secondaryInsurance: v.optional(
      v.object({
        payerId: v.string(),
        payerName: v.string(),
        memberId: v.string(),
        groupNumber: v.optional(v.string()),
        subscriberName: v.optional(v.string()),
        subscriberDob: v.optional(v.string()),
        relationship: v.optional(v.string()),
      })
    ),
    // Balances
    patientBalance: v.optional(v.number()),
    insuranceBalance: v.optional(v.number()),
    // Communication preferences
    smsConsent: v.optional(v.boolean()),
    smsConsentTimestamp: v.optional(v.number()),
    smsConsentSource: v.optional(v.string()),
    smsOptOutTypes: v.optional(v.array(v.string())),
    emailConsent: v.optional(v.boolean()),
    preferredContactMethod: v.optional(
      v.union(v.literal("sms"), v.literal("email"), v.literal("phone"))
    ),
    // Recall
    lastVisitDate: v.optional(v.string()),
    recallInterval: v.optional(v.number()), // months (3/4/6)
    nextRecallDate: v.optional(v.string()),
    // Status
    isActive: v.boolean(),
    matchStatus: v.optional(
      v.union(
        v.literal("matched"),
        v.literal("pending"),
        v.literal("ambiguous")
      )
    ),
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_oscar_id", ["orgId", "oscarPatientId"])
    .index("by_pms_id", ["orgId", "pmsPatientId"])
    .index("by_name", ["orgId", "lastName", "firstName"])
    .searchIndex("search_patients", {
      searchField: "lastName",
      filterFields: ["orgId"],
    }),

  patientMatchQueue: defineTable({
    orgId: v.string(),
    oscarPatientId: v.string(),
    pmsPatientId: v.string(),
    matchScore: v.number(), // 0-1
    matchFields: v.array(v.string()), // which fields matched
    status: v.union(
      v.literal("pending"),
      v.literal("matched"),
      v.literal("rejected"),
      v.literal("merged")
    ),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["orgId", "status"]),

  // --------------------------------------------------------------------------
  // SCHEDULING
  // --------------------------------------------------------------------------
  appointments: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    patientId: v.id("patients"),
    providerId: v.id("providers"),
    operatoryId: v.optional(v.id("operatories")),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    date: v.string(), // ISO date
    startTime: v.string(), // HH:mm
    endTime: v.string(), // HH:mm
    duration: v.number(), // minutes
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    productionAmount: v.optional(v.number()),
    procedures: v.optional(
      v.array(
        v.object({
          code: v.string(),
          description: v.string(),
          fee: v.number(),
          tooth: v.optional(v.string()),
          surface: v.optional(v.string()),
        })
      )
    ),
    notes: v.optional(v.string()),
    pmsAppointmentId: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
    checkedInAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_date", ["orgId", "date"])
    .index("by_provider_date", ["orgId", "providerId", "date"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_practice_date", ["orgId", "practiceId", "date"])
    .index("by_status", ["orgId", "status"]),

  quickFillQueue: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    preferredDays: v.optional(v.array(v.string())),
    preferredTimes: v.optional(v.array(v.string())),
    urgency: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    productionValue: v.optional(v.number()),
    reason: v.optional(v.string()),
    addedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("active"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("removed")
    ),
    lastContactedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["orgId", "status"]),

  productionGoals: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    date: v.string(), // ISO date
    dailyGoal: v.number(),
    monthlyGoal: v.number(),
    actualDaily: v.optional(v.number()),
    actualMonthly: v.optional(v.number()),
    providers: v.optional(
      v.array(
        v.object({
          providerId: v.id("providers"),
          goal: v.number(),
          actual: v.optional(v.number()),
        })
      )
    ),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_date", ["orgId", "practiceId", "date"]),

  perfectDayTemplates: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    dayOfWeek: v.number(), // 0-6
    name: v.string(),
    slots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
        category: v.string(),
        productionTarget: v.optional(v.number()),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice_day", ["orgId", "practiceId", "dayOfWeek"]),

  recallDueList: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    dueDate: v.string(),
    recallType: v.union(
      v.literal("hygiene"),
      v.literal("periodic_exam"),
      v.literal("perio_maintenance")
    ),
    intervalMonths: v.number(),
    outreachStatus: v.union(
      v.literal("pending"),
      v.literal("sms_sent"),
      v.literal("email_sent"),
      v.literal("called"),
      v.literal("scheduled"),
      v.literal("refused")
    ),
    outreachAttempts: v.number(),
    lastOutreachAt: v.optional(v.number()),
    scheduledAppointmentId: v.optional(v.id("appointments")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["orgId", "outreachStatus"])
    .index("by_due_date", ["orgId", "dueDate"]),

  // --------------------------------------------------------------------------
  // RCM — ELIGIBILITY & CLAIMS
  // --------------------------------------------------------------------------
  eligibilityResults: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    payerId: v.string(),
    payerName: v.string(),
    verifiedAt: v.number(),
    expiresAt: v.number(), // 24-hour cache
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("error"),
      v.literal("pending")
    ),
    benefits: v.optional(
      v.object({
        annualMaximum: v.optional(v.number()),
        annualUsed: v.optional(v.number()),
        annualRemaining: v.optional(v.number()),
        deductible: v.optional(v.number()),
        deductibleMet: v.optional(v.number()),
        preventiveCoverage: v.optional(v.number()),
        basicCoverage: v.optional(v.number()),
        majorCoverage: v.optional(v.number()),
        waitingPeriods: v.optional(v.array(v.string())),
      })
    ),
    costEstimate: v.optional(v.number()),
    rawResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    verifiedBy: v.optional(v.string()), // "batch" | "realtime" | userId
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_appointment", ["orgId", "appointmentId"])
    .index("by_expiry", ["orgId", "expiresAt"]),

  claims: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    claimNumber: v.optional(v.string()),
    pmsClaimId: v.optional(v.string()),
    payerId: v.string(),
    payerName: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("scrubbing"),
      v.literal("scrub_failed"),
      v.literal("ready"),
      v.literal("submitted"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("paid"),
      v.literal("denied"),
      v.literal("appealed")
    ),
    procedures: v.array(
      v.object({
        code: v.string(),
        description: v.string(),
        fee: v.number(),
        tooth: v.optional(v.string()),
        surface: v.optional(v.string()),
        quantity: v.optional(v.number()),
      })
    ),
    totalCharged: v.number(),
    totalPaid: v.optional(v.number()),
    patientPortion: v.optional(v.number()),
    adjustments: v.optional(v.number()),
    // Scrub results
    scrubErrors: v.optional(
      v.array(
        v.object({
          code: v.string(),
          message: v.string(),
          severity: v.union(
            v.literal("error"),
            v.literal("warning"),
            v.literal("info")
          ),
          field: v.optional(v.string()),
        })
      )
    ),
    scrubPassedAt: v.optional(v.number()),
    // Submission tracking
    submittedAt: v.optional(v.number()),
    submittedBy: v.optional(v.id("users")),
    acceptedAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    // Aging
    ageInDays: v.optional(v.number()),
    ageBucket: v.optional(
      v.union(
        v.literal("0-30"),
        v.literal("31-60"),
        v.literal("61-90"),
        v.literal("91-120"),
        v.literal("120+")
      )
    ),
    // Pre-determination
    isPreDetermination: v.optional(v.boolean()),
    preDetStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("denied"),
        v.literal("partial")
      )
    ),
    preDetResponseAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_status", ["orgId", "status"])
    .index("by_payer", ["orgId", "payerId"])
    .index("by_age_bucket", ["orgId", "ageBucket"])
    .index("by_practice_status", ["orgId", "practiceId", "status"]),

  feeSchedules: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    payerId: v.optional(v.string()),
    payerName: v.optional(v.string()),
    name: v.string(),
    fees: v.array(
      v.object({
        code: v.string(),
        description: v.string(),
        fee: v.number(),
        effectiveDate: v.optional(v.string()),
      })
    ),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice", ["orgId", "practiceId"]),

  payerRules: defineTable({
    orgId: v.string(),
    payerId: v.string(),
    payerName: v.string(),
    rules: v.array(
      v.object({
        ruleType: v.union(
          v.literal("procedure_combo"),
          v.literal("attachment_required"),
          v.literal("frequency_limit"),
          v.literal("age_limit"),
          v.literal("pre_auth_required"),
          v.literal("missing_data")
        ),
        description: v.string(),
        procedureCodes: v.optional(v.array(v.string())),
        condition: v.optional(v.string()),
        action: v.string(),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_payer", ["orgId", "payerId"]),

  // --------------------------------------------------------------------------
  // RCM — DENIALS & APPEALS
  // --------------------------------------------------------------------------
  denials: defineTable({
    orgId: v.string(),
    claimId: v.id("claims"),
    patientId: v.id("patients"),
    payerId: v.string(),
    payerName: v.string(),
    denialDate: v.string(),
    reasonCode: v.string(),
    reasonDescription: v.string(),
    category: v.optional(
      v.union(
        v.literal("eligibility"),
        v.literal("coding"),
        v.literal("documentation"),
        v.literal("authorization"),
        v.literal("timely_filing"),
        v.literal("duplicate"),
        v.literal("other")
      )
    ),
    amount: v.number(),
    status: v.union(
      v.literal("new"),
      v.literal("acknowledged"),
      v.literal("appealing"),
      v.literal("appealed"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("partial"),
      v.literal("written_off")
    ),
    aiCategorization: v.optional(v.string()),
    aiConfidence: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),
    slaDeadline: v.optional(v.number()), // 24hr from creation
    isEscalated: v.optional(v.boolean()),
    escalatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_claim", ["orgId", "claimId"])
    .index("by_status", ["orgId", "status"])
    .index("by_category", ["orgId", "category"]),

  appeals: defineTable({
    orgId: v.string(),
    denialId: v.id("denials"),
    claimId: v.id("claims"),
    patientId: v.id("patients"),
    status: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("submitted"),
      v.literal("won"),
      v.literal("lost"),
      v.literal("partial")
    ),
    letterContent: v.optional(v.string()),
    aiGeneratedAt: v.optional(v.number()),
    aiGenerationTimeMs: v.optional(v.number()),
    editedBy: v.optional(v.id("users")),
    editedAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    submittedBy: v.optional(v.id("users")),
    outcomeAmount: v.optional(v.number()),
    outcomeDate: v.optional(v.string()),
    outcomeNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_denial", ["orgId", "denialId"])
    .index("by_status", ["orgId", "status"]),

  // --------------------------------------------------------------------------
  // PAYMENTS
  // --------------------------------------------------------------------------
  payments: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    claimId: v.optional(v.id("claims")),
    paymentPlanId: v.optional(v.id("paymentPlans")),
    amount: v.number(),
    type: v.union(
      v.literal("insurance"),
      v.literal("patient"),
      v.literal("text_to_pay"),
      v.literal("card_on_file"),
      v.literal("payment_plan"),
      v.literal("refund")
    ),
    method: v.optional(
      v.union(
        v.literal("card"),
        v.literal("check"),
        v.literal("cash"),
        v.literal("ach"),
        v.literal("insurance")
      )
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    stripePaymentLinkUrl: v.optional(v.string()),
    smsDeliveredAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    failedReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_claim", ["orgId", "claimId"])
    .index("by_status", ["orgId", "status"])
    .index("by_type", ["orgId", "type"]),

  paymentPlans: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    totalAmount: v.number(),
    remainingAmount: v.number(),
    installmentAmount: v.number(),
    cadence: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly")
    ),
    installments: v.array(
      v.object({
        number: v.number(),
        amount: v.number(),
        dueDate: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("paid"),
          v.literal("failed"),
          v.literal("skipped")
        ),
        paidAt: v.optional(v.number()),
        paymentId: v.optional(v.id("payments")),
      })
    ),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("defaulted"),
      v.literal("cancelled")
    ),
    nextChargeDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_status", ["orgId", "status"]),

  collectionSequences: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    totalBalance: v.number(),
    currentStep: v.number(), // 0, 7, 14, 30, 60, 90
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("paid")
    ),
    steps: v.array(
      v.object({
        day: v.number(),
        action: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("sent"),
          v.literal("completed"),
          v.literal("skipped")
        ),
        sentAt: v.optional(v.number()),
        response: v.optional(v.string()),
      })
    ),
    startedAt: v.number(),
    lastActionAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_status", ["orgId", "status"]),

  cardOnFileConsents: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    stripeCustomerId: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    consentedAt: v.number(),
    consentSource: v.string(),
    maxChargeAmount: v.optional(v.number()),
    isActive: v.boolean(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"]),

  eraRecords: defineTable({
    orgId: v.string(),
    eraId: v.string(),
    payerId: v.string(),
    payerName: v.string(),
    checkNumber: v.optional(v.string()),
    checkDate: v.optional(v.string()),
    totalPaid: v.number(),
    claimPayments: v.array(
      v.object({
        claimNumber: v.string(),
        patientName: v.optional(v.string()),
        amountPaid: v.number(),
        adjustments: v.optional(v.number()),
        matchedClaimId: v.optional(v.id("claims")),
        matchStatus: v.union(
          v.literal("matched"),
          v.literal("unmatched"),
          v.literal("exception")
        ),
      })
    ),
    matchRate: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_era_id", ["orgId", "eraId"]),

  // --------------------------------------------------------------------------
  // REPUTATION
  // --------------------------------------------------------------------------
  reviews: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    source: v.union(
      v.literal("google"),
      v.literal("yelp"),
      v.literal("healthgrades"),
      v.literal("internal")
    ),
    externalReviewId: v.optional(v.string()),
    reviewerName: v.optional(v.string()),
    matchedPatientId: v.optional(v.id("patients")),
    rating: v.number(), // 1-5
    text: v.optional(v.string()),
    publishedAt: v.number(),
    sentiment: v.optional(
      v.union(
        v.literal("positive"),
        v.literal("neutral"),
        v.literal("negative")
      )
    ),
    sentimentKeywords: v.optional(v.array(v.string())),
    responseStatus: v.union(
      v.literal("pending"),
      v.literal("draft_ready"),
      v.literal("approved"),
      v.literal("posted"),
      v.literal("skipped")
    ),
    isPriority: v.optional(v.boolean()), // 1-2 stars
    alertSentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice", ["orgId", "practiceId"])
    .index("by_rating", ["orgId", "rating"])
    .index("by_response_status", ["orgId", "responseStatus"]),

  reviewRequests: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    triggerEvent: v.string(), // e.g., "checkout"
    scheduledFor: v.number(), // send after delay
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("clicked"),
      v.literal("completed"),
      v.literal("skipped"),
      v.literal("filtered")
    ),
    filterReason: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    sentVia: v.optional(v.union(v.literal("sms"), v.literal("email"))),
    aiSatisfactionScore: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_status", ["orgId", "status"]),

  reviewResponses: defineTable({
    orgId: v.string(),
    reviewId: v.id("reviews"),
    draftContent: v.string(),
    aiGeneratedAt: v.optional(v.number()),
    aiGenerationTimeMs: v.optional(v.number()),
    phiCheckPassed: v.optional(v.boolean()),
    editedContent: v.optional(v.string()),
    editedBy: v.optional(v.id("users")),
    editedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    postedAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("edited"),
      v.literal("approved"),
      v.literal("posted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_review", ["orgId", "reviewId"]),

  // --------------------------------------------------------------------------
  // TASKS (HITL)
  // --------------------------------------------------------------------------
  tasks: defineTable({
    orgId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    // Resource linkage
    resourceType: v.optional(
      v.union(
        v.literal("claim"),
        v.literal("denial"),
        v.literal("review"),
        v.literal("payment"),
        v.literal("patient"),
        v.literal("appointment"),
        v.literal("collection"),
        v.literal("recall"),
        v.literal("eligibility"),
        v.literal("general")
      )
    ),
    resourceId: v.optional(v.string()),
    // Routing
    assignedRole: v.optional(
      v.union(
        v.literal("front_desk"),
        v.literal("billing"),
        v.literal("clinical"),
        v.literal("office_manager"),
        v.literal("admin")
      )
    ),
    assignedTo: v.optional(v.id("users")),
    // Status
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    // SLA
    slaDeadline: v.optional(v.number()),
    slaStatus: v.optional(
      v.union(
        v.literal("on_track"),
        v.literal("at_risk"),
        v.literal("overdue")
      )
    ),
    isEscalated: v.optional(v.boolean()),
    escalatedAt: v.optional(v.number()),
    // Dedup
    dedupeKey: v.optional(v.string()),
    // HITL metadata
    isHitlFallback: v.optional(v.boolean()),
    workPacket: v.optional(v.string()), // JSON with what to do, where, proof
    // Tracking
    completedBy: v.optional(v.id("users")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["orgId", "status"])
    .index("by_assigned_role", ["orgId", "assignedRole", "status"])
    .index("by_assigned_to", ["orgId", "assignedTo", "status"])
    .index("by_resource", ["orgId", "resourceType", "resourceId"])
    .index("by_sla_status", ["orgId", "slaStatus"])
    .index("by_dedupe", ["orgId", "dedupeKey"]),

  // --------------------------------------------------------------------------
  // COMMUNICATION
  // --------------------------------------------------------------------------
  communicationConsents: defineTable({
    orgId: v.string(),
    patientId: v.id("patients"),
    channel: v.union(v.literal("sms"), v.literal("email"), v.literal("phone")),
    messageType: v.union(
      v.literal("forms"),
      v.literal("reminders"),
      v.literal("scheduling"),
      v.literal("billing"),
      v.literal("marketing"),
      v.literal("all")
    ),
    consented: v.boolean(),
    consentTimestamp: v.number(),
    consentSource: v.string(), // "patient_portal", "sms_reply", "front_desk"
    revokedAt: v.optional(v.number()),
    revokeSource: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_patient", ["orgId", "patientId"])
    .index("by_patient_channel", ["orgId", "patientId", "channel"]),

  notifications: defineTable({
    orgId: v.string(),
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("success"),
      v.literal("action_required")
    ),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["orgId", "userId"])
    .index("by_user_unread", ["orgId", "userId", "isRead"]),

  // --------------------------------------------------------------------------
  // AI ACTIONS
  // --------------------------------------------------------------------------
  aiActions: defineTable({
    orgId: v.string(),
    actionType: v.union(
      v.literal("denial_categorization"),
      v.literal("appeal_letter"),
      v.literal("review_response"),
      v.literal("satisfaction_prediction"),
      v.literal("patient_suggest"),
      v.literal("cost_estimate"),
      v.literal("payer_alert"),
      v.literal("ar_prioritization")
    ),
    resourceType: v.string(),
    resourceId: v.string(),
    input: v.optional(v.string()),
    output: v.optional(v.string()),
    confidence: v.optional(v.number()),
    explanation: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("error")
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    executionTimeMs: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["orgId", "status"])
    .index("by_type", ["orgId", "actionType"])
    .index("by_resource", ["orgId", "resourceType", "resourceId"]),

  // --------------------------------------------------------------------------
  // AUDIT LOGGING
  // --------------------------------------------------------------------------
  auditLogs: defineTable({
    orgId: v.string(),
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()), // JSON string
    phiAccessed: v.boolean(),
    ipAddress: v.optional(v.string()),
    previousHash: v.optional(v.string()),
    entryHash: v.string(),
    timestamp: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_time", ["orgId", "timestamp"])
    .index("by_user", ["orgId", "userId"])
    .index("by_resource", ["orgId", "resourceType", "resourceId"])
    .index("by_action", ["orgId", "action"]),

  // --------------------------------------------------------------------------
  // HEALTH & SYNC
  // --------------------------------------------------------------------------
  healthChecks: defineTable({
    orgId: v.optional(v.string()),
    checkType: v.union(
      v.literal("system"),
      v.literal("practice"),
      v.literal("integration")
    ),
    target: v.string(), // e.g., "pms", "clearinghouse", "stripe"
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down")
    ),
    responseTimeMs: v.optional(v.number()),
    message: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON
    timestamp: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_target", ["orgId", "target"]),

  syncJobs: defineTable({
    orgId: v.string(),
    practiceId: v.id("practices"),
    jobType: v.union(
      v.literal("full_sync"),
      v.literal("incremental"),
      v.literal("patient_sync"),
      v.literal("appointment_sync"),
      v.literal("claim_sync")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    recordsProcessed: v.optional(v.number()),
    recordsFailed: v.optional(v.number()),
    errors: v.optional(v.array(v.string())),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_practice", ["orgId", "practiceId"])
    .index("by_status", ["orgId", "status"]),
});
