import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// ============================================================================
// Deterministic pseudo-random number generator (mulberry32)
// ============================================================================
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

function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// ============================================================================
// Name pools
// ============================================================================
const FIRST_NAMES = [
  "James", "Maria", "Carlos", "Sarah", "Wei", "Fatima", "Dmitri", "Priya",
  "John", "Emily", "Miguel", "Aisha", "Robert", "Jennifer", "Hassan",
  "Yuki", "David", "Ana", "Li", "Sofia", "Daniel", "Rachel", "Ahmed",
  "Mei", "Marcus", "Olivia", "Raj", "Isabella", "Thomas", "Valentina",
  "Jose", "Emma", "Kevin", "Samantha", "Khalid", "Nina", "Brian",
  "Jasmine", "Antonio", "Grace", "Alejandro", "Chloe", "Patrick", "Layla",
  "Nathan", "Maya", "Victor", "Hannah", "Gabriel", "Zoe", "Derek",
  "Amara", "Ethan", "Naomi", "Francisco", "Lily", "Brandon", "Ariana",
  "Tyler", "Mia", "Christian", "Aaliyah", "Steven", "Camila", "Jordan",
  "Riley", "Adrian", "Nora", "Aaron", "Jade", "Luis", "Sierra",
  "Raymond", "Kira", "Sean", "Destiny", "Russell", "Clara", "Terry",
  "Vanessa", "Jesse", "Diana", "Randy", "Iris", "Henry", "Elise",
  "Gregory", "Carmen", "Keith", "Tanya", "Roger", "Bianca", "Lawrence",
  "Monica", "Philip", "Teresa", "Gerald", "Stella",
];

const LAST_NAMES = [
  "Smith", "Garcia", "Rodriguez", "Chen", "Johnson", "Martinez", "Williams",
  "Patel", "Brown", "Lopez", "Kim", "Nguyen", "Anderson", "Thomas", "Jackson",
  "Lee", "Hernandez", "Davis", "Wilson", "Moore", "Taylor", "White",
  "Harris", "Martin", "Thompson", "Robinson", "Clark", "Lewis", "Walker",
  "Hall", "Young", "King", "Wright", "Hill", "Scott", "Green", "Adams",
  "Baker", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
  "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins",
  "Sanchez", "Morris", "Rivera", "Murphy", "Cook", "Rogers", "Morgan",
  "Cruz", "Ortiz", "Gomez", "Diaz", "Reyes", "Torres", "Flores",
  "Ramirez", "Sharma", "Ali", "Hussain", "Yamamoto", "Sato", "Khan",
  "Okafor", "Singh", "Wang", "Zhang", "Liu", "Yang", "Huang",
  "Wu", "Zhou", "Xu", "Sun", "Ma", "Zhu", "Lam", "Chan",
  "Tran", "Le", "Vo", "Bui", "Do", "Ho", "Truong", "Dang",
  "Park", "Choi", "Kang", "Yoon", "Jang", "Song", "Kwon", "Cho",
];

const STREETS = [
  "Main St", "Oak Ave", "Elm St", "Cedar Ln", "Maple Dr", "Pine St",
  "Walnut Blvd", "Pecan St", "Lamar Blvd", "Congress Ave", "Guadalupe St",
  "Burnet Rd", "South 1st St", "Riverside Dr", "Barton Springs Rd",
  "Red River St", "Manchaca Rd", "Research Blvd", "Anderson Ln",
  "Parmer Ln", "Slaughter Ln", "Oltorf St", "Stassney Ln", "Wells Branch",
  "Braker Ln", "Duval St", "Speedway", "Dean Keeton St", "MLK Blvd",
  "Manor Rd", "Airport Blvd", "Cameron Rd", "Metric Blvd", "Howard Ln",
];

const AUSTIN_ZIPS = [
  "78701", "78702", "78703", "78704", "78705", "78721", "78722", "78723",
  "78724", "78725", "78726", "78727", "78728", "78729", "78730", "78731",
  "78732", "78733", "78734", "78735", "78736", "78737", "78738", "78739",
  "78741", "78742", "78744", "78745", "78746", "78747", "78748", "78749",
  "78750", "78751", "78752", "78753", "78754", "78756", "78757", "78758",
  "78759",
];

// ============================================================================
// Insurance data
// ============================================================================
const INSURANCE_CARRIERS = [
  { payerId: "DELTA001", payerName: "Delta Dental" },
  { payerId: "CIGNA001", payerName: "Cigna Dental" },
  { payerId: "METLF001", payerName: "MetLife Dental" },
  { payerId: "AETNA001", payerName: "Aetna Dental" },
  { payerId: "GUARD001", payerName: "Guardian Dental" },
  { payerId: "BCBS001", payerName: "BCBS of Texas" },
];

// ============================================================================
// Review text pools
// ============================================================================
const REVIEW_TEXTS_5STAR = [
  "Dr. Chen and her team are amazing! Best dental experience I've ever had. The office is clean and modern, and everyone is so friendly.",
  "Absolutely love this practice. They take the time to explain everything and make sure you're comfortable. Highly recommend!",
  "Five stars isn't enough! From the front desk to the hygienist to Dr. Rodriguez, everyone was professional and kind.",
  "I've been coming here for years and have always had great experiences. They use the latest technology and are always on time.",
  "Best dentist in Austin, hands down. They made my crown procedure completely painless. Amazing staff!",
  "So glad I found Canopy Dental. Dr. Park is incredibly skilled and gentle. The whole team makes you feel like family.",
  "Outstanding care from start to finish. Lisa is the best hygienist I've ever had. Thorough but gentle cleaning.",
  "The online scheduling and text reminders are so convenient. Plus the care is top-notch. Can't say enough good things.",
  "Dr. Patel did an incredible job with my periodontal treatment. Very knowledgeable and compassionate. Highly recommend.",
  "Wonderful experience every single visit. The staff remembers my name and always greets me with a smile.",
  "Clean, modern office with a great team. Maria the hygienist is fantastic - she always explains what she's doing.",
  "I was nervous about my extraction but Dr. Rodriguez made me feel completely at ease. Smooth procedure, quick recovery.",
  "This practice truly cares about their patients. They follow up after procedures and are always available for questions.",
  "Best dental office in the Austin area. Efficient, professional, and genuinely caring. Wouldn't go anywhere else.",
  "Dr. Chen's attention to detail is remarkable. My new crowns look absolutely natural. Thank you, Canopy Dental!",
  "I drive 30 minutes to come here because the care is that good. Worth every minute of the commute.",
  "The text-to-pay feature is so convenient! Great care and great technology. They really are a modern practice.",
  "My whole family comes here - from my 5-year-old to my 80-year-old mother. They're great with all ages.",
  "Finally found a dentist that doesn't make me anxious. The team is patient and understanding. Thank you!",
  "Scheduled same-day for an emergency and they took incredible care of me. Professional and compassionate team.",
  "Love that they send appointment reminders and make rebooking so easy. The care itself is excellent too.",
  "Dr. Park's implant work is exceptional. I can eat and smile with confidence again. Life-changing!",
  "The hygienists here are thorough but never rough. Best cleanings I've ever had. Five stars!",
  "Great experience with my composite filling. Quick, painless, and the color match is perfect.",
  "Highly recommend Canopy Dental for anyone looking for a caring, professional dental practice in Austin.",
];

