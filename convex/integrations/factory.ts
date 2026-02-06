// Integration Adapter Factory
// All business logic should import from this file, never from mock implementations directly.
// In production, swap mock adapters for real implementations via config.

import type { PmsAdapter } from "./pms/interface";
import type { ClearinghouseAdapter } from "./clearinghouse/interface";
import type { PaymentsAdapter } from "./payments/interface";
import type { SmsAdapter } from "./sms/interface";
import type { ReviewsAdapter } from "./reviews/interface";
import type { AiAdapter } from "./ai/interface";

import { MockPmsAdapter } from "./pms/mock";
import { MockClearinghouseAdapter } from "./clearinghouse/mock";
import { MockPaymentsAdapter } from "./payments/mock";
import { MockSmsAdapter } from "./sms/mock";
import { MockReviewsAdapter } from "./reviews/mock";
import { MockAiAdapter } from "./ai/mock";

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------
export interface AdapterMap {
  pms: PmsAdapter;
  clearinghouse: ClearinghouseAdapter;
  payments: PaymentsAdapter;
  sms: SmsAdapter;
  reviews: ReviewsAdapter;
  ai: AiAdapter;
}

export type AdapterType = keyof AdapterMap;

export interface AdapterConfig {
  useMock?: boolean;
  pmsType?: "opendental" | "eaglesoft" | "dentrix";
}

// ---------------------------------------------------------------------------
// Singleton cache (one adapter instance per type+config combination)
// ---------------------------------------------------------------------------
const adapterCache = new Map<string, AdapterMap[AdapterType]>();

function cacheKey(type: AdapterType, config?: AdapterConfig): string {
  return `${type}:${config?.pmsType ?? "default"}:${config?.useMock ?? true}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function getAdapter<T extends AdapterType>(
  type: T,
  config?: AdapterConfig
): AdapterMap[T] {
  const key = cacheKey(type, config);
  const cached = adapterCache.get(key);
  if (cached) return cached as AdapterMap[T];

  // For now, always return mock adapters.
  // When real adapters are implemented:
  //   if (!config?.useMock) return new RealPmsAdapter(config);
  let adapter: AdapterMap[AdapterType];

  switch (type) {
    case "pms":
      adapter = new MockPmsAdapter(config?.pmsType ?? "opendental");
      break;
    case "clearinghouse":
      adapter = new MockClearinghouseAdapter();
      break;
    case "payments":
      adapter = new MockPaymentsAdapter();
      break;
    case "sms":
      adapter = new MockSmsAdapter();
      break;
    case "reviews":
      adapter = new MockReviewsAdapter();
      break;
    case "ai":
      adapter = new MockAiAdapter();
      break;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown adapter type: ${_exhaustive}`);
    }
  }

  adapterCache.set(key, adapter);
  return adapter as AdapterMap[T];
}

// ---------------------------------------------------------------------------
// Re-export interfaces for convenience
// ---------------------------------------------------------------------------
export type { PmsAdapter, PmsPatient, PmsAppointment, PmsProvider, PmsClaim } from "./pms/interface";
export type { ClearinghouseAdapter, EligibilityResult, EligibilityBenefits, ClaimSubmissionData, ClaimSubmissionResult, ClaimStatusResult, EraRecord, SubscriberInfo } from "./clearinghouse/interface";
export type { PaymentsAdapter, PaymentCustomer, PaymentIntent, PaymentLink, ChargeResult, RefundResult, PaymentMethod } from "./payments/interface";
export type { SmsAdapter, SmsMessage, DeliveryStatus, IncomingAction } from "./sms/interface";
export type { ReviewsAdapter, Review, AggregateRating, PostResponseResult } from "./reviews/interface";
export type { AiAdapter, TextAnalysisResult, GenerationResult, DenialCategorizationResult, SatisfactionPrediction, AppealLetterResult, PatientSuggestion } from "./ai/interface";
