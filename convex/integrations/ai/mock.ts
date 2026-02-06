import type {
  AiAdapter,
  TextAnalysisResult,
  GenerationResult,
  DenialCategorizationResult,
  SatisfactionPrediction,
  AppealLetterResult,
  PatientSuggestion,
} from "./interface";

function delay(min = 200, max = 500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Denial categorization knowledge base
// ---------------------------------------------------------------------------
const DENIAL_CODE_MAP: Record<string, {
  category: DenialCategorizationResult["category"];
  action: string;
  appealable: boolean;
}> = {
  "CO-4": { category: "coding", action: "Review modifier usage and resubmit with correct modifier", appealable: true },
  "CO-16": { category: "documentation", action: "Gather missing clinical documentation and resubmit", appealable: true },
  "CO-29": { category: "timely_filing", action: "Check original submission date; file exception if within deadline", appealable: false },
  "CO-50": { category: "authorization", action: "Obtain medical necessity documentation from provider", appealable: true },
  "CO-96": { category: "coding", action: "Verify CDT code applicability and bundling rules", appealable: true },
  "CO-97": { category: "duplicate", action: "Verify this is not a duplicate; resubmit with explanation if unique", appealable: true },
  "CO-197": { category: "authorization", action: "Obtain pre-authorization retroactively if possible", appealable: true },
  "PR-1": { category: "eligibility", action: "Verify deductible status and patient responsibility", appealable: false },
  "PR-2": { category: "eligibility", action: "Check coinsurance calculation and benefit levels", appealable: true },
  "PR-3": { category: "eligibility", action: "Verify copay amount against fee schedule", appealable: false },
};

// ---------------------------------------------------------------------------
// Mock appeal letter templates
// ---------------------------------------------------------------------------
function generateMockAppealLetter(
  denial: { reasonCode: string; reasonDescription: string; category: string },
  claim: {
    patientName: string;
    dateOfService: string;
    procedures: Array<{ code: string; description: string }>;
    payerName: string;
    providerName: string;
    providerNpi: string;
  }
): string {
  const procList = claim.procedures
    .map((p) => `  - ${p.code}: ${p.description}`)
    .join("\n");

  return `${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${claim.payerName}
Claims Appeals Department

Re: Appeal for Denied Claim
Patient: ${claim.patientName}
Date of Service: ${claim.dateOfService}
Denial Reason: ${denial.reasonCode} - ${denial.reasonDescription}

Dear Claims Review Committee,

I am writing to formally appeal the denial of the above-referenced claim on behalf of my patient, ${claim.patientName}. The services rendered on ${claim.dateOfService} were clinically necessary and appropriate for the patient's condition.

The following procedures were performed:
${procList}

${denial.category === "documentation" ? `Enclosed please find the supporting clinical documentation, including periodontal charting, radiographs, and clinical narrative that demonstrate the medical necessity of the treatment provided.` : ""}${denial.category === "coding" ? `Upon review, the CDT codes submitted accurately reflect the services provided. The procedures were distinct and separately identifiable, warranting individual reimbursement per ADA coding guidelines.` : ""}${denial.category === "authorization" ? `While prior authorization was not obtained before the date of service, the treatment was emergent in nature and necessary to prevent further deterioration of the patient's oral health. We are requesting retroactive authorization based on the clinical circumstances.` : ""}${denial.category === "eligibility" ? `We have confirmed with the patient that their coverage was active on the date of service. Please re-verify the eligibility status and reprocess this claim accordingly.` : ""}${denial.category === "timely_filing" ? `Our records indicate the original claim was submitted within the contractual filing deadline. Attached is proof of timely submission including the electronic claim receipt and acceptance confirmation.` : ""}

I respectfully request that you reconsider this denial and reprocess the claim for appropriate reimbursement. Should you require any additional information, please do not hesitate to contact our office.

Sincerely,

${claim.providerName}
NPI: ${claim.providerNpi}`;
}

// ---------------------------------------------------------------------------
// Review response templates
// ---------------------------------------------------------------------------
const POSITIVE_RESPONSES = [
  "Thank you so much for your kind words! We are thrilled to hear about your positive experience. Our team works hard to make every visit comfortable and efficient. We look forward to seeing you at your next appointment!",
  "We truly appreciate you taking the time to leave such a wonderful review. It means a lot to our entire team. We are committed to providing excellent dental care and are glad it shows. See you next time!",
  "Thank you for your glowing review! We are so happy you had a great experience with us. Patient comfort and care are our top priorities. We look forward to continuing to serve you and your family.",
];

const NEUTRAL_RESPONSES = [
  "Thank you for your feedback. We appreciate you sharing your experience and are always looking for ways to improve. If there is anything specific we can do better, please do not hesitate to reach out to our office directly.",
  "We appreciate your review and value your honest feedback. Your input helps us improve our services. Please feel free to contact our office manager if you would like to discuss your experience further.",
];

const NEGATIVE_RESPONSES = [
  "We are sorry to hear about your experience and take your feedback seriously. This does not reflect the standard of care we strive for. Please contact our office manager at your earliest convenience so we can address your concerns directly and make things right.",
  "Thank you for bringing this to our attention. We sincerely apologize for the inconvenience you experienced. We would like the opportunity to resolve this issue. Please call our office and ask to speak with our patient advocate so we can work together on a solution.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export class MockAiAdapter implements AiAdapter {
  async analyzeText(
    text: string,
    purpose: "sentiment" | "categorization" | "extraction" | "phi_check"
  ): Promise<TextAnalysisResult> {
    await delay();

    if (purpose === "sentiment") {
      const lower = text.toLowerCase();
      const positiveWords = ["great", "excellent", "wonderful", "best", "love", "amazing", "fantastic", "recommend", "friendly", "gentle", "painless"];
      const negativeWords = ["terrible", "worst", "horrible", "rude", "waited", "pain", "billing", "charge", "refund", "frustrated", "disappointed"];
      const posCount = positiveWords.filter((w) => lower.includes(w)).length;
      const negCount = negativeWords.filter((w) => lower.includes(w)).length;

      let sentiment: string;
      let confidence: number;
      if (posCount > negCount) {
        sentiment = "positive";
        confidence = Math.min(0.95, 0.6 + posCount * 0.08);
      } else if (negCount > posCount) {
        sentiment = "negative";
        confidence = Math.min(0.95, 0.6 + negCount * 0.08);
      } else {
        sentiment = "neutral";
        confidence = 0.55;
      }

      const keywords = [...positiveWords, ...negativeWords].filter((w) => lower.includes(w));

      return {
        result: JSON.stringify({ sentiment, keywords }),
        confidence,
        tokens_used: Math.floor(text.length / 4) + 50,
      };
    }

    if (purpose === "phi_check") {
      // Check for common PHI patterns
      const phiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{2}\/\d{2}\/\d{4}\b/, // DOB
        /patient\s+name/i,
        /\bDOB\b/,
        /\bSSN\b/,
        /member\s*id/i,
      ];
      const containsPhi = phiPatterns.some((p) => p.test(text));
      return {
        result: JSON.stringify({ containsPhi, safe: !containsPhi }),
        confidence: containsPhi ? 0.92 : 0.88,
        tokens_used: Math.floor(text.length / 4) + 30,
      };
    }

    return {
      result: JSON.stringify({ category: "general", summary: text.slice(0, 100) }),
      confidence: 0.75,
      tokens_used: Math.floor(text.length / 4) + 40,
    };
  }

  async generateResponse(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<GenerationResult> {
    await delay(250, 500);

    // Determine type from context/prompt
    const lower = prompt.toLowerCase();
    let text: string;

    if (lower.includes("review") && lower.includes("response")) {
      const rating = (context?.rating as number) ?? 5;
      if (rating >= 4) text = pickRandom(POSITIVE_RESPONSES);
      else if (rating >= 3) text = pickRandom(NEUTRAL_RESPONSES);
      else text = pickRandom(NEGATIVE_RESPONSES);
    } else if (lower.includes("reminder") || lower.includes("appointment")) {
      const patientName = (context?.patientName as string) ?? "there";
      const date = (context?.date as string) ?? "your upcoming appointment";
      text = `Hi ${patientName}, this is a reminder from Canopy Dental about your appointment on ${date}. Please reply CONFIRM to confirm or call us at (512) 555-0100 to reschedule. Reply STOP to opt out.`;
    } else if (lower.includes("payment") || lower.includes("balance")) {
      const patientName = (context?.patientName as string) ?? "there";
      const amount = (context?.amount as string) ?? "your balance";
      text = `Hi ${patientName}, you have an outstanding balance of ${amount} at Canopy Dental. Pay securely online: [payment_link]. Questions? Call (512) 555-0100. Reply STOP to opt out.`;
    } else if (lower.includes("recall") || lower.includes("cleaning")) {
      const patientName = (context?.patientName as string) ?? "there";
      text = `Hi ${patientName}, it is time to schedule your next cleaning at Canopy Dental! Regular cleanings help prevent cavities and gum disease. Book online or call (512) 555-0100. Reply STOP to opt out.`;
    } else {
      text = "Thank you for reaching out. A member of our team will follow up with you shortly. If you need immediate assistance, please call our office at (512) 555-0100.";
    }

    return {
      text,
      tokensUsed: Math.floor(text.length / 4) + 20,
    };
  }

  async categorizeDenial(denialInfo: {
    reasonCode: string;
    reasonDescription: string;
    procedureCodes: string[];
    payerName: string;
    amount: number;
  }): Promise<DenialCategorizationResult> {
    await delay(200, 400);

    const known = DENIAL_CODE_MAP[denialInfo.reasonCode];

    if (known) {
      return {
        category: known.category,
        confidence: 0.85 + Math.random() * 0.1,
        reasoning: `Denial code ${denialInfo.reasonCode} from ${denialInfo.payerName} maps to ${known.category} category. ${denialInfo.reasonDescription}. This is a common denial pattern for procedures ${denialInfo.procedureCodes.join(", ")}.`,
        suggestedAction: known.action,
        appealable: known.appealable,
      };
    }

    // Unknown code - provide best guess
    return {
      category: "other",
      confidence: 0.55 + Math.random() * 0.15,
      reasoning: `Denial code ${denialInfo.reasonCode} is not in the standard mapping. Based on the description "${denialInfo.reasonDescription}" and procedures involved, this may require manual review by the billing team.`,
      suggestedAction: "Escalate to billing supervisor for manual review and payer follow-up",
      appealable: true,
    };
  }

  async predictSatisfaction(patientData: {
    recentProcedures: string[];
    waitTimeMinutes?: number;
    providerName: string;
    hasOpenBalance: boolean;
    visitCount: number;
    lastRating?: number;
  }): Promise<SatisfactionPrediction> {
    await delay(150, 350);

    const factors: SatisfactionPrediction["factors"] = [];
    let baseScore = 7.5;

    // Wait time factor
    const wait = patientData.waitTimeMinutes ?? 0;
    if (wait <= 5) {
      factors.push({ factor: "Minimal wait time", impact: "positive", weight: 0.15 });
      baseScore += 0.5;
    } else if (wait > 20) {
      factors.push({ factor: `Extended wait (${wait} min)`, impact: "negative", weight: 0.25 });
      baseScore -= 1.0;
    } else {
      factors.push({ factor: "Acceptable wait time", impact: "neutral", weight: 0.05 });
    }

    // Procedure complexity factor
    const complexProcs = ["D3310", "D3320", "D3330", "D7140", "D7210", "D7240", "D2740", "D2750"];
    const hasComplex = patientData.recentProcedures.some((p) => complexProcs.includes(p));
    if (hasComplex) {
      factors.push({ factor: "Complex procedure performed", impact: "negative", weight: 0.15 });
      baseScore -= 0.5;
    } else {
      factors.push({ factor: "Routine procedure", impact: "positive", weight: 0.1 });
      baseScore += 0.3;
    }

    // Open balance factor
    if (patientData.hasOpenBalance) {
      factors.push({ factor: "Outstanding patient balance", impact: "negative", weight: 0.2 });
      baseScore -= 0.8;
    }

    // Visit frequency factor
    if (patientData.visitCount >= 5) {
      factors.push({ factor: "Loyal patient (5+ visits)", impact: "positive", weight: 0.2 });
      baseScore += 0.8;
    } else if (patientData.visitCount <= 1) {
      factors.push({ factor: "New patient", impact: "neutral", weight: 0.1 });
    }

    // Previous rating factor
    if (patientData.lastRating) {
      if (patientData.lastRating >= 4) {
        factors.push({ factor: `Previous ${patientData.lastRating}-star rating`, impact: "positive", weight: 0.15 });
        baseScore += 0.5;
      } else if (patientData.lastRating <= 2) {
        factors.push({ factor: `Previous ${patientData.lastRating}-star rating`, impact: "negative", weight: 0.25 });
        baseScore -= 1.5;
      }
    }

    const score = Math.max(1, Math.min(10, Math.round(baseScore * 10) / 10));

    let recommendation: SatisfactionPrediction["recommendation"];
    if (score >= 7) recommendation = "send_review_request";
    else if (score >= 5) recommendation = "delay_review_request";
    else recommendation = "skip_review_request";

    return { score, factors, recommendation };
  }

  async generateAppealLetter(
    denialInfo: {
      reasonCode: string;
      reasonDescription: string;
      category: string;
    },
    claimInfo: {
      patientName: string;
      dateOfService: string;
      procedures: Array<{ code: string; description: string }>;
      payerName: string;
      providerName: string;
      providerNpi: string;
    }
  ): Promise<AppealLetterResult> {
    const start = Date.now();
    await delay(300, 600);

    const letter = generateMockAppealLetter(denialInfo, claimInfo);

    const suggestedAttachments: string[] = [];
    if (denialInfo.category === "documentation") {
      suggestedAttachments.push("Clinical notes", "Radiographs", "Periodontal charting");
    }
    if (denialInfo.category === "authorization") {
      suggestedAttachments.push("Clinical narrative", "Medical necessity justification");
    }
    if (denialInfo.category === "coding") {
      suggestedAttachments.push("ADA coding reference", "Procedure notes");
    }
    if (denialInfo.category === "timely_filing") {
      suggestedAttachments.push("Original submission receipt", "Clearinghouse confirmation");
    }
    suggestedAttachments.push("Copy of original claim");

    return {
      letter,
      confidence: 0.8 + Math.random() * 0.15,
      generationTimeMs: Date.now() - start,
      suggestedAttachments,
    };
  }

  async suggestPatients(
    slotInfo: {
      date: string;
      startTime: string;
      duration: number;
      providerName: string;
      procedureCategory?: string;
    },
    candidates: Array<{
      patientId: string;
      name: string;
      phone?: string;
      preferredDays?: string[];
      preferredTimes?: string[];
      urgency: string;
      productionValue?: number;
      lastContactedAt?: number;
    }>
  ): Promise<PatientSuggestion[]> {
    await delay(200, 400);

    const dayOfWeek = new Date(slotInfo.date).toLocaleDateString("en-US", { weekday: "long" });
    const slotHour = parseInt(slotInfo.startTime.split(":")[0], 10);
    const slotPeriod = slotHour < 12 ? "morning" : slotHour < 15 ? "afternoon" : "evening";

    return candidates
      .map((c) => {
        let score = 50;
        const reasons: string[] = [];

        // Urgency scoring
        if (c.urgency === "urgent") { score += 30; reasons.push("urgent need"); }
        else if (c.urgency === "high") { score += 20; reasons.push("high priority"); }
        else if (c.urgency === "medium") { score += 10; }

        // Preferred day match
        if (c.preferredDays?.some((d) => d.toLowerCase() === dayOfWeek.toLowerCase())) {
          score += 15;
          reasons.push(`prefers ${dayOfWeek}s`);
        }

        // Preferred time match
        if (c.preferredTimes?.some((t) => t.toLowerCase().includes(slotPeriod))) {
          score += 10;
          reasons.push(`prefers ${slotPeriod} appointments`);
        }

        // Production value
        if (c.productionValue && c.productionValue > 500) {
          score += 10;
          reasons.push(`high production value ($${c.productionValue})`);
        }

        // Recency penalty (avoid contacting too frequently)
        if (c.lastContactedAt) {
          const daysSinceContact = (Date.now() - c.lastContactedAt) / (1000 * 60 * 60 * 24);
          if (daysSinceContact < 2) {
            score -= 20;
            reasons.push("contacted recently");
          }
        }

        // Has phone
        if (c.phone) {
          score += 5;
          reasons.push("phone available");
        } else {
          score -= 15;
          reasons.push("no phone on file");
        }

        return {
          patientId: c.patientId,
          score: Math.max(0, Math.min(100, score)),
          rationale: `${c.name}: ${reasons.join(", ")}`,
          contactPreference: c.phone ? "sms" : "email",
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