const REVIEW_TEXTS_4STAR = [
  "Great dental office with friendly staff. Only minor complaint is parking can be tricky during peak hours.",
  "Very professional team and excellent care. Wait times can sometimes be a bit long, but worth it.",
  "Really happy with my treatment. The office could use a few more comfortable chairs in the waiting area.",
  "Dr. Rodriguez is excellent. The only reason for 4 stars is that they had to reschedule my appointment once.",
  "Good experience overall. Thorough exam and cleaning. Would appreciate later evening appointment options.",
  "Skilled dentists and hygienists. Front desk is usually efficient but had a billing mix-up that took time to resolve.",
  "Very happy with the quality of care. Insurance processing could be a bit faster but otherwise great.",
  "Clean office, friendly team, good work. Slightly pricey but you get what you pay for.",
  "Dr. Chen is wonderful. Only giving 4 stars because the scheduling system was confusing to navigate online.",
  "Solid dental practice with good technology. Sometimes the wait can be 15-20 minutes past appointment time.",
];

const REVIEW_TEXTS_3STAR = [
  "Decent dental care but the wait times are consistently long. Staff is friendly though.",
  "The dentist is good but the front desk communication could be better. Had some scheduling confusion.",
  "Average experience. Nothing bad but nothing outstanding either. Treatment was fine.",
  "Good dentist but the office feels a bit cramped. Also had to wait 30 minutes past my appointment time.",
  "Treatment was adequate. Would appreciate more explanation of procedures before starting them.",
  "The cleaning was thorough but felt rushed. Staff seemed overbooked.",
  "Okay experience. They recommended a lot of procedures that felt unnecessary. Got a second opinion.",
  "Mixed feelings. The hygienist was great but the billing department made errors on my insurance claim.",
];

const REVIEW_TEXTS_2STAR = [
  "Long wait times and felt rushed during the actual appointment. Expected better for the price.",
  "Had a billing issue that took three calls to resolve. The dental work itself was fine.",
  "Felt like they were upselling unnecessary treatments. The hygienist was good though.",
  "Appointment was 45 minutes late. Staff didn't apologize or acknowledge the delay.",
];

const REVIEW_TEXTS_1STAR = [
  "Terrible experience with billing. Was charged for a procedure that wasn't performed. Still fighting to get a refund.",
  "Waited over an hour, then was told my appointment was actually for next week. Complete waste of my time.",
  "The front desk staff was rude and dismissive. Won't be returning despite the dentist being okay.",
];

const REVIEWER_FIRST_NAMES = [
  "Alex", "Sam", "Pat", "Chris", "Jamie", "Morgan", "Taylor", "Jordan",
  "Casey", "Quinn", "Avery", "Riley", "Hayden", "Drew", "Kendall",
  "Logan", "Blake", "Sage", "Parker", "Reese",
];

// ============================================================================
// Denial data
// ============================================================================
const DENIAL_REASONS: Array<{
  category: "eligibility" | "coding" | "documentation" | "authorization" | "timely_filing" | "duplicate";
  reasonCode: string;
  reasonDescription: string;
}> = [
  { category: "eligibility", reasonCode: "CO-27", reasonDescription: "Expenses incurred after coverage terminated" },
  { category: "eligibility", reasonCode: "CO-29", reasonDescription: "The time limit for filing has expired" },
  { category: "eligibility", reasonCode: "CO-109", reasonDescription: "Claim not covered by this payer/contractor" },
  { category: "eligibility", reasonCode: "CO-197", reasonDescription: "Precertification/authorization/notification absent" },
  { category: "eligibility", reasonCode: "PR-204", reasonDescription: "This service is not covered under the patient's current benefit plan" },
  { category: "coding", reasonCode: "CO-4", reasonDescription: "The procedure code is inconsistent with the modifier used" },
  { category: "coding", reasonCode: "CO-11", reasonDescription: "The diagnosis is inconsistent with the procedure" },
  { category: "coding", reasonCode: "CO-16", reasonDescription: "Claim/service lacks information needed for adjudication" },
  { category: "coding", reasonCode: "CO-97", reasonDescription: "The benefit for this service is included in the payment/allowance for another service" },
  { category: "coding", reasonCode: "CO-5", reasonDescription: "The procedure code/bill type is inconsistent with the place of service" },
  { category: "coding", reasonCode: "CO-18", reasonDescription: "Exact duplicate claim/service" },
  { category: "coding", reasonCode: "CO-234", reasonDescription: "This procedure is not paid separately" },
  { category: "coding", reasonCode: "CO-B7", reasonDescription: "This provider was not certified/eligible to be paid for this procedure" },
  { category: "documentation", reasonCode: "CO-252", reasonDescription: "An attachment/other documentation is required to adjudicate this claim" },
  { category: "documentation", reasonCode: "CO-16", reasonDescription: "Claim/service lacks information or has submission/billing error(s)" },
  { category: "documentation", reasonCode: "CO-35", reasonDescription: "Lifetime benefit maximum has been reached for this service" },
  { category: "documentation", reasonCode: "MA04", reasonDescription: "Secondary payment cannot be considered without the identity of or payment information from the primary payer" },
  { category: "documentation", reasonCode: "MA130", reasonDescription: "Your claim contains incomplete and/or invalid information" },
  { category: "documentation", reasonCode: "N386", reasonDescription: "Missing/incomplete/invalid periodontal charting" },
  { category: "documentation", reasonCode: "N479", reasonDescription: "Missing/incomplete/invalid radiographs/images" },
  { category: "authorization", reasonCode: "CO-15", reasonDescription: "The authorization number is missing, invalid, or does not apply" },
  { category: "authorization", reasonCode: "CO-197", reasonDescription: "Precertification/authorization absent" },
  { category: "authorization", reasonCode: "N30", reasonDescription: "Patient ineligible for this service without authorization" },
  { category: "authorization", reasonCode: "PI-197", reasonDescription: "Pre-authorization was not obtained within the required timeframe" },
  { category: "authorization", reasonCode: "N362", reasonDescription: "The number of days or units of service exceeds our acceptable maximum" },
  { category: "timely_filing", reasonCode: "CO-29", reasonDescription: "The time limit for filing has expired" },
  { category: "timely_filing", reasonCode: "N527", reasonDescription: "Claim submitted outside the timely filing period" },
  { category: "timely_filing", reasonCode: "CO-29A", reasonDescription: "Claim received after filing deadline for this payer" },
  { category: "duplicate", reasonCode: "CO-18", reasonDescription: "Exact duplicate claim/service (Use only with Group Code OA except where state workers' compensation regulations requires CO)" },
  { category: "duplicate", reasonCode: "CO-B5", reasonDescription: "Coverage/program guidelines were not met or were exceeded" },
];

