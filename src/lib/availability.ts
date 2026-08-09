import { addMinutes, format, isBefore } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";

export interface TimeSlot {
  /** ISO UTC instant */
  startsAt: string;
  /** ISO UTC instant */
  endsAt: string;
  /** e.g. "10:00 AM" in the requested timezone */
  label: string;
}

/**
 * Computes bookable time slots for a given offering on a given calendar
 * date, in the given IANA timezone. Applies:
 *  - weekly availability rules
 *  - one-off date overrides (blocked days)
 *  - buffer time between meetings
 *  - minimum booking notice
 *  - maximum advance booking window
 *  - existing bookings (across ALL offerings, since it's one person's time)
 */
export async function getAvailableSlots(params: {
  offeringId: string;
  dateISO: string; // "2026-06-12"
  timezone: string;
}): Promise<TimeSlot[]> {
  const { offeringId, dateISO, timezone } = params;

  const [offering, settings] = await Promise.all([
    prisma.offering.findUnique({ where: { id: offeringId } }),
    prisma.availabilitySettings.findFirst(),
  ]);

  if (!offering || !offering.isActive) return [];

  const bufferMinutes = settings?.bufferMinutes ?? 15;
  const minNoticeHours = settings?.minNoticeHours ?? 12;
  const maxAdvanceDays = settings?.maxAdvanceDays ?? 45;

  const now = new Date();
  const requestedDate = fromZonedTime(`${dateISO}T00:00:00`, timezone);
  const maxAdvanceDate = addMinutes(now, maxAdvanceDays * 24 * 60);
  if (isBefore(maxAdvanceDate, requestedDate)) return [];

  const dayStart = fromZonedTime(`${dateISO}T00:00:00`, timezone);
  const dayEnd = fromZonedTime(`${dateISO}T23:59:59.999`, timezone);

  const override = await prisma.dateOverride.findUnique({ where: { date: startOfCalendarDay(dateISO) } });
  if (override?.isBlocked) return [];

  const dayOfWeek = toZonedTime(dayStart, timezone).getDay();
  const rules = await prisma.availabilityRule.findMany({
    where: { dayOfWeek, isActive: true },
    orderBy: { startTime: "asc" },
  });
  if (rules.length === 0) return [];

  const existingBookings = await prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const busyRanges = existingBookings.map((b) => ({
    start: addMinutes(b.startsAt, -bufferMinutes),
    end: addMinutes(b.endsAt, bufferMinutes),
  }));

  const earliestAllowed = addMinutes(now, minNoticeHours * 60);
  const durationMinutes = offering.durationMinutes;
  const slots: TimeSlot[] = [];

  for (const rule of rules) {
    let cursor = fromZonedTime(`${dateISO}T${rule.startTime}:00`, timezone);
    const ruleEnd = fromZonedTime(`${dateISO}T${rule.endTime}:00`, timezone);

    while (true) {
      const slotEnd = addMinutes(cursor, durationMinutes);
      if (isBefore(ruleEnd, slotEnd)) break;

      const overlapsBusy = busyRanges.some((r) => cursor < r.end && slotEnd > r.start);
      const meetsNotice = !isBefore(cursor, earliestAllowed);

      if (!overlapsBusy && meetsNotice) {
        slots.push({
          startsAt: cursor.toISOString(),
          endsAt: slotEnd.toISOString(),
          label: format(toZonedTime(cursor, timezone), "h:mm a"),
        });
      }

      cursor = addMinutes(cursor, durationMinutes);
    }
  }

  return slots;
}

function startOfCalendarDay(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00.000Z`);
}

/** Re-validates that a specific slot is still legally bookable server-side. */
export async function isSlotStillAvailable(params: {
  offeringId: string;
  startsAtISO: string;
  timezone: string;
}): Promise<boolean> {
  const dateISO = toZonedTime(new Date(params.startsAtISO), params.timezone)
    .toISOString()
    .slice(0, 10);
  const slots = await getAvailableSlots({
    offeringId: params.offeringId,
    dateISO,
    timezone: params.timezone,
  });
  return slots.some((s) => s.startsAt === params.startsAtISO);
}
