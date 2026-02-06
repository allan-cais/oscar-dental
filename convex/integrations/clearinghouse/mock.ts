import type {
  ClearinghouseAdapter,
  SubscriberInfo,
  EligibilityResult,
  ClaimSubmissionData,
  ClaimSubmissionResult,
  ClaimStatusResult,
  EraRecord,
} from "./interface";

function delay(min = 80, max = 250): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ---------------------------------------------------------------------------
// Realistic payer data
// ---------------------------------------------------------------------------
const PAYER_PLANS: Record<string, { name: string; planType: string; planName: string }> = {
  CIG01: { name: "Cigna Dental", planType: "PPO", planName: "Cigna Dental PPO 1500" },
  DELTA01: { name: "Delta Dental Premier", planType: "PPO", planName: "Delta Dental Premier" },
  AETNA01: { name: "Aetna Dental", planType: "PPO", planName: "Aetna Dental PPO" },
  METLIFE01: { name: "MetLife Dental", planType: "PPO", planName: "MetLife PDP Plus" },
  UHC01: { name: "United Healthcare Dental", planType: "PPO", planName: "UHC Dental PPO" },
  BCBS01: { name: "Blue Cross Blue Shield TX", planType: "PPO", planName: "BCBS Dental Choice" },
  GUARDIAN01: { name: "Guardian Dental", planType: "PPO", planName: "Guardian DentalGuard Preferred" },
  HUMANA01: { name: "Humana Dental", planType: "HMO", planName: "Humana Dental Value HMO" },
};

function generateBenefits() {
  const annualMax = [1000, 1500, 2000, 2500][Math.floor(Math.random() * 4)];
  const used = Math.floor(Math.random() * annualMax * 0.6);
  const deductible = [0, 25, 50, 75, 100][Math.floor(Math.random() * 5)];
  const deductibleMet = Math.random() > 0.4 ? deductible : Math.floor(Math.random() * deductible);

  return {
    annualMaximum: annualMax,
    annualUsed: used,
    annualRemaining: annualMax - used,
    deductible,
    deductibleMet,
    preventiveCoverage: 100,
    basicCoverage: [70, 80][Math.floor(Math.random() * 2)],
    majorCoverage: [50, 60][Math.floor(Math.random() * 2)],
    waitingPeriods:
      Math.random() > 0.7
        ? [{ category: "Major", monthsRemaining: Math.floor(Math.random() * 6) + 1 }]
        : [],
    frequencyLimitations: [
      {
        procedureCode: "D0274",
        description: "Bitewings",
        frequency: "2 per calendar year",
        lastPerformed: "2025-08-15",
      },
      {
        procedureCode: "D0210",
        description: "Complete series",
        frequency: "1 per 3 years",
        lastPerformed: "2024-01-10",
      },
      {
        procedureCode: "D1110",
        description: "Adult prophylaxis",
        frequency: "2 per calendar year",
      },
      {
        procedureCode: "D0330",
        description: "Panoramic radiograph",
        frequency: "1 per 5 years",
        lastPerformed: "2023-06-20",
      },
    ],
  };
}

// Track submitted claims for status lookups
const claimStore = new Map<
  string,
  { data: ClaimSubmissionData; status: ClaimStatusResult["status"]; submittedAt: number }
