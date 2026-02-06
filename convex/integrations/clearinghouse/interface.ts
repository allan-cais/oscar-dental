// Clearinghouse Adapter Interface
// Primary provider: Vyne Dental for claim submission
// Eligibility verification, claim lifecycle, ERA processing

export interface SubscriberInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  memberId: string;
  groupNumber?: string;
  relationship?: string; // "self" | "spouse" | "child" | "other"
}

export interface EligibilityBenefits {
  annualMaximum?: number;
  annualUsed?: number;
  annualRemaining?: number;
  deductible?: number;
  deductibleMet?: number;
  preventiveCoverage?: number; // percentage 0-100
  basicCoverage?: number;
  majorCoverage?: number;
  orthodonticCoverage?: number;
  orthodonticLifetimeMax?: number;
  waitingPeriods?: Array<{
    category: string;
    monthsRemaining: number;
  }>;
  frequencyLimitations?: Array<{
    procedureCode: string;
    description: string;
    frequency: string; // "2 per calendar year", "1 per 5 years"
    lastPerformed?: string;
  }>;
}

export interface EligibilityResult {
  payerId: string;
  payerName: string;
  memberId: string;
  subscriberName: string;
  status: "active" | "inactive" | "error";
  effectiveDate?: string;
  terminationDate?: string;
  planName?: string;
  planType?: string; // "PPO" | "HMO" | "EPO" | "Indemnity"
  benefits?: EligibilityBenefits;
  inNetwork: boolean;
  errorMessage?: string;
  verifiedAt: number; // timestamp
  rawResponse?: string;
}

export interface ClaimSubmissionData {
  patientId: string;
  subscriberInfo: SubscriberInfo;
  payerId: string;
  payerName: string;
  providerId: string;
  providerNpi: string;
  facilityNpi?: string;
  procedures: Array<{
    code: string;
    description: string;
    fee: number;
    tooth?: string;
    surface?: string;
    quantity?: number;
    dateOfService: string;
  }>;
  totalCharged: number;
  priorAuthNumber?: string;
  attachments?: Array<{
    type: string;
    description: string;
  }>;
}

export interface ClaimSubmissionResult {
  claimNumber: string;
  status: "accepted" | "rejected";
  acceptedAt?: number;
  rejectedReason?: string;
  trackingId: string;
}

export interface ClaimStatusResult {
  claimNumber: string;
  status: "pending" | "in_review" | "processed" | "paid" | "denied" | "rejected";
  statusDate: string;
  paidAmount?: number;
  adjustments?: number;
  patientResponsibility?: number;
  denialReasonCode?: string;
  denialReasonDescription?: string;
  checkNumber?: string;
  checkDate?: string;
  remarks?: string[];
}

export interface EraRecord {
  eraId: string;
  payerId: string;
  payerName: string;
  checkNumber?: string;
  checkDate?: string;
  totalPaid: number;
  claimPayments: Array<{
    claimNumber: string;
    patientName?: string;
    dateOfService?: string;
    amountCharged: number;
    amountPaid: number;
    adjustments?: number;
    patientResponsibility?: number;
    procedures: Array<{
      code: string;
      charged: number;
      paid: number;
      adjustmentReason?: string;
    }>;
  }>;
}

export interface ClearinghouseAdapter {
  // Eligibility
  verifyEligibility(
    payerId: string,
    memberId: string,
    subscriberInfo: SubscriberInfo
  ): Promise<EligibilityResult>;

  // Claims
  submitClaim(claimData: ClaimSubmissionData): Promise<ClaimSubmissionResult>;
  getClaimStatus(claimNumber: string): Promise<ClaimStatusResult>;

  // ERA
  fetchERA(params: {
    fromDate?: string;
    toDate?: string;
    payerId?: string;
  }): Promise<EraRecord[]>;
}
