import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// seedV2 — Comprehensive seed for empty & thin Convex tables
// Part A: Tables 1-12 (settings, scheduling, PMS financial)
// Part B: Tables 13-24 + enrichments (added by second agent)
// ============================================================================

// Deterministic pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickFromList<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(rng: () => number, min: number, max: number): number {
  return Math.round((rng() * (max - min) + min) * 100) / 100;
}

// ============================================================================
// Reference data
// ============================================================================

const PAYERS = [
  { id: "DELTA", name: "Delta Dental" },
  { id: "CIGNA", name: "Cigna Dental" },
  { id: "METLIFE", name: "MetLife Dental" },
  { id: "AETNA", name: "Aetna Dental" },
  { id: "BCBS", name: "Blue Cross Blue Shield" },
  { id: "GUARDIAN", name: "Guardian Dental" },
  { id: "UNITED_CONCORDIA", name: "United Concordia" },
  { id: "HUMANA", name: "Humana Dental" },
];

const CDT_PROCEDURES = [
  { code: "D0120", desc: "Periodic oral evaluation", fee: 52, category: "diagnostic" },
  { code: "D0150", desc: "Comprehensive oral evaluation", fee: 89, category: "diagnostic" },
  { code: "D0210", desc: "Intraoral complete series", fee: 145, category: "diagnostic" },
  { code: "D0274", desc: "Bitewings - four radiographic images", fee: 68, category: "diagnostic" },
  { code: "D0330", desc: "Panoramic radiographic image", fee: 125, category: "diagnostic" },
  { code: "D1110", desc: "Prophylaxis - adult", fee: 105, category: "preventive" },
  { code: "D1120", desc: "Prophylaxis - child", fee: 75, category: "preventive" },
  { code: "D1206", desc: "Topical application of fluoride varnish", fee: 38, category: "preventive" },
  { code: "D1351", desc: "Sealant - per tooth", fee: 48, category: "preventive" },
  { code: "D2140", desc: "Amalgam - one surface, primary", fee: 175, category: "restorative" },
  { code: "D2150", desc: "Amalgam - two surfaces, primary", fee: 215, category: "restorative" },
  { code: "D2330", desc: "Resin composite - one surface, anterior", fee: 195, category: "restorative" },
  { code: "D2331", desc: "Resin composite - two surfaces, anterior", fee: 245, category: "restorative" },
  { code: "D2391", desc: "Resin composite - one surface, posterior", fee: 210, category: "restorative" },
  { code: "D2740", desc: "Crown - porcelain/ceramic substrate", fee: 1250, category: "restorative" },
  { code: "D2750", desc: "Crown - porcelain fused to high noble metal", fee: 1175, category: "restorative" },
  { code: "D2950", desc: "Core buildup, including any pins", fee: 295, category: "restorative" },
  { code: "D3310", desc: "Root canal - anterior tooth", fee: 780, category: "endodontic" },
  { code: "D3320", desc: "Root canal - premolar tooth", fee: 920, category: "endodontic" },
  { code: "D3330", desc: "Root canal - molar tooth", fee: 1150, category: "endodontic" },
  { code: "D4341", desc: "Periodontal scaling and root planing - per quadrant", fee: 275, category: "preventive" },
  { code: "D4342", desc: "Periodontal scaling - 1-3 teeth per quadrant", fee: 195, category: "preventive" },
  { code: "D4910", desc: "Periodontal maintenance", fee: 155, category: "preventive" },
  { code: "D5110", desc: "Complete denture - maxillary", fee: 1850, category: "prosthodontic" },
  { code: "D6010", desc: "Surgical placement - endosteal implant", fee: 2450, category: "surgical" },
  { code: "D6058", desc: "Abutment supported porcelain/ceramic crown", fee: 1375, category: "restorative" },
  { code: "D7140", desc: "Extraction, erupted tooth", fee: 195, category: "surgical" },
  { code: "D7210", desc: "Extraction, surgical", fee: 350, category: "surgical" },
  { code: "D7240", desc: "Extraction, impacted tooth - completely bony", fee: 475, category: "surgical" },
  { code: "D9110", desc: "Palliative treatment of dental pain", fee: 125, category: "emergency" },
  { code: "D9230", desc: "Inhalation of nitrous oxide", fee: 65, category: "emergency" },
];

const TEETH = [
  "1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16",
  "17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32",
];

const SURFACES = ["M", "O", "D", "B", "L", "MO", "DO", "MOD", "ML", "DL"];

// ============================================================================
// Main seed mutation
// ============================================================================

