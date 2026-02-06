// Payments Adapter Interface
// Primary provider: Stripe (PCI-DSS compliant)
// Supports payment intents, payment links (Text-to-Pay), card on file, refunds

export interface PaymentCustomer {
  customerId: string;
  email?: string;
  name?: string;
  phone?: string;
  defaultPaymentMethodId?: string;
  createdAt: number;
}

export interface PaymentIntent {
  intentId: string;
  clientSecret: string;
  amount: number; // cents
  currency: string;
  status: "requires_payment_method" | "requires_confirmation" | "processing" | "succeeded" | "canceled" | "requires_action";
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

export interface PaymentLink {
  linkId: string;
  linkUrl: string;
  amount: number; // cents
  currency: string;
  status: "active" | "completed" | "expired";
  description?: string;
  metadata?: Record<string, string>;
  expiresAt?: number;
  createdAt: number;
}

export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  amount: number; // cents
  last4?: string;
  brand?: string;
  receiptUrl?: string;
  failureCode?: string;
  failureMessage?: string;
  processedAt: number;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number; // cents
  status: "pending" | "succeeded" | "failed";
  failureReason?: string;
  processedAt: number;
}

export interface PaymentMethod {
  paymentMethodId: string;
  type: "card";
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
  };
}

export interface PaymentsAdapter {
  // Customer management
  createCustomer(patientData: {
    email?: string;
    name: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentCustomer>;

  getCustomer(customerId: string): Promise<PaymentCustomer | null>;

  // Payment intents (for card-on-file charges)
  createPaymentIntent(
    amount: number, // cents
    patientId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent>;

  // Payment links (Text-to-Pay)
  createPaymentLink(
    amount: number, // cents
    patientId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<PaymentLink>;

  getPaymentLinkStatus(linkId: string): Promise<PaymentLink | null>;

  // Direct charges (card on file)
  chargeCard(
    paymentMethodId: string,
    amount: number, // cents
    customerId: string,
    description?: string
  ): Promise<ChargeResult>;

  // Refunds
  refund(
    transactionId: string,
    amount?: number // partial refund in cents; omit for full
  ): Promise<RefundResult>;

  // Payment methods
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
}
