import type {
  PaymentsAdapter,
  PaymentCustomer,
  PaymentIntent,
  PaymentLink,
  ChargeResult,
  RefundResult,
  PaymentMethod,
} from "./interface";

function delay(min = 80, max = 250): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function randomId(prefix: string): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = prefix + "_";
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
const customerStore = new Map<string, PaymentCustomer>();
const intentStore = new Map<string, PaymentIntent>();
const linkStore = new Map<string, PaymentLink>();
const chargeStore = new Map<string, { amount: number; customerId?: string }>();

const CARD_BRANDS = ["visa", "mastercard", "amex", "discover"];
const LAST4S = ["4242", "1234", "5678", "9012", "3456", "7890", "2468", "1357"];

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export class MockPaymentsAdapter implements PaymentsAdapter {
  async createCustomer(patientData: {
    email?: string;
    name: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentCustomer> {
    await delay(100, 200);

    const customer: PaymentCustomer = {
      customerId: randomId("cus"),
      email: patientData.email,
      name: patientData.name,
      phone: patientData.phone,
      createdAt: Date.now(),
    };
    customerStore.set(customer.customerId, customer);
    return customer;
  }

  async getCustomer(customerId: string): Promise<PaymentCustomer | null> {
    await delay(50, 120);
    return customerStore.get(customerId) ?? null;
  }

  async createPaymentIntent(
    amount: number,
    patientId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    await delay(100, 250);

    const intent: PaymentIntent = {
      intentId: randomId("pi"),
      clientSecret: `${randomId("pi")}_secret_${randomId("")}`,
      amount,
      currency: "usd",
      status: "requires_payment_method",
      description,
      metadata: { ...metadata, oscar_patient_id: patientId },
      createdAt: Date.now(),
    };
    intentStore.set(intent.intentId, intent);
    return intent;
  }

  async createPaymentLink(
    amount: number,
    patientId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<PaymentLink> {
    await delay(100, 250);

    const linkId = randomId("plink");
    const link: PaymentLink = {
      linkId,
      linkUrl: `https://pay.stripe.com/test/${linkId}`,
      amount,
      currency: "usd",
      status: "active",
      description,
      metadata: { ...metadata, oscar_patient_id: patientId },
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    };
    linkStore.set(linkId, link);
    return link;
  }

  async getPaymentLinkStatus(linkId: string): Promise<PaymentLink | null> {
    await delay(50, 120);

    const link = linkStore.get(linkId);
    if (!link) return null;

    // Simulate some links being completed
    if (link.status === "active" && Math.random() < 0.3) {
      link.status = "completed";
    }
    return { ...link };
  }

  async chargeCard(
    paymentMethodId: string,
    amount: number,
    customerId: string,
    description?: string
  ): Promise<ChargeResult> {
    await delay(150, 350);

    // Simulate ~5% failure rate
    if (Math.random() < 0.05) {
      const failures = [
        { code: "card_declined", message: "Your card was declined." },
        { code: "insufficient_funds", message: "Your card has insufficient funds." },
        { code: "expired_card", message: "Your card has expired." },
      ];
      const failure = failures[Math.floor(Math.random() * failures.length)];
      return {
        success: false,
        amount,
        failureCode: failure.code,
        failureMessage: failure.message,
        processedAt: Date.now(),
      };
    }

    const transactionId = randomId("ch");
    chargeStore.set(transactionId, { amount, customerId });

    return {
      success: true,
      transactionId,
      amount,
      last4: LAST4S[Math.floor(Math.random() * LAST4S.length)],
      brand: CARD_BRANDS[Math.floor(Math.random() * CARD_BRANDS.length)],
      receiptUrl: `https://pay.stripe.com/receipts/test/${transactionId}`,
      processedAt: Date.now(),
    };
  }

  async refund(
    transactionId: string,
    amount?: number
  ): Promise<RefundResult> {
    await delay(100, 250);

    const charge = chargeStore.get(transactionId);
    const refundAmount = amount ?? charge?.amount ?? 0;

    // Simulate ~3% failure rate
    if (Math.random() < 0.03) {
      return {
        success: false,
        amount: refundAmount,
        status: "failed",
        failureReason: "Charge has already been fully refunded.",
        processedAt: Date.now(),
      };
    }

    return {
      success: true,
      refundId: randomId("re"),
      amount: refundAmount,
      status: "succeeded",
      processedAt: Date.now(),
    };
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    await delay(50, 120);

    // Return 0-2 payment methods
    const count = Math.floor(Math.random() * 3);
    const methods: PaymentMethod[] = [];
    for (let i = 0; i < count; i++) {
      const brand = CARD_BRANDS[Math.floor(Math.random() * CARD_BRANDS.length)];
      methods.push({
        paymentMethodId: randomId("pm"),
        type: "card",
        card: {
          brand,
          last4: LAST4S[Math.floor(Math.random() * LAST4S.length)],
          expMonth: 1 + Math.floor(Math.random() * 12),
          expYear: 2027 + Math.floor(Math.random() * 4),
        },
      });
    }
    return methods;
  }
}
