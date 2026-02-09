import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// ---------------------------------------------------------------------------
// NexHealth Webhook Handler
// Receives real-time events from NexHealth (patient.*, appointment.*, etc.)
// Verifies HMAC-SHA256 signature, logs event, routes to Convex action.
// ---------------------------------------------------------------------------

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

/**
 * Verify HMAC-SHA256 signature from NexHealth.
 */
async function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature.toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    // 2. Parse the payload
    let payload: {
      id?: string;
      type?: string;
      data?: Record<string, unknown>;
      resource_id?: number;
      subdomain?: string;
      created_at?: string;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventId = payload.id ?? `evt_${Date.now()}`;
    const eventType = payload.type ?? "unknown";
    const subdomain = payload.subdomain ?? "";
    const resourceId = payload.resource_id ?? 0;

    if (!subdomain) {
      return NextResponse.json(
        { error: "Missing subdomain in event" },
        { status: 400 }
      );
    }

    // 3. Verify HMAC signature (if webhook secret is configured)
    const secretResult = await convex.query(
      (api as any).nexhealth.queries.getWebhookSecret,
      { subdomain }
    );

    if (!secretResult) {
      return NextResponse.json(
        { error: "Unknown subdomain" },
        { status: 404 }
      );
    }

    if (secretResult.webhookSecret) {
      const signature =
        request.headers.get("x-nexhealth-signature") ??
        request.headers.get("x-signature") ??
        "";

      if (!signature) {
        return NextResponse.json(
          { error: "Missing signature header" },
          { status: 401 }
        );
      }

      const valid = await verifySignature(
        rawBody,
        signature,
        secretResult.webhookSecret
      );
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // 4. Dispatch to Convex action for processing
    // handleWebhookEvent is a public action that does config lookup + event routing
    await convex.action(
      (api as any).nexhealth.actions.handleWebhookEvent,
      {
        eventId,
        eventType,
        subdomain,
        resourceId,
        data: JSON.stringify(payload.data ?? {}),
      }
    );

    return NextResponse.json({ received: true, eventId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[nexhealth-webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
