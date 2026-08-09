import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { assertStripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { notifyBookingConfirmed, notifyBookingCancelled } from "@/server/notification-service";

export async function POST(request: Request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 404 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhooks/stripe] STRIPE_WEBHOOK_SECRET is not set — refusing unverified webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = assertStripe();
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[webhooks/stripe] signature verification failed:", message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { offering: true, customer: true, payment: true },
        });
        if (!booking || booking.status !== "PENDING") break;

        const updated = await prisma.$transaction(async (tx) => {
          if (booking.payment) {
            await tx.payment.update({
              where: { id: booking.payment.id },
              data: {
                status: "SUCCEEDED",
                stripePaymentIntentId:
                  typeof session.payment_intent === "string" ? session.payment_intent : null,
              },
            });
          }
          return tx.booking.update({
            where: { id: booking.id },
            data: { status: "CONFIRMED" },
            include: { offering: true, customer: true, payment: true },
          });
        });

        await notifyBookingConfirmed(updated);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
        if (!booking || booking.status !== "PENDING") break;

        await prisma.$transaction(async (tx) => {
          if (booking.payment) {
            await tx.payment.update({ where: { id: booking.payment.id }, data: { status: "EXPIRED" } });
          }
          await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await prisma.payment.findUnique({ where: { stripePaymentIntentId: intent.id } });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", failureReason: intent.last_payment_error?.message ?? "Payment failed" },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (!intentId) break;

        const payment = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: intentId },
          include: { booking: { include: { offering: true, customer: true } } },
        });
        if (!payment) break;

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
          await tx.booking.update({ where: { id: payment.bookingId }, data: { status: "REFUNDED" } });
        });

        await notifyBookingCancelled(payment.booking, "Refunded");
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[webhooks/stripe] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
