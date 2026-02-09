import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// seedAllMockData — Populates empty Convex tables with realistic dental data
// References real NexHealth-synced patients, providers, practices, etc.
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
  { code: "D0120", desc: "Periodic oral evaluation", fee: 52 },
  { code: "D0150", desc: "Comprehensive oral evaluation", fee: 89 },
  { code: "D0210", desc: "Intraoral complete series", fee: 145 },
  { code: "D0274", desc: "Bitewings - four radiographic images", fee: 68 },
  { code: "D0330", desc: "Panoramic radiographic image", fee: 125 },
  { code: "D1110", desc: "Prophylaxis - adult", fee: 105 },
  { code: "D1120", desc: "Prophylaxis - child", fee: 75 },
  { code: "D1206", desc: "Topical application of fluoride varnish", fee: 38 },
  { code: "D1351", desc: "Sealant - per tooth", fee: 48 },
  { code: "D2140", desc: "Amalgam - one surface, primary", fee: 175 },
  { code: "D2150", desc: "Amalgam - two surfaces, primary", fee: 215 },
  { code: "D2330", desc: "Resin composite - one surface, anterior", fee: 195 },
  { code: "D2331", desc: "Resin composite - two surfaces, anterior", fee: 245 },
  { code: "D2391", desc: "Resin composite - one surface, posterior", fee: 210 },
  { code: "D2740", desc: "Crown - porcelain/ceramic substrate", fee: 1250 },
  { code: "D2750", desc: "Crown - porcelain fused to high noble metal", fee: 1175 },
  { code: "D2950", desc: "Core buildup, including any pins", fee: 295 },
  { code: "D3310", desc: "Root canal - anterior tooth", fee: 780 },
  { code: "D3320", desc: "Root canal - premolar tooth", fee: 920 },
  { code: "D3330", desc: "Root canal - molar tooth", fee: 1150 },
  { code: "D4341", desc: "Periodontal scaling and root planing - per quadrant", fee: 275 },
  { code: "D4342", desc: "Periodontal scaling - 1-3 teeth per quadrant", fee: 195 },
  { code: "D4910", desc: "Periodontal maintenance", fee: 155 },
  { code: "D5110", desc: "Complete denture - maxillary", fee: 1850 },
  { code: "D6010", desc: "Surgical placement - endosteal implant", fee: 2450 },
  { code: "D6058", desc: "Abutment supported porcelain/ceramic crown", fee: 1375 },
  { code: "D7140", desc: "Extraction, erupted tooth", fee: 195 },
  { code: "D7210", desc: "Extraction, surgical", fee: 350 },
  { code: "D7240", desc: "Extraction, impacted tooth - completely bony", fee: 475 },
  { code: "D9110", desc: "Palliative treatment of dental pain", fee: 125 },
  { code: "D9230", desc: "Inhalation of nitrous oxide", fee: 65 },
];

const DENIAL_REASON_CODES: Record<string, { desc: string; category: "eligibility" | "coding" | "documentation" | "authorization" | "timely_filing" | "duplicate" }> = {
  "CO-4": { desc: "Procedure code inconsistent with modifier or missing modifier", category: "coding" },
  "CO-16": { desc: "Claim/service lacks information needed for adjudication", category: "documentation" },
  "CO-18": { desc: "Duplicate claim/service", category: "duplicate" },
  "CO-22": { desc: "Care may be covered by another payer", category: "eligibility" },
  "CO-27": { desc: "Expenses incurred after coverage terminated", category: "eligibility" },
  "CO-29": { desc: "Time limit for filing has expired", category: "timely_filing" },
  "CO-50": { desc: "Non-covered service because not deemed medically necessary", category: "documentation" },
  "CO-97": { desc: "Benefit included in payment of another service", category: "coding" },
  "PR-1": { desc: "Deductible amount", category: "eligibility" },
  "PR-2": { desc: "Coinsurance amount", category: "eligibility" },
  "CO-197": { desc: "Precertification/authorization/notification absent", category: "authorization" },
  "CO-252": { desc: "Service not covered in patient benefit plan", category: "eligibility" },
};

const REVIEW_TEXTS_POSITIVE = [
  "Dr. {provider} was incredibly thorough and gentle during my cleaning. The staff was friendly and efficient. Highly recommend!",
  "I've been coming here for years and the care has always been excellent. {provider} explained everything clearly.",
  "Amazing experience from check-in to checkout. The office is clean and modern. My whole family comes here.",
  "Had a crown procedure with Dr. {provider} — completely painless. The team made me feel very comfortable.",
  "Best dental office I've ever been to. The hygienist was thorough and the front desk staff is always so helpful.",
  "Very professional and caring team. Dr. {provider} took time to answer all my questions about my treatment plan.",
  "I'm usually nervous at the dentist but the whole team here puts me at ease. Great experience every time.",
  "My kids love coming here. The staff is patient and kind. Dr. {provider} is wonderful with children.",
  "Excellent work on my veneers. The results exceeded my expectations. Thank you, Dr. {provider}!",
  "Quick and easy appointment for my six-month checkup. No waiting, friendly staff, great care.",
];

const REVIEW_TEXTS_NEGATIVE = [
  "Waited over 45 minutes past my appointment time. When I finally saw the dentist, the visit felt rushed.",
  "Billing issues after my last visit. Was charged for services my insurance should have covered. Still trying to resolve.",
  "The front desk staff was rude and unhelpful when I called to reschedule. Very disappointing experience.",
  "My filling fell out after just two weeks. Had to come back and wait again. Not happy with the quality.",
  "They recommended expensive procedures that my previous dentist said weren't necessary. Lost my trust.",
];

const REVIEW_TEXTS_NEUTRAL = [
  "Decent dental office. Nothing special but gets the job done. Wait times could be better.",
  "The office is okay. Staff is friendly enough. Wish they had more evening appointment availability.",
  "Average experience. The cleaning was fine but the office could use some updating.",
];

