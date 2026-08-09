import { prisma } from "@/lib/prisma";
import { assertStripe, isStripeConfigured } from "@/lib/stripe";
import { notifyBookingConfirmed } from "@/server/notification-service";
import type { Booking, Customer, Offering, Payment } from "@prisma/client";

type FullBooking = Booking & { offering: Offering; customer: Customer; payment: Payment | null };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Starts payment for a pending booking. Returns a URL the client should be
 * redirected to. In live mode this is a Stripe Checkout session URL; in
 * mock/dev mode (no STRIPE_SECRET_KEY) it's our own simulated payment page,
 * clearly labeled as a development fallback.
 */
export async function startCheckout(booking: FullBooking): Promise<{ url: string }> {
  if (isStripeConfigured) {
    const stripe = assertStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.customer.email,
      line_items: [
        {
          price_data: {
            currency: booking.currency,
            unit_amount: booking.priceCents,
            product_data: {
              name: booking.offering.name,
              description: `${booking.offering.durationMinutes}-minute session — ${booking.bookingNumber}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
      success_url: `${APP_URL}/book/confirmation/${booking.bookingNumber}`,
      cancel_url: `${APP_URL}/book/${booking.offering.slug}?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    await prisma.payment.update({
      where: { bookingId: booking.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  }

  return { url: `/book/mock-checkout/${booking.bookingNumber}` };
}

/** Development-only: simulates a successful payment without Stripe. */
export async function simulateMockPayment(bookingNumber: string, outcome: "success" | "failure") {
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: { offering: true, customer: true, payment: true },
  });
  if (!booking || !booking.payment) throw new Error("Booking not found");
  if (booking.payment.provider !== "MOCK") throw new Error("Not a mock-payment booking");
  if (booking.status !== "PENDING") return booking;

  if (outcome === "failure") {
    await prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: "FAILED", failureReason: "Simulated failure (development mode)" },
    });
    return booking;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: booking.payment!.id },
      data: { status: "SUCCEEDED" },
    });
    return tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
      include: { offering: true, customer: true, payment: true },
    });
  });

  await notifyBookingConfirmed(updated);
  return updated;
}
