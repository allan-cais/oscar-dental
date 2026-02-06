// AI Adapter Interface
// Primary provider: OpenAI
// Denial categorization, appeal letters, review responses,
// satisfaction prediction, patient suggestion for scheduling

export interface TextAnalysisResult {
  result: string;
  confidence: number; // 0-1
  tokens_used: number;
  metadata?: Record<string, unknown>;
}

export interface GenerationResult {
  text: string;
  tokensUsed: number;
}

export interface DenialCategorizationResult {
  category: "eligibility" | "coding" | "documentation" | "authorization" | "timely_filing" | "duplicate" | "other";
  confidence: number; // 0-1
  reasoning: string;
  suggestedAction: string;
  appealable: boolean;
}

export interface SatisfactionPrediction {
  score: number; // 1-10
  factors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number; // 0-1
  }>;
  recommendation: "send_review_request" | "delay_review_request" | "skip_review_request";
}

export interface AppealLetterResult {
  letter: string;
  confidence: number; // 0-1
  generationTimeMs: number;
  suggestedAttachments: string[];
}

export interface PatientSuggestion {
  patientId: string;
  score: number; // 0-100
  rationale: string;
  contactPreference: string;
}

export interface AiAdapter {
  // General text analysis (sentiment, categorization, etc.)
  analyzeText(
    text: string,
    purpose: "sentiment" | "categorization" | "extraction" | "phi_check"
  ): Promise<TextAnalysisResult>;

  // General text generation
  generateResponse(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<GenerationResult>;

  // Denial-specific categorization
  categorizeDenial(denialInfo: {
    reasonCode: string;
    reasonDescription: string;
    procedureCodes: string[];
    payerName: string;
    amount: number;
  }): Promise<DenialCategorizationResult>;

  // Predict patient satisfaction for review routing
  predictSatisfaction(patientData: {
    recentProcedures: string[];
    waitTimeMinutes?: number;
    providerName: string;
    hasOpenBalance: boolean;
    visitCount: number;
    lastRating?: number;
  }): Promise<SatisfactionPrediction>;

  // Generate appeal letter for denied claim
  generateAppealLetter(
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
  ): Promise<AppealLetterResult>;

  // Suggest best patients for a Quick Fill slot
  suggestPatients(
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
  ): Promise<PatientSuggestion[]>;
}