// ============================================================================
// Task templates
// ============================================================================
const TASK_TEMPLATES: Array<{
  title: string;
  description: string;
  resourceType: "claim" | "denial" | "review" | "patient" | "eligibility";
  assignedRole: "billing" | "front_desk" | "office_manager" | "clinical" | "admin";
  priority: "low" | "medium" | "high" | "urgent";
}> = [
  { title: "Follow up on unpaid claim >30 days", description: "Contact payer for claim status update. Check for any missing information.", resourceType: "claim", assignedRole: "billing", priority: "high" },
  { title: "Review denied claim - coding error", description: "Review denial reason code and determine if corrected claim can be resubmitted.", resourceType: "denial", assignedRole: "billing", priority: "high" },
  { title: "Respond to negative Google review", description: "Draft a professional response to the patient review. Do not include PHI.", resourceType: "review", assignedRole: "office_manager", priority: "urgent" },
  { title: "Patient callback - billing question", description: "Patient called with questions about their statement. Return call within 4 hours.", resourceType: "patient", assignedRole: "front_desk", priority: "medium" },
  { title: "Verify eligibility for tomorrow's patients", description: "Run batch eligibility verification for all patients with appointments tomorrow.", resourceType: "eligibility", assignedRole: "front_desk", priority: "medium" },
  { title: "Appeal denied claim - documentation missing", description: "Gather required documentation (radiographs, perio charting) and submit appeal.", resourceType: "denial", assignedRole: "billing", priority: "high" },
  { title: "Follow up on claim appeal", description: "Check status of previously submitted appeal. Escalate if no response in 30 days.", resourceType: "claim", assignedRole: "billing", priority: "medium" },
  { title: "Patient balance >$500 - contact for payment", description: "Reach out to patient about outstanding balance. Offer payment plan options.", resourceType: "patient", assignedRole: "front_desk", priority: "medium" },
  { title: "Review insurance aging report", description: "Review all claims in 61-90 day bucket and take action on stalled claims.", resourceType: "claim", assignedRole: "billing", priority: "high" },
  { title: "Respond to positive review", description: "Draft a thank-you response to the 5-star review. Keep it professional and appreciative.", resourceType: "review", assignedRole: "front_desk", priority: "low" },
  { title: "Re-verify expired eligibility", description: "Patient eligibility expired. Re-verify before upcoming appointment.", resourceType: "eligibility", assignedRole: "front_desk", priority: "high" },
  { title: "Patient callback - appointment reschedule", description: "Patient requested to reschedule their upcoming appointment. Call back to find a new time.", resourceType: "patient", assignedRole: "front_desk", priority: "low" },
  { title: "Review claim scrub failure", description: "Claim failed scrubbing rules. Review errors and correct before resubmitting.", resourceType: "claim", assignedRole: "billing", priority: "high" },
  { title: "Dental benefits maximum tracking", description: "Patient is approaching annual maximum. Coordinate treatment plan timing.", resourceType: "patient", assignedRole: "billing", priority: "medium" },
  { title: "Missing pre-authorization for crown", description: "Pre-authorization required before crown prep. Submit to payer with radiographs.", resourceType: "claim", assignedRole: "billing", priority: "urgent" },
  { title: "Patient complaint follow-up", description: "Patient expressed dissatisfaction during visit. Manager should follow up within 24 hours.", resourceType: "patient", assignedRole: "office_manager", priority: "urgent" },
  { title: "Coordinate secondary insurance claim", description: "Primary EOB received. Submit to secondary insurance with primary EOB attached.", resourceType: "claim", assignedRole: "billing", priority: "medium" },
  { title: "Recall patient - 6 months overdue", description: "Patient is 6 months past due for hygiene recall. Attempt contact via SMS then phone.", resourceType: "patient", assignedRole: "front_desk", priority: "low" },
  { title: "Review denial trends report", description: "Analyze this month's denial patterns and identify root causes for improvement.", resourceType: "denial", assignedRole: "office_manager", priority: "medium" },
  { title: "Insurance credentialing follow-up", description: "Check status of provider credentialing application with new insurance carrier.", resourceType: "eligibility", assignedRole: "office_manager", priority: "medium" },
];

// ============================================================================
// Procedure data for appointments/claims
// ============================================================================
const PROCEDURES = [
  { code: "D0120", description: "Periodic Oral Evaluation", fee: 65, category: "diagnostic" },
  { code: "D0150", description: "Comprehensive Oral Evaluation", fee: 95, category: "diagnostic" },
  { code: "D0210", description: "Intraoral - Complete Series", fee: 150, category: "diagnostic" },
  { code: "D0220", description: "Intraoral - Periapical First Film", fee: 35, category: "diagnostic" },
  { code: "D0274", description: "Bitewings - Four Films", fee: 70, category: "diagnostic" },
  { code: "D0330", description: "Panoramic Film", fee: 130, category: "diagnostic" },
  { code: "D1110", description: "Prophylaxis - Adult", fee: 120, category: "hygiene" },
  { code: "D1120", description: "Prophylaxis - Child", fee: 75, category: "hygiene" },
  { code: "D1206", description: "Topical Fluoride Varnish", fee: 40, category: "preventive" },
  { code: "D1351", description: "Sealant - Per Tooth", fee: 55, category: "preventive" },
  { code: "D2140", description: "Amalgam - One Surface", fee: 175, category: "restorative" },
  { code: "D2150", description: "Amalgam - Two Surfaces", fee: 220, category: "restorative" },
  { code: "D2391", description: "Resin Composite - One Surface, Posterior", fee: 210, category: "restorative" },
  { code: "D2392", description: "Resin Composite - Two Surfaces, Posterior", fee: 275, category: "restorative" },
  { code: "D2740", description: "Crown - Porcelain/Ceramic", fee: 1250, category: "restorative" },
  { code: "D2750", description: "Crown - Porcelain Fused to Metal", fee: 1150, category: "restorative" },
  { code: "D2950", description: "Core Buildup", fee: 325, category: "restorative" },
  { code: "D3310", description: "Endodontic Therapy - Anterior", fee: 800, category: "endodontic" },
  { code: "D3320", description: "Endodontic Therapy - Premolar", fee: 950, category: "endodontic" },
  { code: "D4341", description: "Periodontal Scaling and Root Planing - Per Quadrant", fee: 275, category: "hygiene" },
  { code: "D4342", description: "Periodontal Scaling - 1-3 Teeth Per Quadrant", fee: 175, category: "hygiene" },
  { code: "D4910", description: "Periodontal Maintenance", fee: 165, category: "hygiene" },
  { code: "D5110", description: "Complete Denture - Maxillary", fee: 1800, category: "prosthodontic" },
  { code: "D5120", description: "Complete Denture - Mandibular", fee: 1800, category: "prosthodontic" },
  { code: "D6010", description: "Surgical Placement of Implant Body", fee: 2200, category: "surgical" },
  { code: "D7140", description: "Extraction, Erupted Tooth", fee: 225, category: "surgical" },
  { code: "D7210", description: "Surgical Extraction", fee: 375, category: "surgical" },
  { code: "D9110", description: "Palliative Treatment of Dental Pain", fee: 100, category: "emergency" },
  { code: "D9999", description: "Unspecified Adjunctive Procedure", fee: 150, category: "other" },
];