>();

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export class MockClearinghouseAdapter implements ClearinghouseAdapter {
  async verifyEligibility(
    payerId: string,
    memberId: string,
    subscriberInfo: SubscriberInfo
  ): Promise<EligibilityResult> {
    await delay(100, 300); // Real eligibility checks take up to 30s; mock is faster

    const payer = PAYER_PLANS[payerId];

    // Simulate ~5% error rate
    if (Math.random() < 0.05) {
      return {
        payerId,
        payerName: payer?.name ?? "Unknown Payer",
        memberId,
        subscriberName: `${subscriberInfo.firstName} ${subscriberInfo.lastName}`,
        status: "error",
        inNetwork: false,
        errorMessage: "Unable to verify eligibility. Payer system timeout.",
        verifiedAt: Date.now(),
      };
    }

    // Simulate ~8% inactive
    if (Math.random() < 0.08) {
      return {
        payerId,
        payerName: payer?.name ?? "Unknown Payer",
        memberId,
        subscriberName: `${subscriberInfo.firstName} ${subscriberInfo.lastName}`,
        status: "inactive",
        terminationDate: "2025-12-31",
        inNetwork: false,
        verifiedAt: Date.now(),
      };
    }

    return {
      payerId,
      payerName: payer?.name ?? "Unknown Payer",
      memberId,
      subscriberName: `${subscriberInfo.firstName} ${subscriberInfo.lastName}`,
      status: "active",
      effectiveDate: "2025-01-01",
      planName: payer?.planName ?? "Standard Dental Plan",
      planType: payer?.planType ?? "PPO",
      benefits: generateBenefits(),
      inNetwork: Math.random() > 0.15,
      verifiedAt: Date.now(),
    };
  }

  async submitClaim(claimData: ClaimSubmissionData): Promise<ClaimSubmissionResult> {
    await delay(150, 300);

    const claimNumber = `VDC-${new Date().getFullYear()}-${randomId()}`;
    const trackingId = `TRK-${randomId()}`;

    // Simulate ~3% rejection at submission
    if (Math.random() < 0.03) {
      return {
        claimNumber,
        status: "rejected",
        rejectedReason:
          "Invalid NPI number. Rendering provider NPI does not match registered records.",
        trackingId,
      };
    }

    claimStore.set(claimNumber, {
      data: claimData,
      status: "pending",
      submittedAt: Date.now(),
    });

    return {
      claimNumber,
      status: "accepted",
      acceptedAt: Date.now(),
      trackingId,
    };
  }

  async getClaimStatus(claimNumber: string): Promise<ClaimStatusResult> {
    await delay(80, 200);

    const stored = claimStore.get(claimNumber);

    // For unknown claims, return a realistic status progression
    if (!stored) {
      const statuses: ClaimStatusResult["status"][] = [
        "pending",
        "in_review",
        "processed",
        "paid",
        "denied",
      ];
      const weights = [0.15, 0.2, 0.1, 0.45, 0.1];
      let rand = Math.random();
      let status: ClaimStatusResult["status"] = "pending";
      for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          status = statuses[i];
          break;
        }
      }

      const result: ClaimStatusResult = {
        claimNumber,
        status,
        statusDate: new Date().toISOString().split("T")[0],
      };

      if (status === "paid") {
        const charged = 200 + Math.floor(Math.random() * 1200);
        const adj = Math.floor(charged * 0.15);
        result.paidAmount = charged - adj;
        result.adjustments = adj;
        result.patientResponsibility = Math.floor((charged - adj) * 0.2);
        result.checkNumber = `CHK-${randomId()}`;
        result.checkDate = new Date().toISOString().split("T")[0];
      }

      if (status === "denied") {
        const denialReasons = [
          { code: "CO-4", desc: "The procedure code is inconsistent with the modifier used." },
          { code: "CO-16", desc: "Claim/service lacks information needed for adjudication." },
          { code: "CO-29", desc: "The time limit for filing has expired." },
          { code: "CO-50", desc: "These are non-covered services because this is not deemed a medical necessity." },
          { code: "PR-1", desc: "Deductible amount." },
          { code: "CO-197", desc: "Precertification/authorization/notification absent." },
        ];
        const reason = denialReasons[Math.floor(Math.random() * denialReasons.length)];
        result.denialReasonCode = reason.code;
        result.denialReasonDescription = reason.desc;
      }

      return result;
    }

    // For stored claims, progress the status based on time elapsed
    const elapsed = Date.now() - stored.submittedAt;
    let status: ClaimStatusResult["status"];
    if (elapsed < 5000) status = "pending";
    else if (elapsed < 15000) status = "in_review";
    else status = Math.random() > 0.15 ? "paid" : "denied";

    stored.status = status;

    const result: ClaimStatusResult = {
      claimNumber,
      status,
      statusDate: new Date().toISOString().split("T")[0],
    };

    if (status === "paid") {
      const charged = stored.data.totalCharged;
      const adj = Math.floor(charged * (0.1 + Math.random() * 0.1));
      result.paidAmount = charged - adj;
      result.adjustments = adj;
      result.patientResponsibility = Math.floor((charged - adj) * 0.2);
      result.checkNumber = `CHK-${randomId()}`;
      result.checkDate = new Date().toISOString().split("T")[0];
    }

    if (status === "denied") {
      result.denialReasonCode = "CO-50";
      result.denialReasonDescription =
        "These are non-covered services because this is not deemed a medical necessity.";
    }

    return result;
  }

  async fetchERA(params: {
    fromDate?: string;
    toDate?: string;
    payerId?: string;
  }): Promise<EraRecord[]> {
    await delay(150, 300);

    const payerIds = params.payerId ? [params.payerId] : Object.keys(PAYER_PLANS);
    const eras: EraRecord[] = [];

    // Generate 2-5 ERA records
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const pid = payerIds[Math.floor(Math.random() * payerIds.length)];
      const payer = PAYER_PLANS[pid];

      const claimCount = 1 + Math.floor(Math.random() * 4);
      const claimPayments = [];
      let totalPaid = 0;

      for (let c = 0; c < claimCount; c++) {
        const charged = 150 + Math.floor(Math.random() * 1500);
        const adj = Math.floor(charged * (0.1 + Math.random() * 0.15));
        const paid = charged - adj;
        const patResp = Math.floor(paid * (0.15 + Math.random() * 0.15));
        totalPaid += paid - patResp;

        const procCodes = ["D0120", "D0274", "D1110", "D2391", "D2740", "D3330", "D4341"];
        const procCount = 1 + Math.floor(Math.random() * 3);
        const procedures = [];
        for (let p = 0; p < procCount; p++) {
          const code = procCodes[Math.floor(Math.random() * procCodes.length)];
          const pCharged = Math.floor(charged / procCount);
          const pPaid = Math.floor(paid / procCount);
          procedures.push({
            code,
            charged: pCharged,
            paid: pPaid,
            adjustmentReason: adj > 0 ? "CO-45 Charge exceeds fee schedule/maximum allowable" : undefined,
          });
        }

        const firstNames = ["Maria", "James", "Sarah", "Robert", "Emily", "Michael", "Ashley", "David"];
        const lastNames = ["Gonzalez", "Mitchell", "Chen", "Williams", "Patel", "Johnson", "Rodriguez", "Kim"];

        claimPayments.push({
          claimNumber: `VDC-2026-${randomId()}`,
          patientName: `${lastNames[Math.floor(Math.random() * lastNames.length)]}, ${firstNames[Math.floor(Math.random() * firstNames.length)]}`,
          dateOfService: "2026-01-15",
          amountCharged: charged,
          amountPaid: paid - patResp,
          adjustments: adj,
          patientResponsibility: patResp,
          procedures,
        });
      }

      eras.push({
        eraId: `ERA-${new Date().getFullYear()}-${randomId()}`,
        payerId: pid,
        payerName: payer?.name ?? "Unknown Payer",
        checkNumber: `CHK-${randomId()}`,
        checkDate: new Date().toISOString().split("T")[0],
        totalPaid,
        claimPayments,
      });
    }

    return eras;
  }
}