const AI_EXPLANATIONS: Record<string, string[]> = {
  denial_categorization: [
    "Classified as coding error based on modifier mismatch pattern. Historical accuracy for this payer: 94%.",
    "Categorized as eligibility issue — patient coverage terminated prior to service date.",
    "Identified as documentation deficiency. Missing narrative for medical necessity.",
    "Classified as authorization required — this payer requires pre-auth for code D2740.",
  ],
  appeal_letter: [
    "Generated appeal citing ADA guidelines for medical necessity. Template: documentation-based appeal.",
    "Draft letter references patient's treatment history and clinical notes supporting the procedure.",
    "Appeal addresses timely filing exception with evidence of prior submission attempts.",
  ],
  review_response: [
    "Generated empathetic response acknowledging wait time concern. Tone: professional and apologetic.",
    "Drafted thank-you response highlighting commitment to patient care. Tone: warm and grateful.",
    "Response addresses billing concern with invitation to contact office manager directly.",
  ],
  satisfaction_prediction: [
    "Score based on: appointment type (preventive), wait time (minimal), provider rating (4.8), treatment complexity (low).",
    "Lower score predicted due to: extended wait time, complex procedure, new patient status.",
    "High score predicted: returning patient, preferred provider match, no billing issues in history.",
  ],
  patient_suggest: [
    "Top candidate based on: overdue for hygiene (8 months), high lifetime value, flexible schedule preference.",
    "Recommended for quick fill: ASAP list member, lives within 10 min of office, morning availability.",
  ],
  cost_estimate: [
    "Estimate calculated using fee schedule F-2024, insurance coverage at 80% basic, deductible met.",
    "Patient portion estimated after applying annual maximum remaining of $850.",
  ],
  payer_alert: [
    "Delta Dental showing 15% increase in denial rate over past 30 days. Pattern: documentation requirements tightened.",
    "Cigna processing times increased to avg 28 days (was 18). Recommend earlier submission.",
  ],
  ar_prioritization: [
    "Prioritized based on: amount ($2,450), age (45 days), payer history (slow but reliable), appeal deadline approaching.",
    "Low priority: small amount ($52), payer has 98% auto-pay rate, within normal processing window.",
  ],
};

const TASK_TITLES: Record<string, string[]> = {
  claim: [
    "Review claim scrub failure — missing tooth number",
    "Resubmit rejected claim with corrected modifier",
    "Follow up on claim older than 30 days",
    "Verify COB for dual-coverage patient claim",
  ],
  denial: [
    "Prepare appeal for authorization denial",
    "Acknowledge new denial within SLA",
    "Escalate timely filing denial to supervisor",
  ],
  payment: [
    "Process patient refund — overpayment on account",
    "Follow up on failed text-to-pay link",
  ],
  patient: [
    "Update patient insurance information",
    "Verify patient eligibility before scheduled procedure",
  ],
  recall: [
    "Contact overdue hygiene patients — 3rd attempt",
  ],
};

const NOTIFICATION_TEMPLATES = [
  { type: "warning" as const, title: "SLA At Risk", msg: "Denial #{id} SLA deadline approaching — 2 hours remaining" },
  { type: "error" as const, title: "SLA Breached", msg: "Task #{id} has exceeded its SLA deadline. Escalation triggered." },
  { type: "info" as const, title: "Sync Complete", msg: "NexHealth incremental sync completed — {n} records updated" },
  { type: "success" as const, title: "Claim Paid", msg: "Claim #{id} paid by {payer} — ${amt} received" },
  { type: "action_required" as const, title: "AI Action Pending", msg: "Review AI-generated appeal letter for denial #{id}" },
  { type: "info" as const, title: "New Review", msg: "New {rating}-star Google review received. Response pending." },
  { type: "warning" as const, title: "Balance Alert", msg: "Patient {name} balance exceeds $500 — collection sequence recommended" },
  { type: "success" as const, title: "Appeal Won", msg: "Appeal for claim #{id} approved — ${amt} payment expected" },
  { type: "action_required" as const, title: "Review Response Ready", msg: "AI draft response ready for review #{id}. Please approve or edit." },
  { type: "info" as const, title: "Batch Eligibility", msg: "Morning batch eligibility check complete — {n} of {total} verified" },
];

const RESPONSE_DRAFTS = [
  "Thank you so much for your kind words! We're thrilled to hear about your positive experience with our team. We look forward to seeing you at your next visit!",
  "We appreciate you taking the time to share your experience. Our team works hard to provide excellent care, and your feedback means a lot to us.",
  "Thank you for the wonderful review! Dr. {provider} and our entire team are dedicated to making every visit comfortable and thorough.",
  "We're so glad you had a great experience. Patient comfort and clear communication are our top priorities. See you next time!",
  "Thank you for your feedback. We sincerely apologize for the wait time you experienced. We are reviewing our scheduling process to prevent this in the future. Please don't hesitate to contact our office manager at (555) 234-5678 if there's anything we can do.",
  "We're sorry to hear about the billing concern. We take these matters seriously and would like to resolve this promptly. Please call our billing department at (555) 234-5679 so we can review your account.",
  "We value your feedback and apologize for the experience. We strive to provide the highest standard of care and would appreciate the opportunity to discuss this further.",
  "Thank you for bringing this to our attention. Patient satisfaction is our priority, and we'd like to make this right. Please contact us directly so we can address your concerns.",
];

// ============================================================================
// Main seed mutation
// ============================================================================

