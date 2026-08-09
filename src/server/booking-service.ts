import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateBookingNumber } from "@/lib/booking-number";
import { isSlotStillAvailable } from "@/lib/availability";
import type { CreateBookingInput } from "@/lib/validation";
import { isStripeConfigured } from "@/lib/stripe";

export class SlotUnavailableError extends Error {
  constructor() {
    super("This time slot was just booked. Please choose another time.");
    this.name = "SlotUnavailableError";
  }
}

export class OfferingUnavailableError extends Error {
  constructor() {
    super("This offering is not currently available.");
    this.name = "OfferingUnavailableError";
  }
}

/**
 * Creates a PENDING booking + PENDING payment row for a customer.
 *
 * Race-condition safety: the transaction runs at Serializable isolation and
 * re-checks for overlapping bookings (any offering, since it's one person's
 * calendar) immediately before insert. Two concurrent requests for
 * overlapping times will cause one transaction to fail with a Prisma
 * P2034 (write conflict) error, which the caller should retry or surface
 * as "slot just booked." The `(offeringId, startsAt)` unique constraint is
 * a second, DB-enforced backstop against exact-duplicate double-booking.
 */
export async function createPendingBooking(input: CreateBookingInput) {
  const offering = await prisma.offering.findUnique({ where: { id: input.offeringId } });
  if (!offering || !offering.isActive) {
    throw new OfferingUnavailableError();
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = addMinutes(startsAt, offering.durationMinutes);

  const settings = await prisma.availabilitySettings.findFirst();
  const bufferMinutes = settings?.bufferMinutes ?? 15;

  const stillAvailable = await isSlotStillAvailable({
    offeringId: input.offeringId,
    startsAtISO: startsAt.toISOString(),
    timezone: input.timezone,
  });
  if (!stillAvailable) throw new SlotUnavailableError();

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const bufferedStart = addMinutes(startsAt, -bufferMinutes);
        const bufferedEnd = addMinutes(endsAt, bufferMinutes);

        const conflict = await tx.booking.findFirst({
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            startsAt: { lt: bufferedEnd },
            endsAt: { gt: bufferedStart },
          },
        });
        if (conflict) throw new SlotUnavailableError();

        const customer = await tx.customer.upsert({
          where: { email: input.email.toLowerCase() },
          update: {
            fullName: input.fullName,
            company: input.company || null,
            linkedinOrGithub: input.linkedinOrGithub || null,
          },
          create: {
            email: input.email.toLowerCase(),
            fullName: input.fullName,
            company: input.company || null,
            linkedinOrGithub: input.linkedinOrGithub || null,
          },
        });

        return tx.booking.create({
          data: {
            bookingNumber: generateBookingNumber(),
            offeringId: offering.id,
            customerId: customer.id,
            startsAt,
            endsAt,
            timezone: input.timezone,
            topic: input.topic,
            notes: input.notes || null,
            priceCents: offering.priceCents,
            currency: offering.currency,
            status: "PENDING",
            payment: {
              create: {
                provider: isStripeConfigured ? "STRIPE" : "MOCK",
                status: "PENDING",
                amountCents: offering.priceCents,
                currency: offering.currency,
              },
            },
          },
          include: { offering: true, customer: true, payment: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return booking;
  } catch (err) {
    if (err instanceof SlotUnavailableError) throw err;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: unique constraint (offeringId, startsAt); P2034: serialization conflict
      if (err.code === "P2002" || err.code === "P2034") {
        throw new SlotUnavailableError();
      }
    }
    throw err;
  }
}

export async function cancelBooking(bookingId: string, reason?: string) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason ?? null },
    include: { offering: true, customer: true },
  });
}

export async function markBookingCompleted(bookingId: string) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function refundBooking(bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "REFUNDED" },
      include: { payment: true },
    });
    if (booking.payment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: "REFUNDED" },
      });
    }
    return booking;
  });
}

export async function rescheduleBooking(bookingId: string, startsAtISO: string, timezone: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { offering: true },
  });

  const stillAvailable = await isSlotStillAvailable({
    offeringId: booking.offeringId,
    startsAtISO,
    timezone,
  });
  if (!stillAvailable) throw new SlotUnavailableError();

  const startsAt = new Date(startsAtISO);
  const endsAt = addMinutes(startsAt, booking.offering.durationMinutes);

  return prisma.booking.update({
    where: { id: bookingId },
    data: { startsAt, endsAt, timezone },
    include: { offering: true, customer: true },
  });
}
