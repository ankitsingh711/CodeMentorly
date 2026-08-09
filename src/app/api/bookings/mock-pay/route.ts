import { NextResponse } from "next/server";
import { z } from "zod";
import { isStripeConfigured } from "@/lib/stripe";
import { simulateMockPayment } from "@/server/checkout-service";

const schema = z.object({
  bookingNumber: z.string().min(1),
  outcome: z.enum(["success", "failure"]),
});

/**
 * Development-only payment simulator. Only reachable for bookings whose
 * Payment.provider is MOCK, i.e. when STRIPE_SECRET_KEY is not configured.
 */
export async function POST(request: Request) {
  if (isStripeConfigured) {
    return NextResponse.json({ error: "Mock payments are disabled when Stripe is configured." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const booking = await simulateMockPayment(parsed.data.bookingNumber, parsed.data.outcome);
    return NextResponse.json({ status: booking.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment simulation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