export const seedAllMockData = internalMutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = args;
    const rng = mulberry32(20260208); // deterministic seed
    const now = Date.now();
    const DAY = 86400000;
    const HOUR = 3600000;

    // -----------------------------------------------------------------------
    // Idempotency check
    // -----------------------------------------------------------------------
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();
    if (existingUser) {
      return { skipped: true, reason: "Already seeded" };
    }

    // -----------------------------------------------------------------------
    // Query real NexHealth-synced data
    // -----------------------------------------------------------------------
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .take(50);

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
      .take(30);

    if (patients.length === 0) {
      return { skipped: true, reason: "No patients found — run NexHealth sync first" };
    }

    const practiceId = practices[0]?._id;
    if (!practiceId) {
      return { skipped: true, reason: "No practice found — run NexHealth sync first" };
    }

    // Helper to pick a payer — prefer from insurancePlans if available
    const pickPayer = () => {
      if (insurancePlans.length > 0) {
        const plan = pick(rng, insurancePlans) as any;
        return { id: plan.payerId || pick(rng, PAYERS).id, name: plan.payerName || plan.name || pick(rng, PAYERS).name };
      }
      return pick(rng, PAYERS);
    };

    const counts: Record<string, number> = {};

    // -----------------------------------------------------------------------
    // 1. USERS (8 records)
    // -----------------------------------------------------------------------
    const userDefs = [
      { first: "Sarah", last: "Mitchell", role: "admin" as const, email: "sarah.mitchell@canopydental.com" },
      { first: "Karen", last: "Brooks", role: "office_manager" as const, email: "karen.brooks@canopydental.com" },
      { first: "Jessica", last: "Alvarez", role: "billing" as const, email: "jessica.alvarez@canopydental.com" },
      { first: "Michael", last: "Torres", role: "billing" as const, email: "michael.torres@canopydental.com" },
      { first: "Amanda", last: "Chen", role: "clinical" as const, email: "amanda.chen@canopydental.com" },
      { first: "Taylor", last: "Reed", role: "front_desk" as const, email: "taylor.reed@canopydental.com" },
      { first: "Jordan", last: "Patel", role: "front_desk" as const, email: "jordan.patel@canopydental.com" },
      { first: "David", last: "Kim", role: "provider" as const, email: "david.kim@canopydental.com" },
    ];

    const userIds: any[] = [];
    for (let i = 0; i < userDefs.length; i++) {
      const u = userDefs[i];
      const id = await ctx.db.insert("users", {
        orgId,
        clerkUserId: `clerk_seed_${String(i + 1).padStart(3, "0")}`,
        email: u.email,
        firstName: u.first,
        lastName: u.last,
        role: u.role,
        practiceId,
        isActive: true,
        lastLoginAt: now - randInt(rng, 0, 7) * DAY,
        createdAt: now - 90 * DAY,
        updatedAt: now - randInt(rng, 0, 7) * DAY,
      });
      userIds.push(id);
    }
    counts.users = userIds.length;

    // Helper references
    const billingUserIds = [userIds[2], userIds[3]]; // Jessica, Michael
    const frontDeskUserIds = [userIds[5], userIds[6]]; // Taylor, Jordan
    const allStaffIds = userIds;
    const providerNames = providers.map((p: any) => `${p.firstName} ${p.lastName}`);

    // -----------------------------------------------------------------------
    // 2. CLAIMS (20 records)
    // -----------------------------------------------------------------------
    const claimStatuses: Array<"draft" | "scrubbing" | "ready" | "submitted" | "accepted" | "paid" | "denied"> = [
      "draft", "scrubbing", "ready", "submitted", "submitted",
      "accepted", "accepted", "paid", "paid", "paid",
      "paid", "paid", "denied", "denied", "denied",
      "denied", "submitted", "accepted", "paid", "ready",
    ];

    const claimIds: any[] = [];
    const deniedClaimIndices: number[] = [];

    for (let i = 0; i < 20; i++) {
      const patient = pick(rng, patients) as any;
      const payer = pickPayer();
      const status = claimStatuses[i];
      const procs = [];
      const numProcs = randInt(rng, 1, 4);
      let totalCharged = 0;

      for (let p = 0; p < numProcs; p++) {
        const proc = pick(rng, CDT_PROCEDURES);
        const fee = proc.fee + randInt(rng, -20, 30);
        totalCharged += fee;
        procs.push({
          code: proc.code,
          description: proc.desc,
          fee,
          tooth: proc.code.startsWith("D2") || proc.code.startsWith("D3") || proc.code.startsWith("D7")
            ? String(randInt(rng, 1, 32)) : undefined,
          surface: proc.code.startsWith("D2") ? pick(rng, ["M", "O", "D", "B", "L", "MO", "DO", "MOD"]) : undefined,
          quantity: 1,
        });
      }

      const createdDaysAgo = randInt(rng, 2, 90);
      const createdAt = now - createdDaysAgo * DAY;
      const ageInDays = createdDaysAgo;
      const ageBucket = ageInDays <= 30 ? "0-30" as const
        : ageInDays <= 60 ? "31-60" as const
        : ageInDays <= 90 ? "61-90" as const
        : "91-120" as const;

      const claimData: any = {
        orgId,
        practiceId,
        patientId: patient._id,
        payerId: payer.id,
        payerName: payer.name,
        claimNumber: `CLM-2026-${String(i + 1).padStart(4, "0")}`,
        status,
        procedures: procs,
        totalCharged,
        ageInDays,
        ageBucket,
        createdAt,
        updatedAt: now - randInt(rng, 0, 5) * DAY,
      };

      if (appointments.length > 0 && rng() > 0.3) {
        claimData.appointmentId = pick(rng, appointments)._id;
      }

      if (status === "submitted" || status === "accepted" || status === "paid" || status === "denied") {
        claimData.submittedAt = createdAt + DAY;
        claimData.submittedBy = pick(rng, billingUserIds);
        claimData.scrubPassedAt = createdAt + HOUR;
      }
      if (status === "accepted" || status === "paid") {
        claimData.acceptedAt = createdAt + 5 * DAY;
      }
      if (status === "paid") {
        claimData.totalPaid = Math.round(totalCharged * randFloat(rng, 0.6, 0.9));
        claimData.patientPortion = totalCharged - (claimData.totalPaid || 0);
        claimData.adjustments = Math.round(totalCharged * randFloat(rng, 0.02, 0.1));
        claimData.paidAt = createdAt + randInt(rng, 14, 45) * DAY;
      }
      if (status === "denied") {
        deniedClaimIndices.push(i);
      }

      const id = await ctx.db.insert("claims", claimData);
      claimIds.push(id);
    }
    counts.claims = claimIds.length;

    // -----------------------------------------------------------------------
    // 3. DENIALS (20 records — 4 linked to denied claims + 16 additional)
    // -----------------------------------------------------------------------
    const denialStatuses: Array<"new" | "acknowledged" | "appealing" | "appealed" | "won" | "lost" | "partial" | "written_off"> = [
      "new", "new", "new", "acknowledged", "acknowledged",
      "appealing", "appealing", "appealing", "appealed", "appealed",
      "won", "won", "won", "lost", "lost",
      "partial", "partial", "written_off", "new", "acknowledged",
    ];

    const denialIds: any[] = [];
    const reasonCodes = Object.keys(DENIAL_REASON_CODES);

    for (let i = 0; i < 20; i++) {
      const patient = pick(rng, patients) as any;
      const payer = pickPayer();
      const reasonKey = pick(rng, reasonCodes);
      const reason = DENIAL_REASON_CODES[reasonKey];
      const status = denialStatuses[i];
      const createdDaysAgo = randInt(rng, 1, 60);
      const createdAt = now - createdDaysAgo * DAY;

      // Link first 4 denials to actual denied claims, rest to random claims
      const claimIdx = i < deniedClaimIndices.length
        ? deniedClaimIndices[i]
        : randInt(rng, 0, claimIds.length - 1);

      const denialData: any = {
        orgId,
        claimId: claimIds[claimIdx],
        patientId: patient._id,
        payerId: payer.id,
        payerName: payer.name,
        denialDate: new Date(createdAt).toISOString().split("T")[0],
        reasonCode: reasonKey,
        reasonDescription: reason.desc,
        category: reason.category,
        amount: randInt(rng, 50, 2500),
        status,
        aiCategorization: reason.category,
        aiConfidence: randFloat(rng, 0.72, 0.98),
        slaDeadline: createdAt + 24 * HOUR,
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      };

      if (status !== "new") {
        denialData.acknowledgedAt = createdAt + randInt(rng, 1, 8) * HOUR;
        denialData.assignedTo = pick(rng, billingUserIds);
      }
      if (status === "appealing" || status === "appealed" || status === "won" || status === "lost" || status === "partial") {
        denialData.isEscalated = rng() > 0.7;
        if (denialData.isEscalated) {
          denialData.escalatedAt = createdAt + 20 * HOUR;
        }
      }

      const id = await ctx.db.insert("denials", denialData);
      denialIds.push(id);
    }
    counts.denials = denialIds.length;

    // -----------------------------------------------------------------------
    // 4. APPEALS (10 records)
    // -----------------------------------------------------------------------
    const appealStatuses: Array<"draft" | "reviewed" | "submitted" | "won" | "lost" | "partial"> = [
      "draft", "draft", "reviewed", "reviewed", "submitted",
      "submitted", "won", "won", "lost", "partial",
    ];

    const appealIds: any[] = [];
    // Use denials that are appealing/appealed/won/lost/partial
    const appealableDenialIndices = denialStatuses
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => ["appealing", "appealed", "won", "lost", "partial"].includes(s))
      .map(({ idx }) => idx);

    for (let i = 0; i < 10; i++) {
      const denialIdx = i < appealableDenialIndices.length
        ? appealableDenialIndices[i]
        : randInt(rng, 0, denialIds.length - 1);
      const status = appealStatuses[i];
      const createdDaysAgo = randInt(rng, 1, 30);
      const createdAt = now - createdDaysAgo * DAY;

      // Get patient from denial's linked claim
      const patient = pick(rng, patients) as any;

      const appealData: any = {
        orgId,
        denialId: denialIds[denialIdx],
        claimId: claimIds[randInt(rng, 0, claimIds.length - 1)],
        patientId: patient._id,
        status,
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      };

      if (status !== "draft") {
        appealData.letterContent = `Dear Claims Review Department,\n\nWe are writing to appeal the denial of claim for patient ${patient.firstName} ${patient.lastName}. The procedure was medically necessary as documented in the clinical notes. We request reconsideration based on the attached documentation.\n\nSincerely,\nCanopy Dental Billing Department`;
        appealData.aiGeneratedAt = createdAt + 2 * HOUR;
        appealData.aiGenerationTimeMs = randInt(rng, 2500, 8000);
      }
      if (status === "reviewed" || status === "submitted" || status === "won" || status === "lost" || status === "partial") {
        appealData.editedBy = pick(rng, billingUserIds);
        appealData.editedAt = createdAt + 4 * HOUR;
      }
      if (status === "submitted" || status === "won" || status === "lost" || status === "partial") {
        appealData.submittedAt = createdAt + DAY;
        appealData.submittedBy = pick(rng, billingUserIds);
      }
      if (status === "won" || status === "partial") {
        appealData.outcomeAmount = randInt(rng, 200, 2000);
        appealData.outcomeDate = new Date(now - randInt(rng, 1, 10) * DAY).toISOString().split("T")[0];
        appealData.outcomeNotes = status === "won"
          ? "Full payment authorized upon review of supporting documentation."
          : "Partial payment approved. Remaining balance adjusted per payer policy.";
      }

      const id = await ctx.db.insert("appeals", appealData);
      appealIds.push(id);
    }
    counts.appeals = appealIds.length;

    // -----------------------------------------------------------------------
    // 5. ELIGIBILITY RESULTS (30 records)
    // -----------------------------------------------------------------------
    const eligStatuses: Array<"active" | "inactive" | "error" | "pending"> = [
      "active", "active", "active", "active", "active",
      "active", "active", "active", "active", "active",
      "active", "active", "active", "active", "active",
      "active", "active", "active", "active", "active",
      "active", "active", "inactive", "inactive", "inactive",
      "error", "error", "pending", "pending", "pending",
    ];

    for (let i = 0; i < 30; i++) {
      const patient = pick(rng, patients) as any;
      const payer = pickPayer();
      const status = eligStatuses[i];
      const verifiedDaysAgo = randInt(rng, 0, 14);
      const verifiedAt = now - verifiedDaysAgo * DAY;

      const eligData: any = {
        orgId,
        patientId: patient._id,
        payerId: payer.id,
        payerName: payer.name,
        verifiedAt,
        expiresAt: verifiedAt + DAY, // 24hr cache
        status,
        verifiedBy: rng() > 0.4 ? "batch" : "realtime",
        createdAt: verifiedAt,
      };

      if (appointments.length > 0 && rng() > 0.5) {
        eligData.appointmentId = pick(rng, appointments)._id;
      }

      if (status === "active") {
        const annualMax = pick(rng, [1000, 1500, 2000, 2500, 3000]);
        const annualUsed = randInt(rng, 0, annualMax);
        eligData.benefits = {
          annualMaximum: annualMax,
          annualUsed,
          annualRemaining: annualMax - annualUsed,
          deductible: pick(rng, [25, 50, 75, 100]),
          deductibleMet: pick(rng, [0, 25, 50, 75, 100]),
          preventiveCoverage: 100,
          basicCoverage: pick(rng, [70, 80]),
          majorCoverage: pick(rng, [40, 50, 60]),
          waitingPeriods: rng() > 0.7 ? ["Major: 12 months", "Basic: 6 months"] : [],
        };
        eligData.costEstimate = randInt(rng, 0, 500);
      }

      if (status === "error") {
        eligData.errorMessage = pick(rng, [
          "Payer system unavailable — timeout after 30s",
          "Invalid subscriber ID format for this payer",
          "Payer returned unexpected response format",
        ]);
      }

      await ctx.db.insert("eligibilityResults", eligData);
    }
    counts.eligibilityResults = 30;

    // -----------------------------------------------------------------------
    // 6. PAYMENTS — text-to-pay (15 records)
    // -----------------------------------------------------------------------
    const payStatuses: Array<"pending" | "processing" | "completed" | "failed"> = [
      "pending", "pending", "pending", "processing", "processing",
      "completed", "completed", "completed", "completed", "completed",
      "completed", "completed", "failed", "failed", "completed",
    ];

    for (let i = 0; i < 15; i++) {
      const patient = pick(rng, patients) as any;
      const status = payStatuses[i];
      const amount = pick(rng, [25, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 500]);
      const createdDaysAgo = randInt(rng, 0, 30);
      const createdAt = now - createdDaysAgo * DAY;

      const payData: any = {
        orgId,
        patientId: patient._id,
        amount,
        type: "text_to_pay" as const,
        method: status === "completed" ? "card" as const : undefined,
        status,
        stripePaymentIntentId: `pi_seed_${String(i + 1).padStart(3, "0")}`,
        stripePaymentLinkUrl: `https://pay.stripe.com/seed_${String(i + 1).padStart(3, "0")}`,
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      };

      if (status === "completed" || status === "processing") {
        payData.smsDeliveredAt = createdAt + 5000; // 5 seconds after creation
      }
      if (status === "completed") {
        payData.paidAt = createdAt + randInt(rng, 1, 48) * HOUR;
      }
      if (status === "failed") {
        payData.failedReason = pick(rng, [
          "Card declined — insufficient funds",
          "Card expired",
          "Payment link expired after 72 hours",
        ]);
      }

      // Link some to claims
      if (claimIds.length > 0 && rng() > 0.5) {
        payData.claimId = pick(rng, claimIds);
      }

      await ctx.db.insert("payments", payData);
    }
    counts.payments = 15;

    // -----------------------------------------------------------------------
    // 7. COLLECTION SEQUENCES (16 records)
    // -----------------------------------------------------------------------
    const collectionSteps = [0, 7, 14, 30, 60, 90];
    const collStatuses: Array<"active" | "paused" | "completed" | "paid"> = [
      "active", "active", "active", "active", "active",
      "active", "active", "active", "paused", "paused",
      "completed", "completed", "paid", "paid", "active", "active",
    ];

    for (let i = 0; i < 16; i++) {
      const patient = pick(rng, patients) as any;
      const status = collStatuses[i];
      const totalBalance = pick(rng, [75, 125, 200, 250, 350, 425, 500, 650, 800, 1200]);
      const currentStepIdx = randInt(rng, 0, collectionSteps.length - 1);
      const currentStep = collectionSteps[currentStepIdx];
      const startedDaysAgo = Math.max(currentStep + randInt(rng, 0, 10), 1);
      const startedAt = now - startedDaysAgo * DAY;

      const steps = collectionSteps.map((day, idx) => {
        const actions = [
          "Send friendly payment reminder (SMS)",
          "Send payment reminder with link (SMS)",
          "Send payment reminder with link (Email)",
          "Send formal past-due notice (Letter)",
          "Final notice — phone call required",
          "Send to external collections",
        ];
        let stepStatus: "pending" | "sent" | "completed" | "skipped" = "pending";
        if (idx < currentStepIdx) {
          stepStatus = rng() > 0.1 ? "sent" : "skipped";
        } else if (idx === currentStepIdx && status !== "active") {
          stepStatus = "completed";
        }

        return {
          day,
          action: actions[idx],
          status: stepStatus,
          sentAt: stepStatus === "sent" || stepStatus === "completed"
            ? startedAt + day * DAY
            : undefined,
          response: stepStatus === "sent" && rng() > 0.6
            ? pick(rng, ["No response", "Patient called — promised to pay", "Payment received partially", "Requested payment plan"])
            : undefined,
        };
      });

      await ctx.db.insert("collectionSequences", {
        orgId,
        patientId: patient._id,
        totalBalance,
        currentStep,
        status,
        steps,
        startedAt,
        lastActionAt: status !== "active" ? now - randInt(rng, 0, 5) * DAY : startedAt + currentStep * DAY,
        createdAt: startedAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      });
    }
    counts.collectionSequences = 16;

    // -----------------------------------------------------------------------
    // 8. REVIEWS (15 records)
    // -----------------------------------------------------------------------
    // Weighted ratings: mostly 4-5 stars
    const ratings = [5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 1, 5, 4];
    const reviewIds: any[] = [];

    for (let i = 0; i < 15; i++) {
      const rating = ratings[i];
      const publishedDaysAgo = randInt(rng, 1, 60);
      const publishedAt = now - publishedDaysAgo * DAY;
      const providerName = providerNames.length > 0 ? pick(rng, providerNames) : "Smith";

      let text: string;
      let sentiment: "positive" | "neutral" | "negative";
      let sentimentKeywords: string[];

      if (rating >= 4) {
        text = pick(rng, REVIEW_TEXTS_POSITIVE).replace("{provider}", providerName);
        sentiment = "positive";
        sentimentKeywords = pickFromList(rng, ["friendly", "professional", "thorough", "gentle", "comfortable", "clean", "modern", "excellent", "caring", "painless"], 3);
      } else if (rating === 3) {
        text = pick(rng, REVIEW_TEXTS_NEUTRAL);
        sentiment = "neutral";
        sentimentKeywords = pickFromList(rng, ["average", "okay", "decent", "wait time", "update needed"], 2);
      } else {
        text = pick(rng, REVIEW_TEXTS_NEGATIVE);
        sentiment = "negative";
        sentimentKeywords = pickFromList(rng, ["wait time", "billing issue", "rude", "rushed", "overcharging", "quality", "trust"], 3);
      }

      const responseStatusOptions: Array<"pending" | "draft_ready" | "approved" | "posted" | "skipped"> =
        rating <= 2
          ? ["pending", "draft_ready", "approved", "posted"]
          : ["pending", "draft_ready", "posted", "skipped"];

      const responseStatus = pick(rng, responseStatusOptions);

      const reviewData: any = {
        orgId,
        practiceId,
        source: "google" as const,
        externalReviewId: `google_review_seed_${i + 1}`,
        reviewerName: `${pick(rng, ["A", "B", "C", "D", "E", "J", "K", "L", "M", "R", "S", "T"])}. ${pick(rng, ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Anderson"])}`,
        rating,
        text,
        publishedAt,
        sentiment,
        sentimentKeywords,
        responseStatus,
        isPriority: rating <= 2,
        createdAt: publishedAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      };

      // Link some to patients
      if (rng() > 0.4 && patients.length > 0) {
        reviewData.matchedPatientId = pick(rng, patients)._id;
      }
      if (rating <= 2) {
        reviewData.alertSentAt = publishedAt + 5 * 60 * 1000; // 5 min after publish
      }

      const id = await ctx.db.insert("reviews", reviewData);
      reviewIds.push(id);
    }
    counts.reviews = reviewIds.length;

    // -----------------------------------------------------------------------
    // 9. REVIEW REQUESTS (25 records)
    // -----------------------------------------------------------------------
    const reqStatuses: Array<"scheduled" | "sent" | "clicked" | "completed" | "skipped" | "filtered"> = [
      "scheduled", "scheduled", "scheduled", "sent", "sent",
      "sent", "sent", "sent", "clicked", "clicked",
      "clicked", "completed", "completed", "completed", "completed",
      "completed", "skipped", "skipped", "filtered", "filtered",
      "sent", "sent", "clicked", "completed", "scheduled",
    ];

    for (let i = 0; i < 25; i++) {
      const patient = pick(rng, patients) as any;
      const status = reqStatuses[i];
      const createdDaysAgo = randInt(rng, 0, 45);
      const createdAt = now - createdDaysAgo * DAY;

      const reqData: any = {
        orgId,
        patientId: patient._id,
        triggerEvent: "checkout",
        scheduledFor: createdAt + pick(rng, [2, 4, 8, 12, 24]) * HOUR,
        status,
        aiSatisfactionScore: randFloat(rng, 0.45, 0.98),
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      };

      if (appointments.length > 0 && rng() > 0.3) {
        reqData.appointmentId = pick(rng, appointments)._id;
      }

      if (status === "sent" || status === "clicked" || status === "completed") {
        reqData.sentAt = reqData.scheduledFor + randInt(rng, 0, 30) * 60 * 1000;
        reqData.sentVia = rng() > 0.3 ? "sms" : "email";
      }

      if (status === "filtered") {
        reqData.filterReason = pick(rng, [
          "Low satisfaction score (< 0.6)",
          "Patient opted out of marketing communications",
          "Recent review request within 30 days",
          "FTC compliance: incentive detected in template",
        ]);
      }

      await ctx.db.insert("reviewRequests", reqData);
    }
    counts.reviewRequests = 25;

    // -----------------------------------------------------------------------
    // 10. REVIEW RESPONSES (15 records — linked to reviews)
    // -----------------------------------------------------------------------
    const respStatuses: Array<"draft" | "edited" | "approved" | "posted" | "rejected"> = [
      "draft", "draft", "draft", "edited", "edited",
      "approved", "approved", "approved", "posted", "posted",
      "posted", "posted", "rejected", "draft", "approved",
    ];

    for (let i = 0; i < 15; i++) {
      const reviewId = reviewIds[i % reviewIds.length];
      const status = respStatuses[i];
      const providerName = providerNames.length > 0 ? pick(rng, providerNames) : "our team";
      const createdAt = now - randInt(rng, 0, 30) * DAY;

      const respData: any = {
        orgId,
        reviewId,
        draftContent: pick(rng, RESPONSE_DRAFTS).replace("{provider}", providerName),
        aiGeneratedAt: createdAt + randInt(rng, 1, 5) * 60 * 1000,
        aiGenerationTimeMs: randInt(rng, 1500, 6000),
        phiCheckPassed: true,
        status,
        createdAt,
        updatedAt: now - randInt(rng, 0, 5) * DAY,
      };

      if (status === "edited" || status === "approved" || status === "posted" || status === "rejected") {
        respData.editedBy = pick(rng, allStaffIds);
        respData.editedAt = createdAt + randInt(rng, 1, 24) * HOUR;
        respData.editedContent = respData.draftContent + "\n\n— Canopy Dental Team";
      }
      if (status === "approved" || status === "posted") {
        respData.approvedBy = userIds[1]; // office_manager Karen
        respData.approvedAt = createdAt + randInt(rng, 2, 48) * HOUR;
      }
      if (status === "posted") {
        respData.postedAt = (respData.approvedAt || createdAt) + randInt(rng, 1, 4) * HOUR;
      }

      await ctx.db.insert("reviewResponses", respData);
    }
    counts.reviewResponses = 15;

    // -----------------------------------------------------------------------
    // 11. AI ACTIONS (80 records)
    // -----------------------------------------------------------------------
    const aiActionTypes: Array<"denial_categorization" | "appeal_letter" | "review_response" | "satisfaction_prediction" | "patient_suggest" | "cost_estimate" | "payer_alert" | "ar_prioritization"> = [
      "denial_categorization", "denial_categorization", "denial_categorization", "denial_categorization", "denial_categorization",
      "denial_categorization", "denial_categorization", "denial_categorization", "denial_categorization", "denial_categorization",
      "appeal_letter", "appeal_letter", "appeal_letter", "appeal_letter", "appeal_letter",
      "appeal_letter", "appeal_letter", "appeal_letter",
      "review_response", "review_response", "review_response", "review_response", "review_response",
      "review_response", "review_response", "review_response", "review_response", "review_response",
      "satisfaction_prediction", "satisfaction_prediction", "satisfaction_prediction", "satisfaction_prediction", "satisfaction_prediction",
      "satisfaction_prediction", "satisfaction_prediction", "satisfaction_prediction", "satisfaction_prediction", "satisfaction_prediction",
      "patient_suggest", "patient_suggest", "patient_suggest", "patient_suggest", "patient_suggest",
      "patient_suggest", "patient_suggest", "patient_suggest",
      "cost_estimate", "cost_estimate", "cost_estimate", "cost_estimate", "cost_estimate",
      "cost_estimate", "cost_estimate", "cost_estimate",
      "payer_alert", "payer_alert", "payer_alert", "payer_alert", "payer_alert",
      "payer_alert",
      "ar_prioritization", "ar_prioritization", "ar_prioritization", "ar_prioritization", "ar_prioritization",
      "ar_prioritization", "ar_prioritization", "ar_prioritization", "ar_prioritization", "ar_prioritization",
      "ar_prioritization", "ar_prioritization", "ar_prioritization", "ar_prioritization",
      "denial_categorization", "cost_estimate", "review_response", "patient_suggest", "payer_alert", "appeal_letter",
    ];

    // ~22 pending, rest completed/approved/rejected
    const aiStatuses: Array<"pending" | "completed" | "approved" | "rejected" | "error"> = [];
    for (let i = 0; i < 80; i++) {
      if (i < 22) aiStatuses.push("pending");
      else if (i < 50) aiStatuses.push("completed");
      else if (i < 68) aiStatuses.push("approved");
      else if (i < 76) aiStatuses.push("rejected");
      else aiStatuses.push("error");
    }

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

    for (let i = 0; i < 80; i++) {
      const actionType = aiActionTypes[i];
      const status = aiStatuses[i];
      const createdDaysAgo = randInt(rng, 0, 30);
      const createdAt = now - createdDaysAgo * DAY;
      const confidence = randFloat(rng, 0.55, 0.98);
      const explanations = AI_EXPLANATIONS[actionType] || [];

      const resourceType = aiResourceTypes[actionType];
      let resourceId: string;

      if (resourceType === "denial" && denialIds.length > 0) {
        resourceId = pick(rng, denialIds);
      } else if (resourceType === "review" && reviewIds.length > 0) {
        resourceId = pick(rng, reviewIds);
      } else if (resourceType === "claim" && claimIds.length > 0) {
        resourceId = pick(rng, claimIds);
      } else if (resourceType === "patient" && patients.length > 0) {
        resourceId = pick(rng, patients)._id;
      } else if (resourceType === "payer") {
        resourceId = pickPayer().id;
      } else {
        resourceId = `seed_resource_${i}`;
      }

      const aiData: any = {
        orgId,
        actionType,
        resourceType,
        resourceId: String(resourceId),
        confidence,
        explanation: explanations.length > 0 ? pick(rng, explanations) : `AI analysis completed with ${Math.round(confidence * 100)}% confidence.`,
        executionTimeMs: randInt(rng, 500, 12000),
        status,
        createdAt,
        updatedAt: now - randInt(rng, 0, 5) * DAY,
      };

      if (status === "completed" || status === "approved" || status === "rejected") {
        aiData.output = `AI-generated output for ${actionType} action #${i + 1}`;
      }
      if (status === "approved") {
        aiData.approvedBy = pick(rng, allStaffIds);
        aiData.approvedAt = createdAt + randInt(rng, 1, 48) * HOUR;
      }
      if (status === "rejected") {
        aiData.rejectedBy = pick(rng, allStaffIds);
        aiData.rejectedAt = createdAt + randInt(rng, 1, 24) * HOUR;
        aiData.rejectionReason = pick(rng, [
          "Incorrect categorization — manual review needed",
          "Letter tone not appropriate for this payer",
          "Response contains potential PHI reference",
          "Confidence too low for automated action",
          "Override: staff disagrees with AI recommendation",
        ]);
      }
      if (status === "error") {
        aiData.output = "Error: AI model returned invalid response format";
      }

      await ctx.db.insert("aiActions", aiData);
    }
    counts.aiActions = 80;

    // -----------------------------------------------------------------------
    // 12. COMMUNICATION CONSENTS (50 records)
    // -----------------------------------------------------------------------
    const channels: Array<"sms" | "email" | "phone"> = ["sms", "email", "phone"];
    const messageTypes: Array<"forms" | "reminders" | "scheduling" | "billing" | "marketing" | "all"> = [
      "forms", "reminders", "scheduling", "billing", "marketing", "all",
    ];
    const consentSources = ["patient_portal", "sms_reply", "front_desk", "intake_form", "phone_call"];

    for (let i = 0; i < 50; i++) {
      const patient = pick(rng, patients) as any;
      const channel = pick(rng, channels);
      const messageType = pick(rng, messageTypes);
      const consented = rng() > 0.15; // 85% consent rate
      const consentDaysAgo = randInt(rng, 1, 180);
      const consentTimestamp = now - consentDaysAgo * DAY;

      const consentData: any = {
        orgId,
        patientId: patient._id,
        channel,
        messageType,
        consented,
        consentTimestamp,
        consentSource: pick(rng, consentSources),
      };

      if (!consented) {
        consentData.revokedAt = consentTimestamp + randInt(rng, 1, 30) * DAY;
        consentData.revokeSource = pick(rng, ["sms_stop", "patient_portal", "phone_request"]);
      }

      await ctx.db.insert("communicationConsents", consentData);
    }
    counts.communicationConsents = 50;

    // -----------------------------------------------------------------------
    // 13. AUDIT LOGS (30 records)
    // -----------------------------------------------------------------------
    const auditActions = [
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "phi_access", resourceType: "claim", phiAccessed: true },
      { action: "write_off", resourceType: "claim", phiAccessed: true },
      { action: "write_off", resourceType: "claim", phiAccessed: true },
      { action: "treatment_plan_lock", resourceType: "treatment_plan", phiAccessed: true },
      { action: "consent_change", resourceType: "patient", phiAccessed: true },
      { action: "consent_change", resourceType: "patient", phiAccessed: true },
      { action: "user_role_change", resourceType: "user", phiAccessed: false },
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "phi_access", resourceType: "eligibility", phiAccessed: true },
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "write_off", resourceType: "claim", phiAccessed: true },
      { action: "consent_change", resourceType: "patient", phiAccessed: true },
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "phi_access", resourceType: "claim", phiAccessed: true },
      { action: "treatment_plan_lock", resourceType: "treatment_plan", phiAccessed: true },
      { action: "user_role_change", resourceType: "user", phiAccessed: false },
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "login", resourceType: "session", phiAccessed: false },
      { action: "consent_change", resourceType: "patient", phiAccessed: true },
      { action: "phi_access", resourceType: "patient", phiAccessed: true },
      { action: "write_off", resourceType: "claim", phiAccessed: true },
    ];

    for (let i = 0; i < 30; i++) {
      const audit = auditActions[i];
      const user = pick(rng, userDefs);
      const userId = `clerk_seed_${String(userDefs.indexOf(user) + 1).padStart(3, "0")}`;
      const timestampDaysAgo = randInt(rng, 0, 30);
      const timestamp = now - timestampDaysAgo * DAY - randInt(rng, 0, 24) * HOUR;

      let resourceId: string | undefined;
      let details: string | undefined;

      if (audit.resourceType === "patient" && patients.length > 0) {
        const p = pick(rng, patients) as any;
        resourceId = String(p._id);
        if (audit.action === "phi_access") {
          details = JSON.stringify({ fields: ["name", "dob", "insurance", "balance"], reason: "Treatment planning" });
        } else if (audit.action === "consent_change") {
          details = JSON.stringify({ field: "smsConsent", from: true, to: false, reason: "Patient request" });
        }
      } else if (audit.resourceType === "claim" && claimIds.length > 0) {
        resourceId = String(pick(rng, claimIds));
        if (audit.action === "write_off") {
          details = JSON.stringify({ amount: randInt(rng, 25, 500), reason: "Uncollectible", approvedBy: user.email });
        }
      } else if (audit.resourceType === "user") {
        resourceId = userId;
        details = JSON.stringify({ field: "role", from: "front_desk", to: "billing", changedBy: "sarah.mitchell@canopydental.com" });
      } else if (audit.resourceType === "session") {
        details = JSON.stringify({ method: "clerk_sso", ip: `192.168.1.${randInt(rng, 10, 250)}` });
      } else if (audit.resourceType === "treatment_plan") {
        resourceId = `tp_seed_${i}`;
        details = JSON.stringify({ status: "locked", procedures: randInt(rng, 2, 8), totalFee: randInt(rng, 500, 5000) });
      } else if (audit.resourceType === "eligibility") {
        resourceId = `elig_seed_${i}`;
        details = JSON.stringify({ patientId: patients.length > 0 ? String(pick(rng, patients)._id) : "unknown", payerName: pickPayer().name });
      }

      await ctx.db.insert("auditLogs", {
        orgId,
        userId,
        userEmail: user.email,
        action: audit.action,
        resourceType: audit.resourceType,
        resourceId,
        details,
        phiAccessed: audit.phiAccessed,
        ipAddress: `192.168.1.${randInt(rng, 10, 250)}`,
        previousHash: i === 0 ? "genesis" : `seed_hash_${i - 1}`,
        entryHash: `seed_hash_${i}`,
        timestamp,
      });
    }
    counts.auditLogs = 30;

    // -----------------------------------------------------------------------
    // 14. NOTIFICATIONS (15 records)
    // -----------------------------------------------------------------------
    for (let i = 0; i < 15; i++) {
      const template = NOTIFICATION_TEMPLATES[i % NOTIFICATION_TEMPLATES.length];
      const userId = pick(rng, userIds);
      const createdDaysAgo = randInt(rng, 0, 14);
      const createdAt = now - createdDaysAgo * DAY - randInt(rng, 0, 12) * HOUR;
      const isRead = rng() > 0.4; // 60% read rate

      const title = template.title;
      let message = template.msg
        .replace("{id}", String(randInt(rng, 1000, 9999)))
        .replace("{payer}", pickPayer().name)
        .replace("{amt}", String(randInt(rng, 100, 3000)))
        .replace("{rating}", String(pick(rng, [1, 2, 3, 4, 5])))
        .replace("{n}", String(randInt(rng, 5, 50)))
        .replace("{total}", String(randInt(rng, 50, 200)))
        .replace("{name}", patients.length > 0 ? `${(pick(rng, patients) as any).firstName} ${(pick(rng, patients) as any).lastName}` : "Patient");

      await ctx.db.insert("notifications", {
        orgId,
        userId,
        title,
        message,
        type: template.type,
        isRead,
        readAt: isRead ? createdAt + randInt(rng, 1, 24) * HOUR : undefined,
        createdAt,
      });
    }
    counts.notifications = 15;

    // -----------------------------------------------------------------------
    // 15. TASKS — HITL (12 records)
    // -----------------------------------------------------------------------
    const taskResourceTypes: Array<"claim" | "denial" | "payment" | "patient" | "recall"> = [
      "claim", "claim", "claim", "denial", "denial",
      "denial", "payment", "payment", "patient", "patient",
      "recall", "claim",
    ];
    const taskPriorities: Array<"low" | "medium" | "high" | "urgent"> = [
      "medium", "high", "medium", "urgent", "high",
      "medium", "low", "medium", "high", "medium",
      "low", "urgent",
    ];
    const taskStatuses: Array<"open" | "in_progress" | "completed"> = [
      "open", "open", "open", "open", "in_progress",
      "in_progress", "in_progress", "completed", "completed", "open",
      "open", "in_progress",
    ];
    const taskRoles: Array<"billing" | "front_desk" | "clinical" | "office_manager"> = [
      "billing", "billing", "billing", "billing", "billing",
      "billing", "front_desk", "front_desk", "clinical", "front_desk",
      "front_desk", "office_manager",
    ];

    for (let i = 0; i < 12; i++) {
      const resourceType = taskResourceTypes[i];
      const priority = taskPriorities[i];
      const status = taskStatuses[i];
      const assignedRole = taskRoles[i];
      const createdDaysAgo = randInt(rng, 0, 14);
      const createdAt = now - createdDaysAgo * DAY;

      const titles = TASK_TITLES[resourceType] || [`Review ${resourceType} item`];
      const title = pick(rng, titles);

      let resourceId: string | undefined;
      if (resourceType === "claim" && claimIds.length > 0) {
        resourceId = String(pick(rng, claimIds));
      } else if (resourceType === "denial" && denialIds.length > 0) {
        resourceId = String(pick(rng, denialIds));
      } else if (resourceType === "patient" && patients.length > 0) {
        resourceId = String(pick(rng, patients)._id);
      }

      const slaHours = priority === "urgent" ? 2 : priority === "high" ? 4 : priority === "medium" ? 8 : 24;
      const slaDeadline = createdAt + slaHours * HOUR;
      const slaStatus = slaDeadline < now
        ? "overdue" as const
        : slaDeadline < now + 2 * HOUR
        ? "at_risk" as const
        : "on_track" as const;

      const taskData: any = {
        orgId,
        title,
        description: `Auto-generated task for ${resourceType} review. Priority: ${priority}.`,
        resourceType,
        resourceId,
        assignedRole,
        priority,
        status,
        slaDeadline,
        slaStatus,
        isHitlFallback: rng() > 0.6,
        createdAt,
        updatedAt: now - randInt(rng, 0, 3) * DAY,
      };

      if (status === "in_progress" || status === "completed") {
        const roleUsers = assignedRole === "billing" ? billingUserIds
          : assignedRole === "front_desk" ? frontDeskUserIds
          : [pick(rng, allStaffIds)];
        taskData.assignedTo = pick(rng, roleUsers);
      }

      if (status === "completed") {
        taskData.completedBy = taskData.assignedTo || pick(rng, allStaffIds);
        taskData.completedAt = createdAt + randInt(rng, 1, slaHours) * HOUR;
      }

      if (priority === "urgent" || priority === "high") {
        taskData.isEscalated = slaStatus === "overdue";
        if (taskData.isEscalated) {
          taskData.escalatedAt = slaDeadline + HOUR;
        }
      }

      await ctx.db.insert("tasks", taskData);
    }
    counts.tasks = 12;

    // -----------------------------------------------------------------------
    // Done
    // -----------------------------------------------------------------------
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return {
      seeded: true,
      totalRecords: total,
      counts,
    };
  },
});

// ============================================================================
// Helper: pick N items from a list without replacement
// ============================================================================
function pickFromList<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
