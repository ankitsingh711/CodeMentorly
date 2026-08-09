import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, isSlotStillAvailable } from "@/lib/availability";
import { resetDb, seedTestOffering, seedWeekdayAvailability } from "@/test/db";

describe("getAvailableSlots", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns hourly slots within working hours for a 60-minute offering", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability();

    const dateISO = format(addDays(new Date(), 5), "yyyy-MM-dd");
    const slots = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });

    // 10:00 -> 19:00 in 60-minute increments = 9 slots
    expect(slots).toHaveLength(9);
    expect(slots[0].label).toBe("10:00 AM");
    expect(slots.at(-1)?.label).toBe("6:00 PM");
  });

  it("returns no slots on a date with no availability rule configured", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    // No availability rules or settings seeded.
    const dateISO = format(addDays(new Date(), 5), "yyyy-MM-dd");
    const slots = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });
    expect(slots).toHaveLength(0);
  });

  it("returns no slots for a blocked date override", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability();
    const date = addDays(new Date(), 5);
    const dateISO = format(date, "yyyy-MM-dd");

    await prisma.dateOverride.create({
      data: { date: new Date(`${dateISO}T00:00:00.000Z`), isBlocked: true, reason: "Holiday" },
    });

    const slots = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });
    expect(slots).toHaveLength(0);
  });

  it("excludes slots that overlap an existing booking, including buffer time", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability(); // 15-minute buffer

    const dateISO = format(addDays(new Date(), 5), "yyyy-MM-dd");
    const slotsBefore = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });
    const noonSlot = slotsBefore.find((s) => s.label === "12:00 PM")!;

    const customer = await prisma.customer.create({
      data: { email: "buffer-test@example.com", fullName: "Buffer Test" },
    });
    await prisma.booking.create({
      data: {
        bookingNumber: "CM-BUFFER",
        offeringId: offering.id,
        customerId: customer.id,
        startsAt: new Date(noonSlot.startsAt),
        endsAt: new Date(noonSlot.endsAt),
        timezone: "Asia/Kolkata",
        topic: "Existing booking",
        priceCents: offering.priceCents,
        status: "CONFIRMED",
      },
    });

    const slotsAfter = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });

    // The booked slot and the adjacent slot within the 15-minute buffer should be gone.
    expect(slotsAfter.find((s) => s.label === "12:00 PM")).toBeUndefined();
    expect(slotsAfter.find((s) => s.label === "11:00 AM")).toBeUndefined();
    expect(slotsAfter.find((s) => s.label === "1:00 PM")).toBeUndefined();
    expect(slotsAfter.length).toBe(slotsBefore.length - 3);
  });

  it("excludes bookings across a different offering (shared calendar)", async () => {
    const offeringA = await seedTestOffering({ durationMinutes: 60 });
    const offeringB = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability();

    const dateISO = format(addDays(new Date(), 5), "yyyy-MM-dd");
    const slots = await getAvailableSlots({ offeringId: offeringA.id, dateISO, timezone: "Asia/Kolkata" });
    const target = slots.find((s) => s.label === "2:00 PM")!;

    const customer = await prisma.customer.create({ data: { email: "cross@example.com", fullName: "Cross Test" } });
    await prisma.booking.create({
      data: {
        bookingNumber: "CM-CROSS1",
        offeringId: offeringB.id,
        customerId: customer.id,
        startsAt: new Date(target.startsAt),
        endsAt: new Date(target.endsAt),
        timezone: "Asia/Kolkata",
        topic: "Booked on a different offering",
        priceCents: offeringB.priceCents,
        status: "CONFIRMED",
      },
    });

    const slotsAfter = await getAvailableSlots({ offeringId: offeringA.id, dateISO, timezone: "Asia/Kolkata" });
    expect(slotsAfter.find((s) => s.label === "2:00 PM")).toBeUndefined();
  });

  it("respects the minimum notice window", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
      await prisma.availabilityRule.create({ data: { dayOfWeek, startTime: "00:00", endTime: "23:59" } });
    }
    await prisma.availabilitySettings.create({
      data: { timezone: "UTC", bufferMinutes: 0, minNoticeHours: 48, maxAdvanceDays: 60 },
    });

    const dateISO = format(new Date(), "yyyy-MM-dd"); // today — should be fully blocked by 48h notice
    const slots = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "UTC" });
    expect(slots).toHaveLength(0);
  });

  it("isSlotStillAvailable reflects real-time availability", async () => {
    const offering = await seedTestOffering({ durationMinutes: 60 });
    await seedWeekdayAvailability();

    const dateISO = format(addDays(new Date(), 5), "yyyy-MM-dd");
    const slots = await getAvailableSlots({ offeringId: offering.id, dateISO, timezone: "Asia/Kolkata" });
    const slot = slots[0];

    await expect(
      isSlotStillAvailable({ offeringId: offering.id, startsAtISO: slot.startsAt, timezone: "Asia/Kolkata" }),
    ).resolves.toBe(true);

    const customer = await prisma.customer.create({ data: { email: "taken@example.com", fullName: "Taken" } });
    await prisma.booking.create({
      data: {
        bookingNumber: "CM-TAKEN1",
        offeringId: offering.id,
        customerId: customer.id,
        startsAt: new Date(slot.startsAt),
        endsAt: new Date(slot.endsAt),
        timezone: "Asia/Kolkata",
        topic: "Taken",
        priceCents: offering.priceCents,
        status: "CONFIRMED",
      },
    });

    await expect(
      isSlotStillAvailable({ offeringId: offering.id, startsAtISO: slot.startsAt, timezone: "Asia/Kolkata" }),
    ).resolves.toBe(false);
  });
});
