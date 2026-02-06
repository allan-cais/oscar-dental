import type {
  SmsAdapter,
  SmsMessage,
  DeliveryStatus,
  IncomingAction,
} from "./interface";

function delay(min = 50, max = 150): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function randomId(): string {
  // Twilio-like SID format: SM + 32 hex chars
  const hex = "0123456789abcdef";
  let result = "SM";
  for (let i = 0; i < 32; i++) {
    result += hex[Math.floor(Math.random() * hex.length)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// TCPA compliance keywords
// ---------------------------------------------------------------------------
const OPT_OUT_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
const OPT_IN_KEYWORDS = ["start", "yes", "unstop"];
const HELP_KEYWORDS = ["help", "info"];

const DEFAULT_FROM = "+15125550100"; // Oscar system number

// In-memory message log
const messageStore = new Map<string, SmsMessage>();

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export class MockSmsAdapter implements SmsAdapter {
  async sendSms(
    to: string,
    body: string,
    from?: string
  ): Promise<SmsMessage> {
    await delay(60, 150);

    const messageId = randomId();

    // Simulate ~3% delivery failure
    const willFail = Math.random() < 0.03;

    const message: SmsMessage = {
      messageId,
      to,
      from: from ?? DEFAULT_FROM,
      body,
      status: willFail ? "failed" : "queued",
      direction: "outbound",
      errorCode: willFail ? "30006" : undefined,
      errorMessage: willFail ? "Landline or unreachable carrier" : undefined,
      sentAt: willFail ? undefined : Date.now(),
      createdAt: Date.now(),
    };

    messageStore.set(messageId, message);

    // Simulate async delivery (update status after creation)
    if (!willFail) {
      message.status = "sent";
    }

    return message;
  }

  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    await delay(30, 80);

    const stored = messageStore.get(messageId);

    if (!stored) {
      return {
        messageId,
        status: "failed",
        errorCode: "20404",
        errorMessage: "Message not found",
        updatedAt: Date.now(),
      };
    }

    // Progress status: queued -> sent -> delivered
    if (stored.status === "queued") {
      stored.status = "sent";
      stored.sentAt = Date.now();
    } else if (stored.status === "sent") {
      stored.status = "delivered";
      stored.deliveredAt = Date.now();
    }

    return {
      messageId,
      status: stored.status,
      errorCode: stored.errorCode,
      errorMessage: stored.errorMessage,
      updatedAt: Date.now(),
    };
  }

  async handleIncoming(from: string, body: string): Promise<IncomingAction> {
    await delay(20, 60);

    const normalized = body.trim().toLowerCase();
    const firstWord = normalized.split(/\s+/)[0];

    if (OPT_OUT_KEYWORDS.includes(firstWord)) {
      return {
        action: "opt_out",
        keyword: firstWord.toUpperCase(),
        body,
        from,
        receivedAt: Date.now(),
      };
    }

    if (OPT_IN_KEYWORDS.includes(firstWord)) {
      return {
        action: "opt_in",
        keyword: firstWord.toUpperCase(),
        body,
        from,
        receivedAt: Date.now(),
      };
    }

    if (HELP_KEYWORDS.includes(firstWord)) {
      return {
        action: "help",
        keyword: firstWord.toUpperCase(),
        body,
        from,
        receivedAt: Date.now(),
      };
    }

    return {
      action: "message",
      body,
      from,
      receivedAt: Date.now(),
    };
  }
}
