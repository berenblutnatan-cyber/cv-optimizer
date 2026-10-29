import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { camelizeKeys, processPolarEvent } from "@/lib/billing/polar-events";
import { sendPurchaseNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

// Polar webhook. The signature is checked with Standard Webhooks directly
// (Polar's scheme: the secret string, base64-encoded). The body is then read
// as plain JSON, NOT through the SDK's strict payload schemas: a field Polar
// adds tomorrow must never make us drop a paid order. Processing (record →
// de-duplicate → apply in one transaction) lives in lib/billing/polar-events.
// Any processing failure answers 500 so Polar retries; retries are safe.
export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[polar webhook] POLAR_WEBHOOK_SECRET is not set");
    return Response.json({ received: false }, { status: 500 });
  }

  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let event: { type?: unknown; timestamp?: unknown; data?: unknown };
  try {
    event = new Webhook(Buffer.from(secret, "utf-8").toString("base64")).verify(body, headers) as typeof event;
  } catch (err) {
    if (err instanceof WebhookVerificationError) return Response.json({ received: false }, { status: 403 });
    throw err;
  }
  const id = headers["webhook-id"];
  if (typeof event.type !== "string") return Response.json({ received: true, ignored: true });

  try {
    const result = await processPolarEvent({
      id,
      type: event.type,
      timestamp: typeof event.timestamp === "string" ? event.timestamp : null,
      data: (camelizeKeys(event.data ?? {}) ?? {}) as Record<string, unknown>,
    });
    console.log(`[polar webhook] ${id} ${event.type}: ${result.status}${"effect" in result ? ` ${result.effect}` : ""}${"reason" in result ? ` (${result.reason})` : ""}`);
    if (result.status === "processed" && result.notify) {
      void sendPurchaseNotification({ userEmail: result.notify.email, ...result.notify }).catch((err) => console.error("[polar webhook] notification failed", err));
    }
    return Response.json({ received: true, status: result.status });
  } catch (err) {
    console.error("[polar webhook] processing failed", id, event.type, err);
    return Response.json({ received: false }, { status: 500 });
  }
}
