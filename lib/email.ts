import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "Hired CV <onboarding@resend.dev>";
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "idankars10@gmail.com";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type OptimizeEmailPayload = {
  userEmail: string;
  userId?: string;
  jobTitle: string;
  companyName?: string;
  hasJobUrl?: boolean;
  cvTextLength: number;
  jobDescriptionLength: number;
  matchScore?: number;
  remainingCredits?: number;
  source?: string;
};

export async function sendOptimizeNotification(payload: OptimizeEmailPayload) {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping optimize notification");
    return { ok: false, reason: "no_api_key" as const };
  }

  const {
    userEmail,
    userId,
    jobTitle,
    companyName,
    hasJobUrl,
    cvTextLength,
    jobDescriptionLength,
    matchScore,
    remainingCredits,
    source,
  } = payload;

  const subject = `🎯 New optimization — ${userEmail} → ${jobTitle}${companyName && companyName !== "Target Company" ? ` @ ${companyName}` : ""}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAFAF8;">
      <div style="background: white; border-radius: 4px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <h1 style="font-size: 18px; margin: 0 0 4px; color: #0A2647; font-weight: 600;">Resume optimization</h1>
        <p style="font-size: 13px; color: #888; margin: 0 0 24px;">Hired-CV — ${new Date().toUTCString()}</p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">User</td><td style="padding: 8px 0; color: #1a1a1a;"><strong>${escape(userEmail)}</strong></td></tr>
          ${userId ? `<tr><td style="padding: 8px 0; color: #666;">User ID</td><td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${escape(userId)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Target role</td><td style="padding: 8px 0; color: #1a1a1a;">${escape(jobTitle)}</td></tr>
          ${companyName && companyName !== "Target Company" ? `<tr><td style="padding: 8px 0; color: #666;">Company</td><td style="padding: 8px 0; color: #1a1a1a;">${escape(companyName)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Job source</td><td style="padding: 8px 0; color: #1a1a1a;">${hasJobUrl ? "URL (LinkedIn)" : "Pasted description"}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">CV size</td><td style="padding: 8px 0; color: #1a1a1a;">${cvTextLength.toLocaleString()} chars</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">JD size</td><td style="padding: 8px 0; color: #1a1a1a;">${jobDescriptionLength.toLocaleString()} chars</td></tr>
          ${typeof matchScore === "number" ? `<tr><td style="padding: 8px 0; color: #666;">Match score</td><td style="padding: 8px 0; color: #0A2647;"><strong>${matchScore}/100</strong></td></tr>` : ""}
          ${typeof remainingCredits === "number" ? `<tr><td style="padding: 8px 0; color: #666;">Credits left</td><td style="padding: 8px 0; color: #1a1a1a;">${remainingCredits}</td></tr>` : ""}
          ${source ? `<tr><td style="padding: 8px 0; color: #666;">Source</td><td style="padding: 8px 0; color: #1a1a1a;">${escape(source)}</td></tr>` : ""}
        </table>
      </div>
      <p style="font-size: 11px; color: #aaa; text-align: center; margin-top: 16px;">Automated notification from hired-cv.com</p>
    </div>
  `.trim();

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject,
      html,
    });
    if (res.error) {
      console.error("[email] Resend error:", res.error);
      return { ok: false, reason: "resend_error" as const, error: res.error };
    }
    return { ok: true as const, id: res.data?.id };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, reason: "exception" as const };
  }
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export type SignupEmailPayload = {
  userEmail: string;
  userId: string;
  source?: string;
};

export async function sendSignupNotification(payload: SignupEmailPayload) {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping signup notification");
    return { ok: false, reason: "no_api_key" as const };
  }

  const { userEmail, userId, source } = payload;
  const subject = `👋 New signup — ${userEmail}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAFAF8;">
      <div style="background: white; border-radius: 4px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <h1 style="font-size: 18px; margin: 0 0 4px; color: #0A2647; font-weight: 600;">New user signup</h1>
        <p style="font-size: 13px; color: #888; margin: 0 0 24px;">Hired-CV — ${new Date().toUTCString()}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">User</td><td style="padding: 8px 0; color: #1a1a1a;"><strong>${escape(userEmail)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">User ID</td><td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${escape(userId)}</td></tr>
          ${source ? `<tr><td style="padding: 8px 0; color: #666;">Source</td><td style="padding: 8px 0; color: #1a1a1a;">${escape(source)}</td></tr>` : ""}
        </table>
      </div>
      <p style="font-size: 11px; color: #aaa; text-align: center; margin-top: 16px;">Automated notification from hired-cv.com</p>
    </div>
  `.trim();

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject,
      html,
    });
    if (res.error) {
      console.error("[email] Resend error (signup):", res.error);
      return { ok: false, reason: "resend_error" as const, error: res.error };
    }
    return { ok: true as const, id: res.data?.id };
  } catch (err) {
    console.error("[email] signup send failed:", err);
    return { ok: false, reason: "exception" as const };
  }
}

export type PurchaseEmailPayload = {
  userEmail: string;
  userId: string;
  planName: string;
  amount: number;
  currency?: string;
  credits: number;
  orderId?: string;
};

export async function sendPurchaseNotification(payload: PurchaseEmailPayload) {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping purchase notification");
    return { ok: false, reason: "no_api_key" as const };
  }

  const { userEmail, userId, planName, amount, currency = "USD", credits, orderId } = payload;
  const subject = `💰 Purchase — ${userEmail} bought ${planName} ($${amount})`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAFAF8;">
      <div style="background: white; border-radius: 4px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <h1 style="font-size: 18px; margin: 0 0 4px; color: #0A2647; font-weight: 600;">Purchase completed</h1>
        <p style="font-size: 13px; color: #888; margin: 0 0 24px;">Hired-CV — ${new Date().toUTCString()}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #666; width: 140px;">User</td><td style="padding: 8px 0; color: #1a1a1a;"><strong>${escape(userEmail)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">User ID</td><td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${escape(userId)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; color: #1a1a1a;"><strong>${escape(planName)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Amount</td><td style="padding: 8px 0; color: #0A2647;"><strong>$${amount.toFixed(2)} ${escape(currency)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Credits added</td><td style="padding: 8px 0; color: #1a1a1a;">${credits}</td></tr>
          ${orderId ? `<tr><td style="padding: 8px 0; color: #666;">Polar order</td><td style="padding: 8px 0; color: #1a1a1a; font-family: monospace; font-size: 12px;">${escape(orderId)}</td></tr>` : ""}
        </table>
      </div>
      <p style="font-size: 11px; color: #aaa; text-align: center; margin-top: 16px;">Automated notification from hired-cv.com</p>
    </div>
  `.trim();

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject,
      html,
    });
    if (res.error) {
      console.error("[email] Resend error (purchase):", res.error);
      return { ok: false, reason: "resend_error" as const, error: res.error };
    }
    return { ok: true as const, id: res.data?.id };
  } catch (err) {
    console.error("[email] purchase send failed:", err);
    return { ok: false, reason: "exception" as const };
  }
}