export const seedV2 = internalMutation({
  args: { orgId: v.string(), force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { orgId, force } = args;
    const rng = mulberry32(20260209); // different seed from V1 to avoid collisions
    const now = Date.now();
    const DAY = 86400000;
    const HOUR = 3600000;

    // -----------------------------------------------------------------------
    // Idempotency check
    // -----------------------------------------------------------------------
    const existingSettings = await ctx.db
      .query("practiceSettings")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();
    if (existingSettings && !force) {
      return { skipped: true, reason: "seedV2 already run (practiceSettings exists). Use force: true to add more." };
    }

    // -----------------------------------------------------------------------
    // Query real data
    // -----------------------------------------------------------------------
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const providers = await ctx.db
      .query("providers")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const practices = await ctx.db
      .query("practices")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .take(1);

    const insurancePlans = await ctx.db
      .query("insurancePlans")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const appointmentTypes = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const operatories = await ctx.db
      .query("operatories")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // V1-seeded users (for assignedTo references)
    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    // V1-seeded claims, denials, reviews (for enrichment linking in Part B)
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const denials = await ctx.db
      .query("denials")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    if (patients.length === 0) {
      return { skipped: true, reason: "No patients found — run NexHealth sync first" };
    }

    const practiceId = practices[0]?._id;
    if (!practiceId) {
      return { skipped: true, reason: "No practice found — run NexHealth sync first" };
    }

    const counts: Record<string, number> = {};

    // -----------------------------------------------------------------------
    // 1. PRACTICE SETTINGS (1 record)
    // -----------------------------------------------------------------------
    if (!existingSettings) {
      await ctx.db.insert("practiceSettings", {
        orgId,
        practiceId,
        reviewRequestDelay: 4,
        reviewMinSatisfactionScore: 0.65,
        defaultAppointmentDuration: 60,
        scheduleStartTime: "07:30",
        scheduleEndTime: "17:00",
        collectionsThresholds: {
          day0: 50,
          day7: 50,
          day14: 100,
          day30: 200,
          day60: 500,
          day90: 1000,
        },
        smsOptOutKeywords: ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
        updatedAt: now,
      });
    }
    counts.practiceSettings = 1;

    // -----------------------------------------------------------------------
    // 2. FEE SCHEDULES (4 records)
    // -----------------------------------------------------------------------
    const feeScheduleConfigs = [
      { name: "UCR Default 2026", isDefault: true, payerId: undefined as string | undefined, payerName: undefined as string | undefined, multiplier: 1.0 },
      { name: "Delta Dental PPO", isDefault: false, payerId: "DELTA", payerName: "Delta Dental", multiplier: 0.90 },
      { name: "Cigna DPPO", isDefault: false, payerId: "CIGNA", payerName: "Cigna Dental", multiplier: 0.85 },
      { name: "BCBS Dental", isDefault: false, payerId: "BCBS", payerName: "Blue Cross Blue Shield", multiplier: 0.92 },
    ];

    for (const config of feeScheduleConfigs) {
      const fees = CDT_PROCEDURES.map((proc) => {
        // Vary each payer's fee individually
        const baseMultiplier = config.multiplier;
        const variation = randFloat(rng, -0.03, 0.03);
        const adjustedFee = Math.round(proc.fee * (baseMultiplier + variation));
        return {
          code: proc.code,
          description: proc.desc,
          fee: adjustedFee,
          effectiveDate: "2026-01-01",
        };
      });

      const fsData: any = {
        orgId,
        practiceId,
        name: config.name,
        fees,
        isDefault: config.isDefault,
        isActive: true,
        createdAt: now - 90 * DAY,
        updatedAt: now,
      };
      if (config.payerId) {
        fsData.payerId = config.payerId;
        fsData.payerName = config.payerName;
        fsData.description = `Contracted fee schedule for ${config.payerName}`;
      } else {
        fsData.description = "Usual, Customary, and Reasonable fees for all procedures";
      }

      await ctx.db.insert("feeSchedules", fsData);
    }
    counts.feeSchedules = 4;

    // -----------------------------------------------------------------------
    // 3. PAYER RULES (8 records — one per PAYER)
    // -----------------------------------------------------------------------
    const ruleTemplates: Array<{
      ruleType: "frequency_limit" | "pre_auth_required" | "attachment_required" | "age_limit" | "procedure_combo" | "missing_data";
      description: string;
      procedureCodes?: string[];
      condition?: string;
      action: string;
    }> = [
      { ruleType: "frequency_limit", description: "Bitewings limited to once per 12 months", procedureCodes: ["D0274"], condition: "Last performed < 12 months ago", action: "Deny: frequency exceeded" },
      { ruleType: "frequency_limit", description: "Adult prophylaxis limited to 2 per calendar year", procedureCodes: ["D1110"], condition: "Count >= 2 in current year", action: "Deny: frequency exceeded" },
      { ruleType: "pre_auth_required", description: "Pre-authorization required for crowns", procedureCodes: ["D2740", "D2750"], condition: "Always", action: "Hold: require pre-auth before submission" },
      { ruleType: "pre_auth_required", description: "Pre-authorization required for implants", procedureCodes: ["D6010", "D6058"], condition: "Always", action: "Hold: require pre-auth before submission" },
      { ruleType: "attachment_required", description: "X-ray required for surgical extractions", procedureCodes: ["D7210", "D7240"], condition: "Always", action: "Attach: periapical radiograph required" },
      { ruleType: "attachment_required", description: "Narrative required for perio scaling > 2 quadrants", procedureCodes: ["D4341", "D4342"], condition: "Quadrants > 2", action: "Attach: clinical narrative required" },
      { ruleType: "age_limit", description: "Sealants covered only for patients under 16", procedureCodes: ["D1351"], condition: "Patient age >= 16", action: "Deny: age limit exceeded" },
      { ruleType: "age_limit", description: "Fluoride varnish covered only for patients under 19", procedureCodes: ["D1206"], condition: "Patient age >= 19", action: "Deny: age limit exceeded" },
      { ruleType: "procedure_combo", description: "Cannot bill D2950 (core buildup) without crown on same tooth", procedureCodes: ["D2950"], condition: "No D2740/D2750 on same tooth same date", action: "Deny: bundling violation" },
      { ruleType: "procedure_combo", description: "D0120 and D0150 cannot be billed on same date", procedureCodes: ["D0120", "D0150"], condition: "Both on same date of service", action: "Deny: mutually exclusive codes" },
      { ruleType: "missing_data", description: "Tooth number required for restorative procedures", procedureCodes: ["D2140", "D2150", "D2330", "D2331", "D2391"], condition: "Tooth field empty", action: "Reject: missing tooth number" },
      { ruleType: "missing_data", description: "Surface required for amalgam and composite fillings", procedureCodes: ["D2140", "D2150", "D2330", "D2331", "D2391"], condition: "Surface field empty", action: "Reject: missing surface designation" },
    ];

    for (const payer of PAYERS) {
      // Each payer gets 3-5 rules
      const numRules = randInt(rng, 3, 5);
      const selectedRules = pickFromList(rng, ruleTemplates, numRules);

      await ctx.db.insert("payerRules", {
        orgId,
        payerId: payer.id,
        payerName: payer.name,
        rules: selectedRules.map((r) => ({
          ruleType: r.ruleType,
          description: r.description,
          procedureCodes: r.procedureCodes,
          condition: r.condition,
          action: r.action,
        })),
        isActive: true,
        createdAt: now - 60 * DAY,
        updatedAt: now,
      });
    }
    counts.payerRules = 8;

    // -----------------------------------------------------------------------
    // 4. WORKING HOURS (35 records: 5 providers x 7 days)
    // -----------------------------------------------------------------------
    const providerPmsIds = providers.map((p: any) => p.pmsProviderId).filter(Boolean);
    let whIndex = 0;

    for (const provider of providers) {
      const pmsProviderId = (provider as any).pmsProviderId;
      if (!pmsProviderId) continue;

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        let startTime: string;
        let endTime: string;
        let isActive = true;

        if (dayOfWeek === 0) {
          // Sunday — off
          startTime = "08:00";
          endTime = "08:00";
          isActive = false;
        } else if (dayOfWeek === 6) {
          // Saturday — half day
          startTime = "08:00";
          endTime = "12:00";
        } else {
          // Monday-Friday
          startTime = "08:00";
          endTime = "17:00";
        }

        await ctx.db.insert("workingHours", {
          orgId,
          pmsProviderId,
          dayOfWeek,
          startTime,
          endTime,
          isActive,
          foreignId: `wh_seed_${whIndex}`,
          createdAt: now - 90 * DAY,
          updatedAt: now,
          lastSyncedAt: now,
        } as any);
        whIndex++;
      }
    }
    counts.workingHours = whIndex;

    // -----------------------------------------------------------------------
    // 5. PERFECT DAY TEMPLATES (5 records: Mon-Fri)
    // -----------------------------------------------------------------------
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const slotCategories = ["hygiene", "restorative", "surgical", "diagnostic", "preventive", "emergency"];

    for (let d = 0; d < 5; d++) {
      const dayOfWeek = d + 1; // 1=Mon, 5=Fri
      const slots: Array<{ startTime: string; endTime: string; category: string; productionTarget?: number }> = [];

      // Generate 10-12 slots per day
      const numSlots = randInt(rng, 10, 12);
      let currentHour = 8;
      let currentMin = 0;

      for (let s = 0; s < numSlots; s++) {
        const startH = String(currentHour).padStart(2, "0");
        const startM = String(currentMin).padStart(2, "0");

        // Slot duration: 30, 45, or 60 minutes
        const duration = pick(rng, [30, 45, 60]);
        let endMinTotal = currentHour * 60 + currentMin + duration;
        // Cap at 17:00
        if (endMinTotal > 17 * 60) endMinTotal = 17 * 60;
        const endH = String(Math.floor(endMinTotal / 60)).padStart(2, "0");
        const endM = String(endMinTotal % 60).padStart(2, "0");

        // Category distribution: more hygiene/restorative in morning, surgical/emergency in afternoon
        let category: string;
        if (currentHour < 10) {
          category = pick(rng, ["hygiene", "hygiene", "diagnostic", "preventive"]);
        } else if (currentHour < 13) {
          category = pick(rng, ["restorative", "restorative", "hygiene", "diagnostic"]);
        } else {
          category = pick(rng, ["restorative", "surgical", "emergency", "restorative"]);
        }

        // Production targets by category
        const targetByCategory: Record<string, [number, number]> = {
          hygiene: [100, 300],
          restorative: [300, 1500],
          surgical: [500, 2500],
          diagnostic: [100, 300],
          preventive: [100, 250],
          emergency: [200, 500],
        };
        const [minTarget, maxTarget] = targetByCategory[category] || [100, 500];
        const productionTarget = randInt(rng, minTarget, maxTarget);

        slots.push({
          startTime: `${startH}:${startM}`,
          endTime: `${endH}:${endM}`,
          category,
          productionTarget,
        });

        // Advance clock
        currentHour = Math.floor(endMinTotal / 60);
        currentMin = endMinTotal % 60;
        if (currentHour >= 17) break;
      }

      await ctx.db.insert("perfectDayTemplates", {
        orgId,
        practiceId,
        dayOfWeek,
        name: `${dayNames[d]} Standard`,
        slots,
        isActive: true,
        createdAt: now - 60 * DAY,
        updatedAt: now,
      });
    }
    counts.perfectDayTemplates = 5;

    // -----------------------------------------------------------------------
    // 6. PRODUCTION GOALS (30 records: last 30 calendar days)
    // -----------------------------------------------------------------------
    for (let d = 0; d < 30; d++) {
      const dateOffset = 29 - d; // 29 days ago to today
      const goalDate = new Date(now - dateOffset * DAY);
      const dateStr = goalDate.toISOString().split("T")[0];
      const dayOfWeekNum = goalDate.getDay(); // 0=Sun, 6=Sat

      // Weekends have lower goals
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
      const dailyGoal = isWeekend
        ? (dayOfWeekNum === 6 ? randInt(rng, 3000, 4000) : 0)
        : randInt(rng, 6000, 8000);
      const monthlyGoal = dailyGoal * 22;

      // Actual varies +-20% from goal
      const actualDaily = dailyGoal === 0
        ? 0
        : Math.round(dailyGoal * randFloat(rng, 0.80, 1.20));

      // Build provider array from real providers
      const providerGoals = providers.map((p: any) => {
        const providerShare = 1 / Math.max(providers.length, 1);
        const provGoal = Math.round(dailyGoal * providerShare);
        const provActual = dailyGoal === 0
          ? 0
          : Math.round(provGoal * randFloat(rng, 0.70, 1.30));
        return {
          providerId: p._id,
          goal: provGoal,
          actual: provActual,
        };
      });

      await ctx.db.insert("productionGoals", {
        orgId,
        practiceId,
        date: dateStr,
        dailyGoal,
        monthlyGoal,
        actualDaily,
        actualMonthly: Math.round(actualDaily * (d + 1) * 0.9), // rough running sum
        providers: providerGoals,
        updatedAt: now,
      });
    }
    counts.productionGoals = 30;

    // -----------------------------------------------------------------------
    // 7. QUICK FILL QUEUE (25 records)
    // -----------------------------------------------------------------------
    const qfStatuses: Array<"active" | "contacted" | "scheduled" | "removed"> = [];
    for (let i = 0; i < 25; i++) {
      if (i < 15) qfStatuses.push("active");
      else if (i < 20) qfStatuses.push("contacted");
      else if (i < 23) qfStatuses.push("scheduled");
      else qfStatuses.push("removed");
    }

    const qfReasons = [
      "Overdue hygiene",
      "Unscheduled treatment — crown recommended",
      "Unscheduled treatment — root canal needed",
      "ASAP request — patient called in",
      "Overdue periodic exam",
      "Cancelled appointment — needs rescheduling",
      "Failed appointment — patient no-showed",
      "Treatment plan accepted — awaiting scheduling",
      "Insurance benefits expiring soon",
      "Referred by another provider",
    ];
    const urgencies: Array<"low" | "medium" | "high" | "urgent"> = ["low", "medium", "medium", "high", "high", "urgent"];
    const dayNames2 = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const timePrefs = ["morning", "afternoon", "evening"];

    for (let i = 0; i < 25; i++) {
      const patient = pick(rng, patients) as any;
      const status = qfStatuses[i];
      const urgency = pick(rng, urgencies);
      const createdDaysAgo = randInt(rng, 0, 30);
      const createdAt = now - createdDaysAgo * DAY;

      const qfData: any = {
        orgId,
        patientId: patient._id,
        preferredDays: pickFromList(rng, dayNames2, randInt(rng, 1, 4)),
        preferredTimes: pickFromList(rng, timePrefs, randInt(rng, 1, 2)),
        urgency,
        productionValue: randInt(rng, 100, 3000),
        reason: pick(rng, qfReasons),
        status,
        createdAt,
        updatedAt: now - randInt(rng, 0, 5) * DAY,
      };

      if (appointmentTypes.length > 0) {
        qfData.appointmentTypeId = pick(rng, appointmentTypes)._id;
      }
      if (users.length > 0) {
        qfData.addedBy = pick(rng, users)._id;
      }
      if (status === "contacted") {
        qfData.lastContactedAt = createdAt + randInt(rng, 1, 48) * HOUR;
      }

      await ctx.db.insert("quickFillQueue", qfData);
    }
    counts.quickFillQueue = 25;

    // -----------------------------------------------------------------------
    // 8. RECALL DUE LIST (60 records)
    // -----------------------------------------------------------------------
    const recallTypes: Array<"hygiene" | "periodic_exam" | "perio_maintenance"> = [];
    // 40 hygiene, 12 periodic_exam, 8 perio_maintenance
    for (let i = 0; i < 60; i++) {
      if (i < 40) recallTypes.push("hygiene");
      else if (i < 52) recallTypes.push("periodic_exam");
      else recallTypes.push("perio_maintenance");
    }

    const outreachStatuses: Array<"pending" | "sms_sent" | "email_sent" | "called" | "scheduled" | "refused"> = [];
    // 20 pending, 15 sms_sent, 10 email_sent, 8 called, 5 scheduled, 2 refused
    for (let i = 0; i < 60; i++) {
      if (i < 20) outreachStatuses.push("pending");
      else if (i < 35) outreachStatuses.push("sms_sent");
      else if (i < 45) outreachStatuses.push("email_sent");
      else if (i < 53) outreachStatuses.push("called");
      else if (i < 58) outreachStatuses.push("scheduled");
      else outreachStatuses.push("refused");
    }

    for (let i = 0; i < 60; i++) {
      const patient = pick(rng, patients) as any;
      const recallType = recallTypes[i];
      const outreachStatus = outreachStatuses[i];

      // Interval based on type
      const intervalMonths = recallType === "hygiene" ? pick(rng, [6, 6, 6, 4])
        : recallType === "periodic_exam" ? pick(rng, [6, 6, 12])
        : pick(rng, [3, 4, 4]);

      // Due date spread: -90 days to +30 days from now
      const dueDaysFromNow = randInt(rng, -90, 30);
      const dueDate = new Date(now + dueDaysFromNow * DAY).toISOString().split("T")[0];

      const outreachAttempts = outreachStatus === "pending" ? 0
        : outreachStatus === "sms_sent" ? randInt(rng, 1, 2)
        : outreachStatus === "email_sent" ? randInt(rng, 1, 3)
        : outreachStatus === "called" ? randInt(rng, 2, 5)
        : outreachStatus === "scheduled" ? randInt(rng, 1, 4)
        : randInt(rng, 3, 5);

      const recallData: any = {
        orgId,
        patientId: patient._id,
        dueDate,
        recallType,
        intervalMonths,
        outreachStatus,
        outreachAttempts,
        createdAt: now - randInt(rng, 30, 120) * DAY,
        updatedAt: now - randInt(rng, 0, 14) * DAY,
      };

      if (outreachStatus !== "pending") {
        recallData.lastOutreachAt = now - randInt(rng, 0, 14) * DAY;
      }
      if (outreachStatus === "scheduled" && appointments.length > 0) {
        recallData.scheduledAppointmentId = pick(rng, appointments)._id;
      }

      await ctx.db.insert("recallDueList", recallData);
    }
    counts.recallDueList = 60;

    // -----------------------------------------------------------------------
    // 9. PROCEDURES (200 records: ~80 patients x 1-5 each)
    // -----------------------------------------------------------------------
    const procStatuses = ["completed", "planned", "in_progress"];
    // 160 completed, 20 planned, 20 in_progress
    const procStatusDist: string[] = [];
    for (let i = 0; i < 200; i++) {
      if (i < 160) procStatusDist.push("completed");
      else if (i < 180) procStatusDist.push("planned");
      else procStatusDist.push("in_progress");
    }

    // Pick ~80 unique patients for procedures
    const procPatients = pickFromList(rng, patients, Math.min(80, patients.length));
    let procIndex = 0;

    for (const patient of procPatients) {
      const numProcs = randInt(rng, 1, 5);
      for (let p = 0; p < numProcs && procIndex < 200; p++) {
        const proc = pick(rng, CDT_PROCEDURES);
        const status = procStatusDist[procIndex];
        const fee = proc.fee + randInt(rng, -20, 30);
        const daysAgo = randInt(rng, 0, 90);
        const patientData = patient as any;

        const needsTooth = proc.code.startsWith("D2") || proc.code.startsWith("D3") || proc.code.startsWith("D7");
        const needsSurface = proc.code.startsWith("D2") && !proc.code.startsWith("D27"); // fillings, not crowns

        const procData: any = {
          orgId,
          pmsProcedureId: `pms_proc_${procIndex}`,
          pmsPatientId: patientData.pmsPatientId || String(patientData._id),
          code: proc.code,
          description: proc.desc,
          fee,
          status,
          foreignId: `proc_seed_${procIndex}`,
          createdAt: now - daysAgo * DAY,
          updatedAt: now - randInt(rng, 0, 7) * DAY,
          lastSyncedAt: now,
        };

        if (needsTooth) {
          procData.tooth = pick(rng, TEETH);
        }
        if (needsSurface) {
          procData.surface = pick(rng, SURFACES);
        }
        if (providers.length > 0) {
          const prov = pick(rng, providers) as any;
          procData.pmsProviderId = prov.pmsProviderId || String(prov._id);
        }
        if (status === "completed") {
          procData.completedAt = new Date(now - daysAgo * DAY).toISOString().split("T")[0];
        }
        if (appointments.length > 0 && rng() > 0.5) {
          procData.pmsAppointmentId = (pick(rng, appointments) as any).pmsAppointmentId || undefined;
        }

        await ctx.db.insert("procedures", procData);
        procIndex++;
      }
    }
    // Fill remaining if we haven't hit 200
    while (procIndex < 200) {
      const patient = pick(rng, patients) as any;
      const proc = pick(rng, CDT_PROCEDURES);
      const status = procStatusDist[procIndex];
      const fee = proc.fee + randInt(rng, -20, 30);
      const daysAgo = randInt(rng, 0, 90);

      const needsTooth = proc.code.startsWith("D2") || proc.code.startsWith("D3") || proc.code.startsWith("D7");
      const needsSurface = proc.code.startsWith("D2") && !proc.code.startsWith("D27");

      const procData: any = {
        orgId,
        pmsProcedureId: `pms_proc_${procIndex}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        code: proc.code,
        description: proc.desc,
        fee,
        status,
        foreignId: `proc_seed_${procIndex}`,
        createdAt: now - daysAgo * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      };
      if (needsTooth) procData.tooth = pick(rng, TEETH);
      if (needsSurface) procData.surface = pick(rng, SURFACES);
      if (providers.length > 0) {
        const prov = pick(rng, providers) as any;
        procData.pmsProviderId = prov.pmsProviderId || String(prov._id);
      }
      if (status === "completed") {
        procData.completedAt = new Date(now - daysAgo * DAY).toISOString().split("T")[0];
      }

      await ctx.db.insert("procedures", procData);
      procIndex++;
    }
    counts.procedures = 200;

    // -----------------------------------------------------------------------
    // 10. CHARGES (150 records)
    // -----------------------------------------------------------------------
    // Status distribution: 120 posted, 20 pending, 10 voided
    const chargeStatusDist: string[] = [];
    for (let i = 0; i < 150; i++) {
      if (i < 120) chargeStatusDist.push("posted");
      else if (i < 140) chargeStatusDist.push("pending");
      else chargeStatusDist.push("voided");
    }

    for (let i = 0; i < 150; i++) {
      const proc = pick(rng, CDT_PROCEDURES);
      const patient = pick(rng, patients) as any;
      const status = chargeStatusDist[i];
      const baseAmount = proc.fee + randInt(rng, -20, 30);
      // Amount matches procedure fee +/- 5%
      const amount = Math.round(baseAmount * randFloat(rng, 0.95, 1.05));
      const daysAgo = randInt(rng, 0, 90);
      const dateStr = new Date(now - daysAgo * DAY).toISOString().split("T")[0];

      const chargeData: any = {
        orgId,
        pmsChargeId: `pms_charge_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        amount,
        procedureCode: proc.code,
        description: proc.desc,
        date: dateStr,
        status,
        foreignId: `charge_seed_${i}`,
        createdAt: now - daysAgo * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      };

      if (providers.length > 0) {
        const prov = pick(rng, providers) as any;
        chargeData.pmsProviderId = prov.pmsProviderId || String(prov._id);
      }

      // Some linked to pmsClaims via pmsClaimId
      if (rng() > 0.6) {
        chargeData.pmsClaimId = `pms_claim_${randInt(rng, 1, 30)}`;
      }

      await ctx.db.insert("charges", chargeData);
    }
    counts.charges = 150;

    // -----------------------------------------------------------------------
    // 11. PMS PAYMENTS (80 records)
    // -----------------------------------------------------------------------
    const paymentMethods = ["card", "check", "cash", "insurance"];
    // 30 card, 20 check, 15 cash, 15 insurance
    const pmPayMethodDist: string[] = [];
    for (let i = 0; i < 80; i++) {
      if (i < 30) pmPayMethodDist.push("card");
      else if (i < 50) pmPayMethodDist.push("check");
      else if (i < 65) pmPayMethodDist.push("cash");
      else pmPayMethodDist.push("insurance");
    }

    for (let i = 0; i < 80; i++) {
      const patient = pick(rng, patients) as any;
      const paymentMethod = pmPayMethodDist[i];
      const amount = randInt(rng, 25, 2000);
      const daysAgo = randInt(rng, 0, 90);
      const dateStr = new Date(now - daysAgo * DAY).toISOString().split("T")[0];

      const pmPayData: any = {
        orgId,
        pmsPaymentId: `pms_pay_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        amount,
        paymentMethod,
        date: dateStr,
        foreignId: `pmspay_seed_${i}`,
        createdAt: now - daysAgo * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      };

      if (paymentMethod === "check") {
        pmPayData.note = `Check #${randInt(rng, 1000, 9999)}`;
      }
      if (paymentMethod === "insurance") {
        pmPayData.note = `EOB payment — ${pick(rng, PAYERS).name}`;
        pmPayData.pmsClaimId = `pms_claim_${randInt(rng, 1, 30)}`;
      }

      await ctx.db.insert("pmsPayments", pmPayData);
    }
    counts.pmsPayments = 80;

    // -----------------------------------------------------------------------
    // 12. ADJUSTMENTS (40 records)
    // -----------------------------------------------------------------------
    const adjDescriptions = [
      "Insurance write-off",
      "Insurance write-off",
      "Insurance write-off",
      "Insurance write-off",
      "Patient discount",
      "Patient discount",
      "Patient discount",
      "Provider courtesy",
      "Provider courtesy",
      "Insurance adjustment",
      "Insurance adjustment",
      "Senior discount",
      "Family plan discount",
      "Hardship adjustment",
      "Contractual adjustment",
    ];

    for (let i = 0; i < 40; i++) {
      const patient = pick(rng, patients) as any;
      const description = pick(rng, adjDescriptions);
      const amount = randInt(rng, 10, 500);
      const daysAgo = randInt(rng, 0, 90);
      const dateStr = new Date(now - daysAgo * DAY).toISOString().split("T")[0];

      const adjData: any = {
        orgId,
        pmsAdjustmentId: `pms_adj_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        amount,
        description,
        date: dateStr,
        foreignId: `adj_seed_${i}`,
        createdAt: now - daysAgo * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      };

      if (providers.length > 0) {
        const prov = pick(rng, providers) as any;
        adjData.pmsProviderId = prov.pmsProviderId || String(prov._id);
      }

      await ctx.db.insert("adjustments", adjData);
    }
    counts.adjustments = 40;

    // -----------------------------------------------------------------------
    // 13. GUARANTOR BALANCES (50 records)
    // -----------------------------------------------------------------------
    for (let i = 0; i < 50; i++) {
      const patient = pick(rng, patients) as any;
      const balance = randFloat(rng, 0, 2000);
      const lastPayDaysAgo = randInt(rng, 0, 90);
      const lastPayDate = new Date(now - lastPayDaysAgo * DAY).toISOString().split("T")[0];

      await ctx.db.insert("guarantorBalances", {
        orgId,
        pmsGuarantorBalanceId: `pms_gb_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        balance,
        lastPaymentDate: lastPayDate,
        lastPaymentAmount: randInt(rng, 25, 500),
        foreignId: `gb_seed_${i}`,
        createdAt: now - randInt(rng, 30, 120) * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      } as any);
    }
    counts.guarantorBalances = 50;

    // -----------------------------------------------------------------------
    // 14. INSURANCE BALANCES (30 records)
    // -----------------------------------------------------------------------
    for (let i = 0; i < 30; i++) {
      const patient = pick(rng, patients) as any;
      const balance = randFloat(rng, 0, 5000);

      await ctx.db.insert("insuranceBalances", {
        orgId,
        pmsInsuranceBalanceId: `pms_ib_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        insurancePlanId: randInt(rng, 1, 100),
        balance,
        foreignId: `ib_seed_${i}`,
        createdAt: now - randInt(rng, 30, 120) * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      } as any);
    }
    counts.insuranceBalances = 30;

    // -----------------------------------------------------------------------
    // 15. TREATMENT PLANS (40 records)
    // -----------------------------------------------------------------------
    const tpStatusDist: string[] = [];
    // 20 active, 12 completed, 8 proposed
    for (let i = 0; i < 40; i++) {
      if (i < 20) tpStatusDist.push("active");
      else if (i < 32) tpStatusDist.push("completed");
      else tpStatusDist.push("proposed");
    }

    for (let i = 0; i < 40; i++) {
      const patient = pick(rng, patients) as any;
      const status = tpStatusDist[i];
      const numProcs = randInt(rng, 2, 6);
      const tpProcs: Array<{
        code: string;
        description: string;
        fee: number;
        tooth?: string;
        surface?: string;
        status: string;
      }> = [];
      let totalFee = 0;

      for (let p = 0; p < numProcs; p++) {
        const proc = pick(rng, CDT_PROCEDURES);
        const fee = proc.fee + randInt(rng, -20, 30);
        totalFee += fee;
        const needsTooth = proc.code.startsWith("D2") || proc.code.startsWith("D3") || proc.code.startsWith("D7");
        const needsSurface = proc.code.startsWith("D2") && !proc.code.startsWith("D27");

        tpProcs.push({
          code: proc.code,
          description: proc.desc,
          fee,
          tooth: needsTooth ? pick(rng, TEETH) : undefined,
          surface: needsSurface ? pick(rng, SURFACES) : undefined,
          status: status === "completed" ? "completed" : (rng() > 0.3 ? "planned" : "in_progress"),
        });
      }

      const tpData: any = {
        orgId,
        pmsTreatmentPlanId: `pms_tp_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        name: `Treatment Plan ${i + 1}`,
        status,
        totalFee,
        procedures: tpProcs,
        foreignId: `tp_seed_${i}`,
        createdAt: now - randInt(rng, 14, 120) * DAY,
        updatedAt: now - randInt(rng, 0, 14) * DAY,
        lastSyncedAt: now,
      };

      if (providers.length > 0) {
        const prov = pick(rng, providers) as any;
        tpData.pmsProviderId = prov.pmsProviderId || String(prov._id);
      }

      await ctx.db.insert("treatmentPlans", tpData);
    }
    counts.treatmentPlans = 40;

    // -----------------------------------------------------------------------
    // 16. PMS CLAIMS (60 records)
    // -----------------------------------------------------------------------
    const pmsClaimStatusDist: string[] = [];
    // 20 submitted, 20 paid, 10 pending, 10 denied
    for (let i = 0; i < 60; i++) {
      if (i < 20) pmsClaimStatusDist.push("submitted");
      else if (i < 40) pmsClaimStatusDist.push("paid");
      else if (i < 50) pmsClaimStatusDist.push("pending");
      else pmsClaimStatusDist.push("denied");
    }

    for (let i = 0; i < 60; i++) {
      const patient = pick(rng, patients) as any;
      const status = pmsClaimStatusDist[i];
      const totalAmount = randInt(rng, 100, 5000);
      const daysAgo = randInt(rng, 0, 90);

      const pmsClaimData: any = {
        orgId,
        pmsClaimId: `pms_claim_${i}`,
        pmsPatientId: patient.pmsPatientId || String(patient._id),
        insurancePlanId: randInt(rng, 1, 100),
        totalAmount,
        status,
        foreignId: `claim_seed_${i}`,
        createdAt: now - daysAgo * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
        lastSyncedAt: now,
      };

      if (status === "paid") {
        // Paid 60-100% of total
        pmsClaimData.paidAmount = Math.round(totalAmount * randFloat(rng, 0.60, 1.00));
      }

      if (status === "submitted" || status === "paid") {
        pmsClaimData.submittedDate = new Date(now - daysAgo * DAY).toISOString().split("T")[0];
      }

      await ctx.db.insert("pmsClaims", pmsClaimData);
    }
    counts.pmsClaims = 60;

    // -----------------------------------------------------------------------
    // 17. PAYMENT PLANS (12 records)
    // -----------------------------------------------------------------------
    const ppCadences: Array<"monthly" | "biweekly" | "weekly"> = [
      "monthly", "monthly", "monthly", "monthly", "monthly", "monthly",
      "biweekly", "biweekly", "biweekly", "biweekly",
      "weekly", "weekly",
    ];
    const ppStatuses: Array<"active" | "completed" | "defaulted" | "cancelled"> = [
      "active", "active", "active", "active", "active", "active",
      "active", "active", "completed", "completed",
      "defaulted", "cancelled",
    ];

    for (let i = 0; i < 12; i++) {
      const patient = pick(rng, patients) as any;
      const totalAmount = randInt(rng, 500, 5000);
      const cadence = ppCadences[i];
      const ppStatus = ppStatuses[i];

      // Calculate installment count and interval
      const intervalDays = cadence === "monthly" ? 30 : cadence === "biweekly" ? 14 : 7;
      const numInstallments = cadence === "monthly" ? randInt(rng, 3, 12)
        : cadence === "biweekly" ? randInt(rng, 4, 12)
        : randInt(rng, 4, 16);
      const installmentAmount = Math.round(totalAmount / numInstallments);

      const planStartDate = now - randInt(rng, 30, 180) * DAY;
      const installments: Array<{
        number: number;
        amount: number;
        dueDate: string;
        status: "pending" | "paid" | "failed" | "skipped";
        paidAt?: number;
      }> = [];

      let paidCount = 0;
      let remainingAmount = totalAmount;

      for (let inst = 0; inst < numInstallments; inst++) {
        const dueDate = new Date(planStartDate + inst * intervalDays * DAY).toISOString().split("T")[0];
        const dueDateMs = planStartDate + inst * intervalDays * DAY;
        let instStatus: "pending" | "paid" | "failed" | "skipped";

        if (ppStatus === "completed") {
          instStatus = "paid";
        } else if (ppStatus === "cancelled") {
          instStatus = inst < Math.floor(numInstallments * 0.3) ? "paid" : "skipped";
        } else if (ppStatus === "defaulted") {
          if (inst < Math.floor(numInstallments * 0.5)) {
            instStatus = "paid";
          } else if (inst === Math.floor(numInstallments * 0.5)) {
            instStatus = "failed";
          } else {
            instStatus = "pending";
          }
        } else {
          // active
          if (dueDateMs < now) {
            instStatus = rng() > 0.05 ? "paid" : "failed";
          } else {
            instStatus = "pending";
          }
        }

        if (instStatus === "paid") {
          paidCount++;
          remainingAmount -= installmentAmount;
        }

        installments.push({
          number: inst + 1,
          amount: installmentAmount,
          dueDate,
          status: instStatus,
          paidAt: instStatus === "paid" ? dueDateMs + randInt(rng, 0, 2) * DAY : undefined,
        });
      }

      if (remainingAmount < 0) remainingAmount = 0;

      // Find next pending installment for active plans
      let nextChargeDate: string | undefined;
      if (ppStatus === "active") {
        const nextPending = installments.find((inst) => inst.status === "pending");
        if (nextPending) nextChargeDate = nextPending.dueDate;
      }

      await ctx.db.insert("paymentPlans", {
        orgId,
        patientId: patient._id,
        totalAmount,
        remainingAmount: Math.max(remainingAmount, 0),
        installmentAmount,
        cadence,
        installments,
        status: ppStatus,
        nextChargeDate,
        createdAt: planStartDate,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
      });
    }
    counts.paymentPlans = 12;

    // -----------------------------------------------------------------------
    // 18. CARD ON FILE CONSENTS (20 records)
    // -----------------------------------------------------------------------
    const cofBrands = [
      "Visa", "Visa", "Visa", "Visa", "Visa", "Visa", "Visa", "Visa",
      "Mastercard", "Mastercard", "Mastercard", "Mastercard", "Mastercard", "Mastercard",
      "Amex", "Amex", "Amex",
      "Discover", "Discover", "Discover",
    ];
    const cofSources = ["patient_portal", "front_desk", "intake_form"];

    for (let i = 0; i < 20; i++) {
      const patient = pick(rng, patients) as any;
      const brand = cofBrands[i];
      const isActive = i < 17; // 17 active, 3 revoked
      const consentDaysAgo = randInt(rng, 1, 180);
      const consentedAt = now - consentDaysAgo * DAY;
      const last4 = String(randInt(rng, 1000, 9999));

      const cofData: any = {
        orgId,
        patientId: patient._id,
        stripeCustomerId: `cus_seed_${i}`,
        stripePaymentMethodId: `pm_seed_${i}`,
        last4,
        brand,
        consentedAt,
        consentSource: pick(rng, cofSources),
        maxChargeAmount: pick(rng, [200, 300, 500, 750, 1000]),
        isActive,
        createdAt: consentedAt,
        updatedAt: now - randInt(rng, 0, 14) * DAY,
      };

      if (!isActive) {
        cofData.revokedAt = consentedAt + randInt(rng, 14, 90) * DAY;
      }

      await ctx.db.insert("cardOnFileConsents", cofData);
    }
    counts.cardOnFileConsents = 20;

    // -----------------------------------------------------------------------
    // 19. ERA RECORDS (15 records)
    // -----------------------------------------------------------------------
    for (let i = 0; i < 15; i++) {
      const payer = pick(rng, PAYERS);
      const numClaimPayments = randInt(rng, 2, 5);
      const claimPayments: Array<{
        claimNumber: string;
        patientName?: string;
        amountPaid: number;
        adjustments?: number;
        matchedClaimId?: any;
        matchStatus: "matched" | "unmatched" | "exception";
      }> = [];
      let totalPaid = 0;
      let matchedCount = 0;

      for (let c = 0; c < numClaimPayments; c++) {
        const amountPaid = randInt(rng, 50, 2000);
        totalPaid += amountPaid;

        // Match status: 60% matched, 25% unmatched, 15% exception
        const matchRoll = rng();
        let matchStatus: "matched" | "unmatched" | "exception";
        let matchedClaimId: any = undefined;

        if (matchRoll < 0.60 && claims.length > 0) {
          matchStatus = "matched";
          matchedClaimId = pick(rng, claims)._id;
          matchedCount++;
        } else if (matchRoll < 0.85) {
          matchStatus = "unmatched";
        } else {
          matchStatus = "exception";
        }

        const patientForEra = patients.length > 0 ? pick(rng, patients) as any : null;

        claimPayments.push({
          claimNumber: `CLM-2026-${String(randInt(rng, 1000, 9999)).padStart(4, "0")}`,
          patientName: patientForEra ? `${patientForEra.firstName} ${patientForEra.lastName}` : undefined,
          amountPaid,
          adjustments: randInt(rng, 0, 200),
          matchedClaimId,
          matchStatus,
        });
      }

      const matchRate = Math.round((matchedCount / numClaimPayments) * 100);
      const checkDaysAgo = randInt(rng, 0, 60);

      await ctx.db.insert("eraRecords", {
        orgId,
        eraId: `ERA-2026-${String(i + 1).padStart(4, "0")}`,
        payerId: payer.id,
        payerName: payer.name,
        checkNumber: `${randInt(rng, 100000, 999999)}`,
        checkDate: new Date(now - checkDaysAgo * DAY).toISOString().split("T")[0],
        totalPaid,
        claimPayments,
        matchRate,
        processedAt: now - checkDaysAgo * DAY + randInt(rng, 1, 24) * HOUR,
        createdAt: now - checkDaysAgo * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
      });
    }
    counts.eraRecords = 15;

    // -----------------------------------------------------------------------
    // 20. HEALTH CHECKS (50 records)
    // -----------------------------------------------------------------------
    const healthTargets = ["nexhealth", "pms_sync", "clearinghouse", "stripe", "twilio", "google_business", "openai"];
    const checksPerTarget = Math.floor(50 / healthTargets.length); // ~7 each
    let hcIndex = 0;

    for (const target of healthTargets) {
      for (let c = 0; c < checksPerTarget && hcIndex < 50; c++) {
        // Spread over last 24 hours
        const hoursAgo = Math.floor((c / checksPerTarget) * 24);
        const timestamp = now - hoursAgo * HOUR - randInt(rng, 0, 30) * 60000;

        // Status distribution: ~70% healthy, ~20% degraded, ~10% down
        const statusRoll = rng();
        let status: "healthy" | "degraded" | "down";
        if (statusRoll < 0.70) {
          status = "healthy";
        } else if (statusRoll < 0.90) {
          status = "degraded";
        } else {
          status = "down";
        }

        const responseTimeMs = status === "healthy" ? randInt(rng, 50, 500)
          : status === "degraded" ? randInt(rng, 500, 1500)
          : randInt(rng, 1500, 2000);

        const message = status === "healthy" ? "OK"
          : status === "degraded" ? `${target} responding slowly (${responseTimeMs}ms)`
          : `${target} connection refused`;

        await ctx.db.insert("healthChecks", {
          orgId,
          checkType: "integration" as const,
          target,
          status,
          responseTimeMs,
          message,
          timestamp,
        });
        hcIndex++;
      }
    }
    // Fill remaining to reach 50
    while (hcIndex < 50) {
      const target = pick(rng, healthTargets);
      await ctx.db.insert("healthChecks", {
        orgId,
        checkType: "integration" as const,
        target,
        status: "healthy" as const,
        responseTimeMs: randInt(rng, 50, 300),
        message: "OK",
        timestamp: now - randInt(rng, 0, 24) * HOUR,
      });
      hcIndex++;
    }
    counts.healthChecks = 50;

    // -----------------------------------------------------------------------
    // 21. SYNC JOBS (10 records)
    // -----------------------------------------------------------------------
    const sjTypes: Array<"full_sync" | "incremental" | "patient_sync" | "appointment_sync"> = [
      "full_sync", "full_sync",
      "incremental", "incremental", "incremental", "incremental", "incremental", "incremental",
      "patient_sync", "appointment_sync",
    ];
    const sjStatuses: Array<"completed" | "running" | "failed"> = [
      "completed", "completed", "completed", "completed", "completed",
      "completed", "completed",
      "running",
      "failed", "failed",
    ];

    for (let i = 0; i < 10; i++) {
      const jobType = sjTypes[i];
      const sjStatus = sjStatuses[i];
      const hoursAgo = randInt(rng, 0, 72);
      const startedAt = now - hoursAgo * HOUR;
      const recordsProcessed = randInt(rng, 10, 500);
      const recordsFailed = sjStatus === "failed" ? randInt(rng, 1, 5) : (rng() > 0.7 ? randInt(rng, 0, 3) : 0);

      const sjData: any = {
        orgId,
        practiceId,
        jobType,
        status: sjStatus,
        recordsProcessed,
        recordsFailed,
        startedAt,
        createdAt: startedAt,
        updatedAt: now - randInt(rng, 0, 2) * HOUR,
      };

      if (sjStatus === "completed") {
        sjData.completedAt = startedAt + randInt(rng, 5, 120) * 1000; // 5s to 2min
      } else if (sjStatus === "failed") {
        sjData.completedAt = startedAt + randInt(rng, 10, 60) * 1000;
        sjData.errors = [
          pick(rng, [
            "NexHealth API returned 500 for /patients",
            "Authentication token expired during sync",
            "Rate limit exceeded — retry after 60s",
            "Timeout waiting for PMS response (30s)",
            "Invalid response format from /appointments endpoint",
          ]),
        ];
      }

      await ctx.db.insert("syncJobs", sjData);
    }
    counts.syncJobs = 10;

    // -----------------------------------------------------------------------
    // 22. CHAT CONVERSATIONS (5 records)
    // -----------------------------------------------------------------------
    const chatContexts = [
      { page: "dashboard", title: "Dashboard KPIs Review", mode: "read_only" as const },
      { page: "patients", title: "Patient Insurance Lookup", mode: "read_only" as const },
      { page: "scheduling", title: "Schedule Optimization", mode: "read_action" as const },
      { page: "rcm", title: "Claims Status Check", mode: "read_action" as const },
      { page: "settings", title: "PMS Connection Troubleshoot", mode: "full" as const },
    ];
    const chatStatuses: Array<"active" | "archived"> = ["active", "active", "active", "active", "archived"];
    const conversationIds: any[] = [];

    for (let i = 0; i < 5; i++) {
      const ctx2 = chatContexts[i];
      const messageCount = randInt(rng, 3, 8);
      const createdDaysAgo = randInt(rng, 0, 14);
      const createdAt = now - createdDaysAgo * DAY;

      const convId = await ctx.db.insert("chatConversations", {
        orgId,
        userId: "clerk_seed_001",
        title: ctx2.title,
        status: chatStatuses[i],
        contextPage: ctx2.page,
        personaMode: ctx2.mode,
        lastMessageAt: now - randInt(rng, 0, 3) * DAY,
        messageCount,
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      });
      conversationIds.push(convId);
    }
    counts.chatConversations = 5;

    // -----------------------------------------------------------------------
    // 23. CHAT MESSAGES (25 records: 5 per conversation)
    // -----------------------------------------------------------------------
    const chatDialogs: Array<Array<{
      role: "user" | "assistant" | "tool_call";
      content: string;
      containsPhi?: boolean;
      toolName?: string;
      toolArgs?: string;
    }>> = [
      // Dashboard conversation
      [
        { role: "user", content: "What are our key metrics for this week?" },
        { role: "assistant", content: "Here's a summary of this week's performance:\n- Production: $42,350 (87% of goal)\n- Collections: $38,200 (90% rate)\n- New patients: 12\n- No-shows: 3 (2.1%)\n- Pending claims: 15 totaling $28,400" },
        { role: "user", content: "How does production compare to last week?" },
        { role: "assistant", content: "Production is up 8% from last week ($39,200). The increase is primarily driven by two additional crown procedures and higher hygiene appointment volume. Dr. Johnson's production is up 15% while Dr. Martinez is steady." },
        { role: "user", content: "What about our claim denial rate?" },
      ],
      // Patients conversation
      [
        { role: "user", content: "Look up insurance details for patient Sarah Thompson", containsPhi: true },
        { role: "tool_call", content: "Searching patient records...", toolName: "searchPatients", toolArgs: JSON.stringify({ query: "Sarah Thompson" }) },
        { role: "assistant", content: "Sarah Thompson (DOB: 03/15/1985) has Delta Dental PPO as primary insurance.\n- Member ID: DDG-445589\n- Annual Maximum: $2,000\n- Used: $850\n- Remaining: $1,150\n- Deductible: $50 (met)\n- Preventive: 100%, Basic: 80%, Major: 50%", containsPhi: true },
        { role: "user", content: "Does she have any outstanding balance?", containsPhi: true },
        { role: "assistant", content: "Sarah has a patient balance of $125.00 from a composite filling (D2391) on 01/15/2026. This was her 20% copay after insurance paid $168. No payment plan is set up.", containsPhi: true },
      ],
      // Scheduling conversation
      [
        { role: "user", content: "Are there any openings tomorrow morning for a hygiene appointment?" },
        { role: "tool_call", content: "Checking schedule availability...", toolName: "getAvailableSlots", toolArgs: JSON.stringify({ date: "tomorrow", type: "hygiene" }) },
        { role: "assistant", content: "Tomorrow morning has 2 hygiene openings:\n- 8:00 AM - 9:00 AM (Op 1, Hygienist Williams)\n- 10:30 AM - 11:30 AM (Op 2, Hygienist Davis)\nWould you like me to suggest a patient from the Quick Fill queue?" },
        { role: "user", content: "Yes, who should we fill that 8 AM slot with?" },
        { role: "assistant", content: "Top Quick Fill candidate for the 8:00 AM slot:\n1. Maria Garcia — Overdue hygiene (7 months), morning preference, lives 5 min away, high lifetime value ($4,200). She has been contacted once via SMS with no response.\n\nShall I create a contact attempt?" },
      ],
      // RCM conversation
      [
        { role: "user", content: "Show me claims that have been pending for more than 30 days" },
        { role: "tool_call", content: "Querying aged claims...", toolName: "getAgedClaims", toolArgs: JSON.stringify({ minAgeDays: 30 }) },
        { role: "assistant", content: "Found 8 claims pending 30+ days:\n- CLM-2026-0003: Delta Dental, $1,450 (42 days) — submitted, no response\n- CLM-2026-0007: Cigna, $890 (38 days) — needs follow-up\n- CLM-2026-0012: BCBS, $2,100 (55 days) — partial payment received\n\n5 more claims in the 31-60 day bucket. Total outstanding: $12,340." },
        { role: "user", content: "Can you create follow-up tasks for the top 3?" },
        { role: "assistant", content: "I've created 3 follow-up tasks assigned to the billing team:\n1. Follow up on CLM-2026-0003 (Delta, $1,450) — Priority: High\n2. Follow up on CLM-2026-0007 (Cigna, $890) — Priority: Medium\n3. Follow up on CLM-2026-0012 (BCBS, $2,100) — Priority: High\n\nAll tasks have an 8-hour SLA deadline." },
      ],
      // Settings conversation
      [
        { role: "user", content: "What's the status of our NexHealth connection?" },
        { role: "assistant", content: "NexHealth connection status: Connected (Healthy)\n- Environment: Sandbox\n- Last sync: 3 minutes ago\n- Sync interval: Every 5 minutes\n- Records synced last run: 12 (patients: 3, appointments: 7, insurance: 2)\n- No errors in the last 24 hours." },
        { role: "user", content: "When was our last full sync?" },
        { role: "tool_call", content: "Checking sync history...", toolName: "getSyncJobs", toolArgs: JSON.stringify({ type: "full_sync" }) },
        { role: "assistant", content: "Last full sync was completed 2 days ago:\n- Duration: 45 seconds\n- Records processed: 248\n- Records failed: 2 (insurance coverages — plan not found)\n- Tables updated: providers(5), operatories(3), patients(104), appointments(82), appointment types(10), insurance plans(5)" },
        { role: "user", content: "Can you run another full sync now?" },
      ],
    ];

    let msgCount = 0;
    for (let convIdx = 0; convIdx < 5; convIdx++) {
      const dialog = chatDialogs[convIdx];
      const convId = conversationIds[convIdx];
      const convCreatedAt = now - randInt(rng, 1, 14) * DAY;

      for (let msgIdx = 0; msgIdx < dialog.length; msgIdx++) {
        const msg = dialog[msgIdx];
        const msgTime = convCreatedAt + msgIdx * randInt(rng, 10, 120) * 1000;

        const msgData: any = {
          orgId,
          conversationId: convId,
          role: msg.role,
          content: msg.content,
          tokensUsed: randInt(rng, 100, 2000),
          containsPhi: msg.containsPhi || false,
          createdAt: msgTime,
        };

        if (msg.toolName) {
          msgData.toolName = msg.toolName;
          msgData.toolArgs = msg.toolArgs;
        }

        await ctx.db.insert("chatMessages", msgData);
        msgCount++;
      }
    }
    counts.chatMessages = msgCount;

    // -----------------------------------------------------------------------
    // 24. WEBHOOK EVENTS (20 records)
    // -----------------------------------------------------------------------
    const webhookEventTypes = [
      "patient.created", "patient.created", "patient.created", "patient.created", "patient.created",
      "appointment.updated", "appointment.updated", "appointment.updated", "appointment.updated", "appointment.updated",
      "payment.created", "payment.created", "payment.created",
      "insurance.updated", "insurance.updated", "insurance.updated",
      "charge.created", "charge.created",
      "appointment.cancelled", "appointment.cancelled",
    ];
    const webhookStatuses: Array<"processed" | "pending" | "failed"> = [
      "processed", "processed", "processed", "processed", "processed",
      "processed", "processed", "processed", "processed", "processed",
      "processed", "processed", "processed", "processed", "processed",
      "processed",
      "pending", "pending",
      "failed", "failed",
    ];

    for (let i = 0; i < 20; i++) {
      const eventType = webhookEventTypes[i];
      const whStatus = webhookStatuses[i];
      const hoursAgo = randInt(rng, 0, 48);
      const receivedAt = now - hoursAgo * HOUR;

      // Build minimal realistic payload
      const resourceId = randInt(rng, 10000, 99999);
      let payload: Record<string, any>;

      if (eventType.startsWith("patient")) {
        payload = { id: resourceId, first_name: "Seed", last_name: `Patient_${i}`, updated_at: new Date(receivedAt).toISOString() };
      } else if (eventType.startsWith("appointment")) {
        payload = { id: resourceId, patient_id: randInt(rng, 10000, 99999), start_time: new Date(receivedAt + 2 * DAY).toISOString(), status: eventType.includes("cancelled") ? "cancelled" : "confirmed" };
      } else if (eventType.startsWith("payment")) {
        payload = { id: resourceId, patient_id: randInt(rng, 10000, 99999), amount: randInt(rng, 50, 2000) };
      } else if (eventType.startsWith("insurance")) {
        payload = { id: resourceId, patient_id: randInt(rng, 10000, 99999), plan_name: pick(rng, PAYERS).name };
      } else {
        payload = { id: resourceId, patient_id: randInt(rng, 10000, 99999), amount: randInt(rng, 25, 1500) };
      }

      const whData: any = {
        orgId,
        eventType,
        eventId: `evt_seed_${i}`,
        payload: JSON.stringify(payload),
        status: whStatus,
        receivedAt,
      };

      if (whStatus === "processed") {
        whData.processedAt = receivedAt + randInt(rng, 100, 5000); // 100ms to 5s processing
      }
      if (whStatus === "failed") {
        whData.error = pick(rng, [
          "Patient not found in local database",
          "Invalid event payload — missing required fields",
          "Database write conflict — retry scheduled",
        ]);
      }

      await ctx.db.insert("webhookEvents", whData);
    }
    counts.webhookEvents = 20;

    // =======================================================================
    // ENRICHMENTS — add records to V1-seeded tables
    // =======================================================================

    // -----------------------------------------------------------------------
    // Notifications +20
    // -----------------------------------------------------------------------
    const NOTIFICATION_TEMPLATES = [
      { type: "warning" as const, title: "SLA At Risk", msg: "Denial SLA deadline approaching — 2 hours remaining" },
      { type: "error" as const, title: "SLA Breached", msg: "Task has exceeded its SLA deadline. Escalation triggered." },
      { type: "info" as const, title: "Sync Complete", msg: "NexHealth incremental sync completed — records updated" },
      { type: "success" as const, title: "Claim Paid", msg: "Claim paid — payment received" },
      { type: "action_required" as const, title: "AI Action Pending", msg: "Review AI-generated appeal letter for denial" },
      { type: "info" as const, title: "New Review", msg: "New Google review received. Response pending." },
      { type: "warning" as const, title: "Balance Alert", msg: "Patient balance exceeds $500 — collection sequence recommended" },
      { type: "success" as const, title: "Appeal Won", msg: "Appeal approved — payment expected" },
      { type: "action_required" as const, title: "Review Response Ready", msg: "AI draft response ready for review. Please approve or edit." },
      { type: "info" as const, title: "Batch Eligibility", msg: "Morning batch eligibility check complete" },
    ];

    if (users.length > 0) {
      for (let i = 0; i < 20; i++) {
        const template = NOTIFICATION_TEMPLATES[i % NOTIFICATION_TEMPLATES.length];
        const userId = pick(rng, users)._id;
        const createdDaysAgo = randInt(rng, 0, 14);
        const createdAt = now - createdDaysAgo * DAY - randInt(rng, 0, 12) * HOUR;
        const isRead = rng() > 0.4;

        // Link to real resources
        let resourceType: string | undefined;
        let resourceId: string | undefined;

        if (template.type === "warning" || template.type === "error") {
          if (denials.length > 0) {
            resourceType = "denial";
            resourceId = String(pick(rng, denials)._id);
          }
        } else if (template.title.includes("Claim")) {
          if (claims.length > 0) {
            resourceType = "claim";
            resourceId = String(pick(rng, claims)._id);
          }
        } else if (template.title.includes("Patient") || template.title.includes("Balance")) {
          resourceType = "patient";
          resourceId = String(pick(rng, patients)._id);
        }

        await ctx.db.insert("notifications", {
          orgId,
          userId,
          title: template.title,
          message: template.msg,
          type: template.type,
          resourceType,
          resourceId,
          isRead,
          readAt: isRead ? createdAt + randInt(rng, 1, 24) * HOUR : undefined,
          createdAt,
        });
      }
    }
    counts.notificationsV2 = 20;

    // -----------------------------------------------------------------------
    // Tasks +10
    // -----------------------------------------------------------------------
    const v2TaskDefs = [
      { title: "Process insurance payment posting", resourceType: "claim" as const, role: "billing" as const, priority: "medium" as const },
      { title: "Verify pre-auth for scheduled crown", resourceType: "patient" as const, role: "billing" as const, priority: "high" as const },
      { title: "Contact patient for payment plan setup", resourceType: "payment" as const, role: "front_desk" as const, priority: "medium" as const },
      { title: "Review batch eligibility failures", resourceType: "eligibility" as const, role: "billing" as const, priority: "high" as const },
      { title: "Reconcile unmatched ERA payments", resourceType: "claim" as const, role: "billing" as const, priority: "urgent" as const },
      { title: "Update patient address from returned mail", resourceType: "patient" as const, role: "front_desk" as const, priority: "low" as const },
      { title: "Follow up on stale recall outreach", resourceType: "recall" as const, role: "front_desk" as const, priority: "medium" as const },
      { title: "Review AI denial categorization override", resourceType: "denial" as const, role: "billing" as const, priority: "high" as const },
      { title: "Schedule production meeting with Dr. Johnson", resourceType: "general" as const, role: "office_manager" as const, priority: "low" as const },
      { title: "Audit card-on-file consent expirations", resourceType: "payment" as const, role: "front_desk" as const, priority: "medium" as const },
    ];

    for (let i = 0; i < 10; i++) {
      const def = v2TaskDefs[i];
      const createdDaysAgo = randInt(rng, 0, 10);
      const createdAt = now - createdDaysAgo * DAY;
      const slaHours = def.priority === "urgent" ? 2 : def.priority === "high" ? 4 : def.priority === "medium" ? 8 : 24;
      const slaDeadline = createdAt + slaHours * HOUR;
      const slaStatus = slaDeadline < now ? "overdue" as const
        : slaDeadline < now + 2 * HOUR ? "at_risk" as const
        : "on_track" as const;

      let resourceId: string | undefined;
      if (def.resourceType === "claim" && claims.length > 0) {
        resourceId = String(pick(rng, claims)._id);
      } else if (def.resourceType === "denial" && denials.length > 0) {
        resourceId = String(pick(rng, denials)._id);
      } else if (def.resourceType === "patient") {
        resourceId = String(pick(rng, patients)._id);
      }

      // Build workPacket
      const workPacket = JSON.stringify({
        action: def.title,
        context: `Auto-generated V2 seed task #${i + 1}`,
        resourceType: def.resourceType,
        resourceId,
        instructions: `Please ${def.title.toLowerCase()} and update the status when complete.`,
      });

      await ctx.db.insert("tasks", {
        orgId,
        title: def.title,
        description: `V2 seed task: ${def.title}. Assigned to ${def.role} team.`,
        resourceType: def.resourceType,
        resourceId,
        assignedRole: def.role,
        priority: def.priority,
        status: pick(rng, ["open", "open", "in_progress"]) as "open" | "in_progress",
        slaDeadline,
        slaStatus,
        isHitlFallback: false,
        workPacket,
        dedupeKey: `v2_task_${i}`,
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      });
    }
    counts.tasksV2 = 10;

    // -----------------------------------------------------------------------
    // Payments +10 (card_on_file, payment_plan, insurance types)
    // -----------------------------------------------------------------------
    const v2PayTypes: Array<"card_on_file" | "payment_plan" | "insurance"> = [
      "card_on_file", "card_on_file", "card_on_file", "card_on_file", "card_on_file",
      "payment_plan", "payment_plan", "payment_plan",
      "insurance", "insurance",
    ];

    for (let i = 0; i < 10; i++) {
      const patient = pick(rng, patients) as any;
      const payType = v2PayTypes[i];
      const amount = randInt(rng, 25, 1500);
      const createdDaysAgo = randInt(rng, 0, 45);
      const createdAt = now - createdDaysAgo * DAY;
      const payStatus = pick(rng, ["completed", "completed", "completed", "pending", "failed"]) as "completed" | "pending" | "failed";

      const payData: any = {
        orgId,
        patientId: patient._id,
        amount,
        type: payType,
        method: payType === "insurance" ? "insurance" as const : "card" as const,
        status: payStatus,
        createdAt,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
      };

      if (payStatus === "completed") {
        payData.paidAt = createdAt + randInt(rng, 0, 48) * HOUR;
      }
      if (payStatus === "failed") {
        payData.failedReason = pick(rng, [
          "Card declined — insufficient funds",
          "Card expired",
          "Payment method removed by patient",
        ]);
      }
      if (payType === "card_on_file") {
        payData.stripePaymentIntentId = `pi_cof_seed_${i}`;
      }
      if (payType === "insurance") {
        payData.notes = `Insurance payment from ${pick(rng, PAYERS).name}`;
      }
      if (claims.length > 0 && rng() > 0.5) {
        payData.claimId = pick(rng, claims)._id;
      }

      await ctx.db.insert("payments", payData);
    }
    counts.paymentsV2 = 10;

    // -----------------------------------------------------------------------
    // AI Actions +20 (with input field populated)
    // -----------------------------------------------------------------------
    const v2AiTypes: Array<"denial_categorization" | "appeal_letter" | "review_response" | "satisfaction_prediction" | "patient_suggest" | "cost_estimate" | "payer_alert" | "ar_prioritization"> = [
      "denial_categorization", "denial_categorization", "denial_categorization",
      "appeal_letter", "appeal_letter",
      "review_response", "review_response", "review_response",
      "satisfaction_prediction", "satisfaction_prediction",
      "patient_suggest", "patient_suggest",
      "cost_estimate", "cost_estimate", "cost_estimate",
      "payer_alert", "payer_alert",
      "ar_prioritization", "ar_prioritization", "ar_prioritization",
    ];

    const aiResourceTypes: Record<string, string> = {
      denial_categorization: "denial",
      appeal_letter: "denial",
      review_response: "review",
      satisfaction_prediction: "patient",
      patient_suggest: "appointment",
      cost_estimate: "claim",
      payer_alert: "payer",
      ar_prioritization: "claim",
    };

    const aiInputTemplates: Record<string, string[]> = {
      denial_categorization: [
        '{"denialCode":"CO-4","claimAmount":1250,"payerName":"Delta Dental","procedureCodes":["D2740"]}',
        '{"denialCode":"CO-50","claimAmount":890,"payerName":"Cigna Dental","procedureCodes":["D3330","D2950"]}',
        '{"denialCode":"CO-29","claimAmount":475,"payerName":"MetLife Dental","procedureCodes":["D7240"]}',
      ],
      appeal_letter: [
        '{"denialReason":"Pre-authorization not obtained","procedure":"D2740 Crown","patientAge":45,"clinicalNotes":"Tooth #14 fractured cusp, non-restorable with filling"}',
        '{"denialReason":"Not medically necessary","procedure":"D3330 Root Canal Molar","patientAge":62,"clinicalNotes":"Periapical abscess confirmed on PA radiograph"}',
      ],
      review_response: [
        '{"rating":1,"reviewText":"Waited over 45 minutes","sentiment":"negative","keywords":["wait time","rushed"]}',
        '{"rating":5,"reviewText":"Excellent care from Dr. Johnson","sentiment":"positive","keywords":["excellent","gentle"]}',
        '{"rating":2,"reviewText":"Billing issues after visit","sentiment":"negative","keywords":["billing","overcharge"]}',
      ],
      satisfaction_prediction: [
        '{"appointmentType":"prophylaxis","waitTimeMinutes":5,"providerRating":4.8,"isNewPatient":false}',
        '{"appointmentType":"crown_prep","waitTimeMinutes":22,"providerRating":4.2,"isNewPatient":true}',
      ],
      patient_suggest: [
        '{"slotTime":"08:00","slotDuration":60,"slotType":"hygiene","dayOfWeek":"Monday"}',
        '{"slotTime":"14:30","slotDuration":90,"slotType":"restorative","dayOfWeek":"Wednesday"}',
      ],
      cost_estimate: [
        '{"procedures":["D2740","D2950"],"insurancePlan":"Delta PPO","deductibleRemaining":25,"annualRemaining":1150}',
        '{"procedures":["D3330"],"insurancePlan":"Cigna DPPO","deductibleRemaining":0,"annualRemaining":800}',
        '{"procedures":["D0120","D1110","D0274"],"insurancePlan":"BCBS Dental","deductibleRemaining":50,"annualRemaining":1500}',
      ],
      payer_alert: [
        '{"payerName":"Delta Dental","metric":"denial_rate","currentValue":0.18,"previousValue":0.12,"period":"30_days"}',
        '{"payerName":"Cigna Dental","metric":"processing_time_days","currentValue":28,"previousValue":18,"period":"30_days"}',
      ],
      ar_prioritization: [
        '{"claimAmount":2450,"ageDays":45,"payerHistory":"slow_reliable","appealDeadlineDays":15}',
        '{"claimAmount":52,"ageDays":20,"payerHistory":"fast_autopay","appealDeadlineDays":60}',
        '{"claimAmount":1175,"ageDays":62,"payerHistory":"high_denial","appealDeadlineDays":8}',
      ],
    };

    for (let i = 0; i < 20; i++) {
      const actionType = v2AiTypes[i];
      const resourceType = aiResourceTypes[actionType];
      const createdDaysAgo = randInt(rng, 0, 21);
      const createdAt = now - createdDaysAgo * DAY;
      const confidence = randFloat(rng, 0.55, 0.98);
      const aiStatus = pick(rng, ["pending", "pending", "completed", "approved", "rejected"]) as "pending" | "completed" | "approved" | "rejected";

      let resourceId: string;
      if (resourceType === "denial" && denials.length > 0) {
        resourceId = String(pick(rng, denials)._id);
      } else if (resourceType === "review" && reviews.length > 0) {
        resourceId = String(pick(rng, reviews)._id);
      } else if (resourceType === "claim" && claims.length > 0) {
        resourceId = String(pick(rng, claims)._id);
      } else if (resourceType === "patient") {
        resourceId = String(pick(rng, patients)._id);
      } else if (resourceType === "payer") {
        resourceId = pick(rng, PAYERS).id;
      } else {
        resourceId = `v2_resource_${i}`;
      }

      const inputs = aiInputTemplates[actionType] || [];
      const input = inputs.length > 0 ? pick(rng, inputs) : undefined;

      const aiData: any = {
        orgId,
        actionType,
        resourceType,
        resourceId,
        input,
        confidence,
        explanation: `V2 AI analysis for ${actionType} — ${Math.round(confidence * 100)}% confidence.`,
        executionTimeMs: randInt(rng, 500, 12000),
        status: aiStatus,
        createdAt,
        updatedAt: now - randInt(rng, 0, 5) * DAY,
      };

      if (aiStatus === "completed" || aiStatus === "approved" || aiStatus === "rejected") {
        aiData.output = `AI output for ${actionType} action — V2 enrichment #${i + 1}`;
      }
      if (aiStatus === "approved" && users.length > 0) {
        aiData.approvedBy = pick(rng, users)._id;
        aiData.approvedAt = createdAt + randInt(rng, 1, 48) * HOUR;
      }
      if (aiStatus === "rejected" && users.length > 0) {
        aiData.rejectedBy = pick(rng, users)._id;
        aiData.rejectedAt = createdAt + randInt(rng, 1, 24) * HOUR;
        aiData.rejectionReason = pick(rng, [
          "Incorrect categorization — manual review needed",
          "Confidence too low for automated action",
          "Override: staff disagrees with AI recommendation",
        ]);
      }

      await ctx.db.insert("aiActions", aiData);
    }
    counts.aiActionsV2 = 20;

    // -----------------------------------------------------------------------
    // Reviews +10 (with GUARANTEED matchedPatientId)
    // -----------------------------------------------------------------------
    const v2ReviewTexts = [
      "The team here is wonderful. From the front desk to the hygienist, everyone was professional and kind.",
      "Had a dental implant procedure and the results are amazing. Dr. {provider} is truly skilled.",
      "First visit and I'm very impressed. Modern office, friendly staff, quick appointment. Will definitely return.",
      "My family has been coming here for 3 years. Consistently excellent care for adults and kids alike.",
      "The night guard they made for me fits perfectly. Great attention to detail.",
      "Very thorough cleaning and exam. They found an issue my previous dentist missed. Thank you!",
      "Office is always clean, wait times are minimal, and the staff remembers your name. Love it.",
      "Disappointed with the long wait today. Usually great but today was off. Still like the practice overall.",
      "Emergency visit for a broken tooth — they fit me in same day. Excellent urgent care.",
      "Billing department could be more transparent about costs upfront, but the dental care itself is top-notch.",
    ];
    const v2Ratings = [5, 5, 5, 5, 4, 4, 4, 3, 5, 4];

    for (let i = 0; i < 10; i++) {
      const rating = v2Ratings[i];
      const publishedDaysAgo = randInt(rng, 1, 45);
      const publishedAt = now - publishedDaysAgo * DAY;
      const providerNames2 = providers.map((p: any) => `${p.firstName} ${p.lastName}`);
      const providerName = providerNames2.length > 0 ? pick(rng, providerNames2) : "Smith";
      const text = v2ReviewTexts[i].replace("{provider}", providerName);

      const sentiment = rating >= 4 ? "positive" as const : rating === 3 ? "neutral" as const : "negative" as const;
      const sentimentKeywords = rating >= 4
        ? pickFromList(rng, ["professional", "skilled", "impressed", "excellent", "friendly", "thorough", "clean", "quick"], 3)
        : pickFromList(rng, ["wait", "billing", "disappointed", "transparent"], 2);

      // GUARANTEED matchedPatientId
      const matchedPatient = pick(rng, patients) as any;

      await ctx.db.insert("reviews", {
        orgId,
        practiceId,
        source: "google" as const,
        externalReviewId: `google_review_v2_${i + 1}`,
        reviewerName: `${pick(rng, ["A", "B", "C", "D", "E", "J", "K", "L", "M", "R"])}. ${pick(rng, ["Wilson", "Taylor", "Thomas", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young"])}`,
        matchedPatientId: matchedPatient._id,
        rating,
        text,
        publishedAt,
        sentiment,
        sentimentKeywords,
        responseStatus: pick(rng, ["pending", "draft_ready", "posted"]) as "pending" | "draft_ready" | "posted",
        isPriority: rating <= 2,
        createdAt: publishedAt,
        updatedAt: now - randInt(rng, 0, 5) * DAY,
      });
    }
    counts.reviewsV2 = 10;

    // -----------------------------------------------------------------------
    // Final return
    // -----------------------------------------------------------------------
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return {
      seeded: true,
      totalRecords: total,
      counts,
    };
  },
});
