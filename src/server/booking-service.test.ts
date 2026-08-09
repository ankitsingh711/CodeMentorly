import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";
import {
  cancelBooking,
  createPendingBooking,
  markBookingCompleted,
  refundBooking,
  SlotUnavailableError,
} from "@/server/booking-service";
import { resetDb, seedTestOffering, seedWeekdayAvailability } from "@/test/db";

async function firstAvailableSlot(offeringId: string) {
  const dateISO = format(addDays(new Date(), 5), "yyyy-MM-dd");
  const slots = await getAvailableSlots({ offeringId, dateISO, timezone: "Asia/Kolkata" });
  return slots[0];
}

describe("createPendingBooking", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a booking, customer, and payment row", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60, priceCents: 9900 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);

    const booking = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      topic: "Help reviewing my analytical engine architecture",
    });

    expect(booking.status).toBe("PENDING");
    expect(booking.priceCents).toBe(9900);
    expect(booking.bookingNumber).toMatch(/^CM-/);
    expect(booking.customer.email).toBe("ada@example.com");
    expect(booking.payment?.status).toBe("PENDING");
    expect(booking.payment?.provider).toBe("MOCK");
  });

  it("reuses an existing customer record for a repeat email", async () => {
    const offering = await seedTestOffering({ durationMinutes: 30 });
    await seedWeekdayAvailability();
    const slot1 = await firstAvailableSlot(offering.id);

    const booking1 = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot1.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Repeat Customer",
      email: "repeat@example.com",
      topic: "First booking about API design",
    });

    const dateISO = format(addDays(new Date(), 6), "yyyy-MM-dd");
    const slots2 = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });

    const booking2 = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slots2[0].startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Repeat Customer",
      email: "repeat@example.com",
      topic: "Second booking about deployment",
    });

    expect(booking1.customerId).toBe(booking2.customerId);
    const customerCount = await prisma.customer.count();
    expect(customerCount).toBe(1);
  });

  it("rejects booking an already-taken slot", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);

    await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "First Booker",
      email: "first@example.com",
      topic: "Booking the slot first",
    });

    await expect(
      createPendingBooking({
        offeringId: offering.id,
        startsAt: slot.startsAt,
        timezone: "Asia/Kolkata",
        fullName: "Second Booker",
        email: "second@example.com",
        topic: "Trying to take the same slot",
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("prevents double booking under concurrent requests for the same slot", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);

    const attempt = (email: string) =>
      createPendingBooking({
        offeringId: offering.id,
        startsAt: slot.startsAt,
        timezone: "Asia/Kolkata",
        fullName: "Concurrent Booker",
        email,
        topic: "Racing for the same slot",
      }).then(
        () => "fulfilled" as const,
        () => "rejected" as const,
      );

    const results = await Promise.all([
      attempt("racer1@example.com"),
      attempt("racer2@example.com"),
      attempt("racer3@example.com"),
    ]);

    expect(results.filter((r) => r === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r === "rejected")).toHaveLength(2);

    const bookingsForSlot = await prisma.booking.count({
      where: { offeringId: offering.id, startsAt: new Date(slot.startsAt) },
    });
    expect(bookingsForSlot).toBe(1);
  });
});

describe("booking status transitions", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("cancels a booking and records a reason", async () => {
    const offering = await seedTestOffering({ durationMinutes: 30 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);
    const booking = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Cancel Me",
      email: "cancel@example.com",
      topic: "Booking that will be cancelled",
    });

    const cancelled = await cancelBooking(booking.id, "Change of plans");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancellationReason).toBe("Change of plans");
    expect(cancelled.cancelledAt).not.toBeNull();
  });

  it("marks a confirmed booking as completed", async () => {
    const offering = await seedTestOffering({ durationMinutes: 30 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);
    const booking = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Complete Me",
      email: "complete@example.com",
      topic: "Booking that will be completed",
    });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });

    const completed = await markBookingCompleted(booking.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("refunds a booking and its payment together", async () => {
    const offering = await seedTestOffering({ durationMinutes: 30 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);
    const booking = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Refund Me",
      email: "refund@example.com",
      topic: "Booking that will be refunded",
    });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    await prisma.payment.update({ where: { bookingId: booking.id }, data: { status: "SUCCEEDED" } });

    const refunded = await refundBooking(booking.id);
    expect(refunded.status).toBe("REFUNDED");

    const payment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
    expect(payment?.status).toBe("REFUNDED");
  });

  it("frees up the slot after cancellation", async () => {
    const offering = await seedTestOffering({ durationMinutes: 30 });
    await seedWeekdayAvailability();
    const slot = await firstAvailableSlot(offering.id);
    const booking = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "Freeing Slot",
      email: "freeing@example.com",
      topic: "Booking that will free its slot",
    });

    await cancelBooking(booking.id);

    const rebooked = await createPendingBooking({
      offeringId: offering.id,
      startsAt: slot.startsAt,
      timezone: "Asia/Kolkata",
      fullName: "New Booker",
      email: "newbooker@example.com",
      topic: "Booking the freed slot",
    });

    expect(rebooked.status).toBe("PENDING");
  });
});
