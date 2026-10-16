/**
 * Outgoing email (server-only). Uses Resend's HTTP API when configured:
 *
 *   RESEND_API_KEY  — from resend.com (free tier: 3,000 emails/month)
 *   EMAIL_FROM      — e.g. "Flush Finder <no-reply@yourdomain.com>" (domain verified in Resend)
 *
 * Unset (Grok preview / live app today) -> `emailSenderConfigured()` is false,
 * nothing is sent, and callers keep their old behavior (the 6-digit
 * confirmation code is shown on screen; email-code sign-in stays off).
 */
const clean = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

export function emailSenderConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(clean(env.RESEND_API_KEY) && clean(env.EMAIL_FROM));
}

export async function sendEmail(msg: { to: string; subject: string; text: string }): Promise<void> {
  const key = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.EMAIL_FROM);
  if (!key || !from) throw new Error("Email sending is not configured (RESEND_API_KEY / EMAIL_FROM).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}) ${detail.slice(0, 200)}`);
  }
}

export function codeEmail(code: string, purpose: "confirm" | "sign-in"): { subject: string; text: string } {
  const what = purpose === "sign-in" ? "sign in to Flush Finder" : "confirm your Flush Finder email";
  return {
    subject: `Your Flush Finder code: ${code}`,
    text: `Your code to ${what} is ${code}.\n\nIt expires soon. If you didn't ask for it, you can ignore this email.`,
  };
}