// ============================================================================
// Seed mutation
// ============================================================================
export const seed = internalMutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, { orgId }) => {
    // ------ Idempotency check ------
    const existingPractice = await ctx.db
      .query("practices")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
    if (existingPractice) {
      console.log(`Seed data already exists for org ${orgId}. Skipping.`);
      return { seeded: false, message: "Data already exists" };
    }

    const rng = mulberry32(42);
    const now = Date.now();
    const DAY_MS = 86400000;
    const HOUR_MS = 3600000;

    // ========================================================================
    // 1. PRACTICES (2)
    // ========================================================================
    const practiceMain = await ctx.db.insert("practices", {
      orgId,
      name: "Canopy Dental Main",
      address: { street: "123 Main St", city: "Austin", state: "TX", zip: "78701" },
      phone: "(512) 555-0100",
      email: "main@canopydental.com",
      npi: "1234567890",
      taxId: "12-3456789",
      timezone: "America/Chicago",
      businessHours: [
        { day: "Monday", open: "08:00", close: "17:00", closed: false },
        { day: "Tuesday", open: "08:00", close: "17:00", closed: false },
        { day: "Wednesday", open: "08:00", close: "17:00", closed: false },
        { day: "Thursday", open: "08:00", close: "17:00", closed: false },
        { day: "Friday", open: "08:00", close: "14:00", closed: false },
        { day: "Saturday", open: "09:00", close: "13:00", closed: false },
        { day: "Sunday", open: "00:00", close: "00:00", closed: true },
      ],
      pmsType: "opendental",
      pmsConnectionStatus: "connected",
      lastSyncAt: now - HOUR_MS * 2,
      createdAt: now,
      updatedAt: now,
    });

    const practiceWest = await ctx.db.insert("practices", {
      orgId,
      name: "Canopy Dental West",
      address: { street: "456 Oak Ave", city: "Austin", state: "TX", zip: "78735" },
      phone: "(512) 555-0200",
      email: "west@canopydental.com",
      npi: "1234567891",
      taxId: "12-3456790",
      timezone: "America/Chicago",
      businessHours: [
        { day: "Monday", open: "08:00", close: "17:00", closed: false },
        { day: "Tuesday", open: "08:00", close: "17:00", closed: false },
        { day: "Wednesday", open: "08:00", close: "17:00", closed: false },
        { day: "Thursday", open: "08:00", close: "17:00", closed: false },
        { day: "Friday", open: "08:00", close: "14:00", closed: false },
        { day: "Saturday", open: "00:00", close: "00:00", closed: true },
        { day: "Sunday", open: "00:00", close: "00:00", closed: true },
      ],
      pmsType: "eaglesoft",
      pmsConnectionStatus: "connected",
      lastSyncAt: now - HOUR_MS * 3,
      createdAt: now,
      updatedAt: now,
    });

    const practiceIds = [practiceMain, practiceWest];

    // ========================================================================
    // 2. PROVIDERS (6)
    // ========================================================================
    const providerDefs = [
      { firstName: "Sarah", lastName: "Chen", npi: "1112223334", type: "dentist" as const, specialty: "General Dentistry", color: "#4F46E5", practiceIdx: 0 },
      { firstName: "Michael", lastName: "Rodriguez", npi: "1112223335", type: "dentist" as const, specialty: "General Dentistry", color: "#059669", practiceIdx: 0 },
      { firstName: "James", lastName: "Park", npi: "1112223336", type: "dentist" as const, specialty: "General Dentistry", color: "#D97706", practiceIdx: 1 },
      { firstName: "Lisa", lastName: "Thompson", npi: "1112223337", type: "hygienist" as const, specialty: "Dental Hygiene", color: "#EC4899", practiceIdx: 0 },
      { firstName: "Maria", lastName: "Garcia", npi: "1112223338", type: "hygienist" as const, specialty: "Dental Hygiene", color: "#8B5CF6", practiceIdx: 1 },
      { firstName: "Raj", lastName: "Patel", npi: "1112223339", type: "specialist" as const, specialty: "Periodontics", color: "#EF4444", practiceIdx: 1 },
    ];

    const providerIds: Id<"providers">[] = [];
    for (const p of providerDefs) {
      const id = await ctx.db.insert("providers", {
        orgId,
        practiceId: practiceIds[p.practiceIdx],
        firstName: p.firstName,
        lastName: p.lastName,
        npi: p.npi,
        type: p.type,
        specialty: p.specialty,
        color: p.color,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      providerIds.push(id);
    }

    // ========================================================================
    // 3. OPERATORIES (8)
    // ========================================================================
    const operatoryIds: Id<"operatories">[] = [];
    for (let i = 0; i < 8; i++) {
      const practiceIdx = i < 4 ? 0 : 1;
      const opNum = i + 1;
      const id = await ctx.db.insert("operatories", {
        orgId,
        practiceId: practiceIds[practiceIdx],
        name: `Operatory ${opNum}`,
        shortName: `Op ${opNum}`,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      operatoryIds.push(id);
    }

    // ========================================================================
    // 4. APPOINTMENT TYPES (10)
    // ========================================================================
    const apptTypeDefs = [
      { name: "Periodic Exam", code: "D0120", duration: 30, category: "diagnostic" as const, productionValue: 65, color: "#6366F1" },
      { name: "Comprehensive Exam", code: "D0150", duration: 60, category: "diagnostic" as const, productionValue: 95, color: "#3B82F6" },
      { name: "Prophylaxis", code: "D1110", duration: 60, category: "hygiene" as const, productionValue: 120, color: "#10B981" },
      { name: "SRP Per Quadrant", code: "D4341", duration: 90, category: "hygiene" as const, productionValue: 275, color: "#14B8A6" },
      { name: "Composite Filling", code: "D2391", duration: 45, category: "restorative" as const, productionValue: 210, color: "#F59E0B" },
      { name: "Crown - Porcelain", code: "D2740", duration: 90, category: "restorative" as const, productionValue: 1250, color: "#EF4444" },
      { name: "Surgical Extraction", code: "D7210", duration: 60, category: "surgical" as const, productionValue: 375, color: "#DC2626" },
      { name: "Emergency Visit", code: "D9110", duration: 30, category: "emergency" as const, productionValue: 100, color: "#B91C1C" },
      { name: "Implant Consult", code: "D9999", duration: 45, category: "prosthodontic" as const, productionValue: 150, color: "#7C3AED" },
      { name: "Complete Denture Upper", code: "D5110", duration: 60, category: "prosthodontic" as const, productionValue: 1800, color: "#6D28D9" },
    ];

    const apptTypeIds: Id<"appointmentTypes">[] = [];
    for (const at of apptTypeDefs) {
      const id = await ctx.db.insert("appointmentTypes", {
        orgId,
        name: at.name,
        code: at.code,
        duration: at.duration,
        color: at.color,
        category: at.category,
        productionValue: at.productionValue,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      apptTypeIds.push(id);
    }

    // ========================================================================
    // 5. USERS (8)
    // ========================================================================
    const userDefs = [
      { firstName: "John", lastName: "Salter", role: "admin" as const, email: "john.salter@canopydental.com" },
      { firstName: "Sarah", lastName: "Wilson", role: "office_manager" as const, email: "sarah.wilson@canopydental.com" },
      { firstName: "Amanda", lastName: "Lee", role: "billing" as const, email: "amanda.lee@canopydental.com" },
      { firstName: "Robert", lastName: "Chen", role: "billing" as const, email: "robert.chen@canopydental.com" },
      { firstName: "Jennifer", lastName: "Martinez", role: "clinical" as const, email: "jennifer.martinez@canopydental.com" },
      { firstName: "David", lastName: "Kim", role: "clinical" as const, email: "david.kim@canopydental.com" },
      { firstName: "Emily", lastName: "Brown", role: "front_desk" as const, email: "emily.brown@canopydental.com" },
      { firstName: "Michael", lastName: "Taylor", role: "front_desk" as const, email: "michael.taylor@canopydental.com" },
    ];

    const userIds: Id<"users">[] = [];
    for (let i = 0; i < userDefs.length; i++) {
      const u = userDefs[i];
      const id = await ctx.db.insert("users", {
        orgId,
        clerkUserId: `clerk_seed_${i + 1}`,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        practiceId: practiceIds[i < 4 ? 0 : 1],
        isActive: true,
        lastLoginAt: now - Math.floor(rng() * DAY_MS * 7),
        createdAt: now,
        updatedAt: now,
      });
      userIds.push(id);
    }

    // ========================================================================
    // 6. PATIENTS (200)
    // ========================================================================
    const patientIds: Id<"patients">[] = [];
    for (let i = 0; i < 200; i++) {
      const firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];

      // DOB: 1940-2018
      const birthYear = 1940 + Math.floor(rng() * 79);
      const birthMonth = 1 + Math.floor(rng() * 12);
      const birthDay = 1 + Math.floor(rng() * 28);
      const dob = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;

      const phone = `(512) 555-${String(1000 + i).padStart(4, "0")}`;
      const streetNum = 100 + Math.floor(rng() * 9900);
      const street = `${streetNum} ${pick(rng, STREETS)}`;
      const zip = pick(rng, AUSTIN_ZIPS);
      const emailDomain = pick(rng, ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"]);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(rng() * 99)}@${emailDomain}`;

      // ~70% with primary insurance
      const hasPrimary = rng() < 0.70;
      const carrier = pick(rng, INSURANCE_CARRIERS);
      const primaryInsurance = hasPrimary
        ? {
            payerId: carrier.payerId,
            payerName: carrier.payerName,
            memberId: `MEM${String(100000 + Math.floor(rng() * 899999))}`,
            groupNumber: `GRP${String(1000 + Math.floor(rng() * 8999))}`,
            subscriberName: `${firstName} ${lastName}`,
            subscriberDob: dob,
            relationship: "self",
          }
        : undefined;

      // ~20% with secondary insurance (only if they have primary)
      const hasSecondary = hasPrimary && rng() < 0.286; // 0.20/0.70
      const secondaryCarrier = pick(rng, INSURANCE_CARRIERS.filter((c) => c.payerId !== carrier.payerId));
      const secondaryInsurance = hasSecondary
        ? {
            payerId: secondaryCarrier.payerId,
            payerName: secondaryCarrier.payerName,
            memberId: `MEM${String(100000 + Math.floor(rng() * 899999))}`,
            groupNumber: `GRP${String(1000 + Math.floor(rng() * 8999))}`,
            subscriberName: `${firstName} ${lastName}`,
            subscriberDob: dob,
            relationship: "self",
          }
        : undefined;

      // Balance: $0-$2000 with most being low
      const hasBalance = rng() < 0.35;
      const patientBalance = hasBalance ? Math.round(rng() * rng() * 2000 * 100) / 100 : 0;
      const insuranceBalance = hasPrimary && rng() < 0.25 ? Math.round(rng() * 500 * 100) / 100 : 0;

      // Last visit: spread over last 12 months
      const lastVisitDaysAgo = Math.floor(rng() * 365);
      const lastVisitDate = new Date(now - lastVisitDaysAgo * DAY_MS);
      const lastVisitStr = lastVisitDate.toISOString().split("T")[0];

      const recallInterval = pick(rng, [3, 4, 6]);
      const nextRecallDate = new Date(lastVisitDate.getTime() + recallInterval * 30 * DAY_MS);
      const nextRecallStr = nextRecallDate.toISOString().split("T")[0];

      const smsConsent = rng() < 0.90;
      const preferredContact = pick(rng, ["sms", "email", "phone"] as const);
      const gender = pick(rng, ["male", "female"]);

      const id = await ctx.db.insert("patients", {
        orgId,
        oscarPatientId: `OSC-${String(10000 + i).padStart(6, "0")}`,
        pmsPatientId: `PMS-${String(20000 + i)}`,
        firstName,
        lastName,
        dateOfBirth: dob,
        gender,
        email,
        phone,
        address: { street, city: "Austin", state: "TX", zip },
        primaryInsurance,
        secondaryInsurance,
        patientBalance,
        insuranceBalance,
        smsConsent,
        smsConsentTimestamp: smsConsent ? now - Math.floor(rng() * DAY_MS * 180) : undefined,
        smsConsentSource: smsConsent ? pick(rng, ["patient_portal", "front_desk", "sms_reply"]) : undefined,
        emailConsent: rng() < 0.85,
        preferredContactMethod: preferredContact,
        lastVisitDate: lastVisitStr,
        recallInterval,
        nextRecallDate: nextRecallStr,
        isActive: true,
        matchStatus: "matched",
        lastSyncAt: now - Math.floor(rng() * DAY_MS * 2),
        createdAt: now - Math.floor(rng() * DAY_MS * 365),
        updatedAt: now - Math.floor(rng() * DAY_MS * 30),
      });
      patientIds.push(id);
    }

    // ========================================================================
    // 7. APPOINTMENTS (500)
    // ========================================================================
    const TIME_SLOTS = [
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
      "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    ];

    function addMinutes(time: string, mins: number): string {
      const [h, m] = time.split(":").map(Number);
      const total = h * 60 + m + mins;
      const newH = Math.floor(total / 60);
      const newM = total % 60;
      return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    }

    const appointmentIds: Id<"appointments">[] = [];
    const completedApptIds: Id<"appointments">[] = [];

    // Track which appointment goes with which patient/practice for claims
    const appointmentMeta: Array<{
      id: Id<"appointments">;
      patientId: Id<"patients">;
      practiceId: Id<"practices">;
      procedures: Array<{ code: string; description: string; fee: number; tooth?: string; surface?: string }>;
      totalFee: number;
      status: string;
    }> = [];

    for (let i = 0; i < 500; i++) {
      const isPast = i < 200;
      let date: Date;
      let status: "scheduled" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";

      if (isPast) {
        // Past: last 90 days
        const daysAgo = 1 + Math.floor(rng() * 90);
        date = new Date(now - daysAgo * DAY_MS);
        const statusRoll = rng();
        if (statusRoll < 0.75) status = "completed";
        else if (statusRoll < 0.90) status = "cancelled";
        else status = "no_show";
      } else {
        // Future: next 30 days
        const daysAhead = 1 + Math.floor(rng() * 30);
        date = new Date(now + daysAhead * DAY_MS);
        status = rng() < 0.6 ? "confirmed" : "scheduled";
      }

      const dateStr = date.toISOString().split("T")[0];
      const startTime = pick(rng, TIME_SLOTS);
      const apptTypeIdx = Math.floor(rng() * apptTypeDefs.length);
      const duration = apptTypeDefs[apptTypeIdx].duration;
      const endTime = addMinutes(startTime, duration);
      const patientId = pick(rng, patientIds);
      const providerIdx = Math.floor(rng() * providerIds.length);
      const providerId = providerIds[providerIdx];
      const practiceIdx = providerDefs[providerIdx].practiceIdx;
      const practiceId = practiceIds[practiceIdx];
      // Pick operatory from same practice
      const opStart = practiceIdx === 0 ? 0 : 4;
      const operatoryId = operatoryIds[opStart + Math.floor(rng() * 4)];

      // Build procedure list
      const numProcs = 1 + Math.floor(rng() * 3);
      const apptProcs: Array<{ code: string; description: string; fee: number; tooth?: string; surface?: string }> = [];
      const usedCodes = new Set<string>();

      // Always include the main procedure for this appointment type
      const mainProc = PROCEDURES.find((p) => p.code === apptTypeDefs[apptTypeIdx].code);
      if (mainProc) {
        const tooth = ["D2391", "D2392", "D2740", "D2750", "D2140", "D2150", "D7140", "D7210", "D1351"].includes(mainProc.code)
          ? String(1 + Math.floor(rng() * 32))
          : undefined;
        const surface = ["D2391", "D2392", "D2140", "D2150"].includes(mainProc.code)
          ? pick(rng, ["M", "O", "D", "MO", "DO", "MOD", "B", "L"])
          : undefined;
        apptProcs.push({ code: mainProc.code, description: mainProc.description, fee: mainProc.fee, tooth, surface });
        usedCodes.add(mainProc.code);
      }

      // Add additional procedures
      for (let j = 1; j < numProcs; j++) {
        const proc = pick(rng, PROCEDURES);
        if (usedCodes.has(proc.code)) continue;
        usedCodes.add(proc.code);
        const tooth = ["D2391", "D2392", "D2740", "D2750", "D2140", "D2150", "D7140", "D7210", "D1351"].includes(proc.code)
          ? String(1 + Math.floor(rng() * 32))
          : undefined;
        const surface = ["D2391", "D2392", "D2140", "D2150"].includes(proc.code)
          ? pick(rng, ["M", "O", "D", "MO", "DO", "MOD", "B", "L"])
          : undefined;
        apptProcs.push({ code: proc.code, description: proc.description, fee: proc.fee, tooth, surface });
      }

      const totalFee = apptProcs.reduce((sum, p) => sum + p.fee, 0);

      const completedAt = status === "completed" ? date.getTime() + 2 * HOUR_MS : undefined;
      const cancelledAt = status === "cancelled" ? date.getTime() - DAY_MS : undefined;
      const confirmedAt = (status === "confirmed" || status === "completed") ? date.getTime() - DAY_MS : undefined;

      const id = await ctx.db.insert("appointments", {
        orgId,
        practiceId,
        patientId,
        providerId,
        operatoryId,
        appointmentTypeId: apptTypeIds[apptTypeIdx],
        date: dateStr,
        startTime,
        endTime,
        duration,
        status,
        productionAmount: totalFee,
        procedures: apptProcs,
        pmsAppointmentId: `PMSAPT-${30000 + i}`,
        confirmedAt,
        completedAt,
        cancelledAt,
        cancellationReason: status === "cancelled" ? pick(rng, ["Patient request", "Schedule conflict", "Provider illness", "Weather"]) : undefined,
        lastSyncAt: now - Math.floor(rng() * DAY_MS),
        createdAt: date.getTime() - DAY_MS * 14,
        updatedAt: date.getTime(),
      });

      appointmentIds.push(id);
      if (status === "completed") {
        completedApptIds.push(id);
      }
      appointmentMeta.push({ id, patientId, practiceId, procedures: apptProcs, totalFee, status });
    }

    // ========================================================================
    // 8. CLAIMS (150)
    // ========================================================================
    const claimStatusDistribution: Array<{
      status: "draft" | "submitted" | "accepted" | "paid" | "denied" | "appealed" | "scrub_failed";
      count: number;
    }> = [
      { status: "draft", count: 10 },
      { status: "submitted", count: 30 },
      { status: "accepted", count: 20 },
      { status: "paid", count: 50 },
      { status: "denied", count: 20 },
      { status: "appealed", count: 10 },
      { status: "scrub_failed", count: 10 },
    ];

    const ageBucketDistribution: Array<{
      bucket: "0-30" | "31-60" | "61-90" | "91-120" | "120+";
      count: number;
      minDays: number;
      maxDays: number;
    }> = [
      { bucket: "0-30", count: 60, minDays: 0, maxDays: 30 },
      { bucket: "31-60", count: 40, minDays: 31, maxDays: 60 },
      { bucket: "61-90", count: 30, minDays: 61, maxDays: 90 },
      { bucket: "91-120", count: 15, minDays: 91, maxDays: 120 },
      { bucket: "120+", count: 5, minDays: 121, maxDays: 180 },
    ];

    const claimIds: Id<"claims">[] = [];
    const deniedClaimIds: Array<{
      claimId: Id<"claims">;
      patientId: Id<"patients">;
      payerId: string;
      payerName: string;
      amount: number;
    }> = [];

    let claimIndex = 0;
    // Build flat array of statuses
    const claimStatuses: Array<"draft" | "submitted" | "accepted" | "paid" | "denied" | "appealed" | "scrub_failed"> = [];
    for (const s of claimStatusDistribution) {
      for (let i = 0; i < s.count; i++) {
        claimStatuses.push(s.status);
      }
    }
    // Build flat array of age buckets
    const ageBuckets: Array<{ bucket: "0-30" | "31-60" | "61-90" | "91-120" | "120+"; minDays: number; maxDays: number }> = [];
    for (const b of ageBucketDistribution) {
      for (let i = 0; i < b.count; i++) {
        ageBuckets.push({ bucket: b.bucket, minDays: b.minDays, maxDays: b.maxDays });
      }
    }

    for (let i = 0; i < 150; i++) {
      const status = claimStatuses[i];
      const ageBucket = ageBuckets[i];
      const ageInDays = ageBucket.minDays + Math.floor(rng() * (ageBucket.maxDays - ageBucket.minDays + 1));

      // Link to completed appointments when available
      const completedMeta = appointmentMeta.filter((a) => a.status === "completed");
      const linkedAppt = completedMeta[i % completedMeta.length];
      const patientId = linkedAppt.patientId;
      const practiceId = linkedAppt.practiceId;
      const appointmentId = linkedAppt.id;

      const carrier = pick(rng, INSURANCE_CARRIERS);
      const claimProcs = linkedAppt.procedures.map((p) => ({
        code: p.code,
        description: p.description,
        fee: p.fee,
        tooth: p.tooth,
        surface: p.surface,
        quantity: 1,
      }));
      const totalCharged = claimProcs.reduce((sum, p) => sum + p.fee, 0);

      const isPaid = status === "paid";
      const totalPaid = isPaid ? Math.round(totalCharged * (0.5 + rng() * 0.4) * 100) / 100 : undefined;
      const patientPortion = isPaid ? Math.round((totalCharged - (totalPaid ?? 0)) * 100) / 100 : undefined;
      const adjustments = isPaid && rng() < 0.3 ? Math.round(rng() * 100 * 100) / 100 : undefined;

      const claimCreatedAt = now - ageInDays * DAY_MS;
      const submittedAt = ["submitted", "accepted", "paid", "denied", "appealed"].includes(status)
        ? claimCreatedAt + Math.floor(rng() * DAY_MS * 2)
        : undefined;
      const acceptedAt = ["accepted", "paid"].includes(status)
        ? (submittedAt ?? claimCreatedAt) + Math.floor(rng() * DAY_MS * 5)
        : undefined;
      const paidAt = status === "paid"
        ? (acceptedAt ?? claimCreatedAt) + Math.floor(rng() * DAY_MS * 14)
        : undefined;

      const scrubErrors = status === "scrub_failed"
        ? [
            {
              code: pick(rng, ["E001", "E002", "E003", "E004"]),
              message: pick(rng, [
                "Missing patient date of birth",
                "Invalid procedure code combination",
                "Missing tooth number for restorative procedure",
                "Subscriber information does not match payer records",
              ]),
              severity: "error" as const,
              field: pick(rng, ["patientDob", "procedureCode", "toothNumber", "subscriberInfo"]),
            },
          ]
        : undefined;

      const claimNumber = `CLM-${String(50000 + i).padStart(7, "0")}`;

      const id = await ctx.db.insert("claims", {
        orgId,
        practiceId,
        patientId,
        appointmentId,
        claimNumber,
        pmsClaimId: `PMSCL-${40000 + i}`,
        payerId: carrier.payerId,
        payerName: carrier.payerName,
        status,
        procedures: claimProcs,
        totalCharged,
        totalPaid,
        patientPortion,
        adjustments,
        scrubErrors,
        scrubPassedAt: !["draft", "scrub_failed"].includes(status) ? claimCreatedAt + HOUR_MS : undefined,
        submittedAt,
        acceptedAt,
        paidAt,
        ageInDays,
        ageBucket: ageBucket.bucket,
        createdAt: claimCreatedAt,
        updatedAt: now - Math.floor(rng() * DAY_MS * 3),
      });

      claimIds.push(id);
      claimIndex++;

      if (status === "denied") {
        deniedClaimIds.push({
          claimId: id,
          patientId,
          payerId: carrier.payerId,
          payerName: carrier.payerName,
          amount: totalCharged,
        });
      }
    }

    // ========================================================================
    // 9. DENIALS (30)
    // ========================================================================
    // Category distribution: eligibility(5), coding(8), documentation(7), authorization(5), timely_filing(3), duplicate(2)
    const denialCategoryDist: Array<"eligibility" | "coding" | "documentation" | "authorization" | "timely_filing" | "duplicate"> = [
      ...Array(5).fill("eligibility") as "eligibility"[],
      ...Array(8).fill("coding") as "coding"[],
      ...Array(7).fill("documentation") as "documentation"[],
      ...Array(5).fill("authorization") as "authorization"[],
      ...Array(3).fill("timely_filing") as "timely_filing"[],
      ...Array(2).fill("duplicate") as "duplicate"[],
    ];

    const denialStatuses: Array<"new" | "acknowledged" | "appealing" | "appealed" | "won" | "lost" | "written_off"> = [
      "new", "new", "new", "new", "new",
      "acknowledged", "acknowledged", "acknowledged", "acknowledged",
      "appealing", "appealing", "appealing",
      "appealed", "appealed", "appealed", "appealed",
      "won", "won", "won", "won", "won",
      "lost", "lost", "lost",
      "written_off", "written_off", "written_off", "written_off", "written_off", "written_off",
    ];

    for (let i = 0; i < 30; i++) {
      const category = denialCategoryDist[i];
      const status = denialStatuses[i];

      // Get reasons matching category
      const categoryReasons = DENIAL_REASONS.filter((r) => r.category === category);
      const reason = pick(rng, categoryReasons);

      // Link to denied claims (cycle through them)
      const deniedClaim = deniedClaimIds[i % deniedClaimIds.length];

      const denialCreatedAt = now - Math.floor(rng() * 60) * DAY_MS;
      const denialDate = new Date(denialCreatedAt).toISOString().split("T")[0];

      await ctx.db.insert("denials", {
        orgId,
        claimId: deniedClaim.claimId,
        patientId: deniedClaim.patientId,
        payerId: deniedClaim.payerId,
        payerName: deniedClaim.payerName,
        denialDate,
        reasonCode: reason.reasonCode,
        reasonDescription: reason.reasonDescription,
        category,
        amount: deniedClaim.amount,
        status,
        aiCategorization: category,
        aiConfidence: 0.75 + rng() * 0.24,
        assignedTo: pick(rng, [userIds[2], userIds[3]]), // billing users
        acknowledgedAt: ["acknowledged", "appealing", "appealed", "won", "lost", "written_off"].includes(status)
          ? denialCreatedAt + HOUR_MS * 4
          : undefined,
        slaDeadline: denialCreatedAt + DAY_MS,
        isEscalated: rng() < 0.15,
        createdAt: denialCreatedAt,
        updatedAt: now - Math.floor(rng() * DAY_MS * 5),
      });
    }

    // ========================================================================
    // 10. REVIEWS (50)
    // ========================================================================
    // Rating distribution: 5-star(25), 4-star(10), 3-star(8), 2-star(4), 1-star(3)
    const ratingDist = [
      ...Array(25).fill(5) as number[],
      ...Array(10).fill(4) as number[],
      ...Array(8).fill(3) as number[],
      ...Array(4).fill(2) as number[],
      ...Array(3).fill(1) as number[],
    ];

    const responseStatuses: Array<"pending" | "draft_ready" | "approved" | "posted" | "skipped"> = [
      ...Array(10).fill("pending") as "pending"[],
      ...Array(10).fill("draft_ready") as "draft_ready"[],
      ...Array(10).fill("approved") as "approved"[],
      ...Array(15).fill("posted") as "posted"[],
      ...Array(5).fill("skipped") as "skipped"[],
    ];

    for (let i = 0; i < 50; i++) {
      const rating = ratingDist[i];
      const responseStatus = responseStatuses[i];

      let textPool: string[];
      if (rating === 5) textPool = REVIEW_TEXTS_5STAR;
      else if (rating === 4) textPool = REVIEW_TEXTS_4STAR;
      else if (rating === 3) textPool = REVIEW_TEXTS_3STAR;
      else if (rating === 2) textPool = REVIEW_TEXTS_2STAR;
      else textPool = REVIEW_TEXTS_1STAR;

      const text = textPool[i % textPool.length];
      const reviewerName = `${pick(rng, REVIEWER_FIRST_NAMES)} ${pick(rng, LAST_NAMES).charAt(0)}.`;

      const sentiment: "positive" | "neutral" | "negative" =
        rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";

      const sentimentKeywords = sentiment === "positive"
        ? pickN(rng, ["friendly", "professional", "clean", "skilled", "gentle", "caring", "modern", "efficient", "thorough", "comfortable"], 3)
        : sentiment === "negative"
          ? pickN(rng, ["long wait", "rude", "billing issue", "rushed", "overpriced", "upselling", "late", "disorganized"], 3)
          : pickN(rng, ["average", "adequate", "okay", "fine", "decent"], 2);

      const daysAgo = Math.floor(rng() * 180);
      const publishedAt = now - daysAgo * DAY_MS;
      const matchedPatientId = rng() < 0.6 ? pick(rng, patientIds) : undefined;

      await ctx.db.insert("reviews", {
        orgId,
        practiceId: pick(rng, practiceIds),
        source: "google",
        externalReviewId: `goog-review-${String(60000 + i)}`,
        reviewerName,
        matchedPatientId,
        rating,
        text,
        publishedAt,
        sentiment,
        sentimentKeywords,
        responseStatus,
        isPriority: rating <= 2,
        alertSentAt: rating <= 2 ? publishedAt + HOUR_MS : undefined,
        createdAt: publishedAt,
        updatedAt: now - Math.floor(rng() * DAY_MS * 7),
      });
    }

    // ========================================================================
    // 11. TASKS (20)
    // ========================================================================
    const taskStatuses: Array<"open" | "in_progress" | "completed"> = [
      ...Array(8).fill("open") as "open"[],
      ...Array(6).fill("in_progress") as "in_progress"[],
      ...Array(6).fill("completed") as "completed"[],
    ];

    for (let i = 0; i < 20; i++) {
      const template = TASK_TEMPLATES[i];
      const status = taskStatuses[i];

      const slaDeadline = now + (1 + Math.floor(rng() * 5)) * DAY_MS;
      const slaStatus: "on_track" | "at_risk" | "overdue" =
        status === "completed" ? "on_track" : rng() < 0.6 ? "on_track" : rng() < 0.8 ? "at_risk" : "overdue";

      // Find a user with the matching role
      const matchingUsers = userDefs.map((u, idx) => ({ ...u, id: userIds[idx] })).filter((u) => u.role === template.assignedRole);
      const assignedTo = matchingUsers.length > 0 ? pick(rng, matchingUsers).id : userIds[0];

      const taskCreatedAt = now - Math.floor(rng() * 14) * DAY_MS;

      await ctx.db.insert("tasks", {
        orgId,
        title: template.title,
        description: template.description,
        resourceType: template.resourceType,
        assignedRole: template.assignedRole,
        assignedTo,
        priority: template.priority,
        status,
        slaDeadline,
        slaStatus,
        isEscalated: slaStatus === "overdue",
        completedBy: status === "completed" ? assignedTo : undefined,
        completedAt: status === "completed" ? now - Math.floor(rng() * 3) * DAY_MS : undefined,
        createdAt: taskCreatedAt,
        updatedAt: now - Math.floor(rng() * DAY_MS * 2),
      });
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log(`Seed data created for org ${orgId}:`);
    console.log(`  Practices: 2`);
    console.log(`  Providers: ${providerIds.length}`);
    console.log(`  Operatories: ${operatoryIds.length}`);
    console.log(`  Appointment Types: ${apptTypeIds.length}`);
    console.log(`  Users: ${userIds.length}`);
    console.log(`  Patients: ${patientIds.length}`);
    console.log(`  Appointments: ${appointmentIds.length}`);
    console.log(`  Claims: ${claimIds.length}`);
    console.log(`  Denials: 30`);
    console.log(`  Reviews: 50`);
    console.log(`  Tasks: 20`);

    return {
      seeded: true,
      counts: {
        practices: 2,
        providers: providerIds.length,
        operatories: operatoryIds.length,
        appointmentTypes: apptTypeIds.length,
        users: userIds.length,
        patients: patientIds.length,
        appointments: appointmentIds.length,
        claims: claimIds.length,
        denials: 30,
        reviews: 50,
        tasks: 20,
      },
    };
  },
});
