// SMS Adapter Interface
// Primary provider: Twilio
// TCPA compliance: STOP/HELP keyword handling, consent tracking

export interface SmsMessage {
  messageId: string;
  to: string;
  from: string;
  body: string;
  status: "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered";
  direction: "outbound" | "inbound";
  errorCode?: string;
  errorMessage?: string;
  sentAt?: number;
  deliveredAt?: number;
  createdAt: number;
}

export interface DeliveryStatus {
  messageId: string;
  status: "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered";
  errorCode?: string;
  errorMessage?: string;
  updatedAt: number;
}

export interface IncomingAction {
  action: "opt_out" | "opt_in" | "help" | "message";
  keyword?: string;
  body: string;
  from: string;
  receivedAt: number;
}

export interface SmsAdapter {
  // Send a message
  sendSms(
    to: string,
    body: string,
    from?: string
  ): Promise<SmsMessage>;

  // Check delivery status
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;

  // Process incoming message (STOP/HELP detection)
  handleIncoming(
    from: string,
    body: string
  ): Promise<IncomingAction>;
}
