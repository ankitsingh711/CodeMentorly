import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const isEmailConfigured = Boolean(resendApiKey);

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM = process.env.EMAIL_FROM ?? "CodeMentorly <bookings@example.com>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

/**
 * Sends transactional email via Resend when RESEND_API_KEY is configured.
 * Falls back to console logging in development/unconfigured environments
 * so the booking flow never silently fails when email isn't wired up yet.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  if (!resend) {
    console.log(
      `\n[email:dev-fallback] RESEND_API_KEY not set — logging instead of sending.\n` +
        `  To: ${to}\n  Subject: ${subject}\n  ---\n${stripHtml(html)}\n`,
    );
    return { ok: true };
  }

  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      console.error("[email] Resend error:", result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
