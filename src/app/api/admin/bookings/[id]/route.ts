import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, UnauthorizedError } from "@/server/admin-guard";
import { cancelBooking, markBookingCompleted, refundBooking, rescheduleBooking } from "@/server/booking-service";
import { notifyBookingCancelled, notifyBookingRescheduled } from "@/server/notification-service";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("refund") }),
  z.object({ action: z.literal("reschedule"), startsAt: z.string().datetime({ offset: true }), timezone: z.string() }),
  z.object({ action: z.literal("set-meeting-url"), meetingUrl: z.string().url() }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  switch (parsed.data.action) {
    case "cancel": {
      const booking = await cancelBooking(id, parsed.data.reason);
      await notifyBookingCancelled(booking, parsed.data.reason);
      return NextResponse.json({ status: booking.status });
    }
    case "complete": {
      const booking = await markBookingCompleted(id);
      return NextResponse.json({ status: booking.status });
    }
    case "refund": {
      const booking = await refundBooking(id);
      return NextResponse.json({ status: booking.status });
    }
    case "reschedule": {
      try {
        const booking = await rescheduleBooking(id, parsed.data.startsAt, parsed.data.timezone);
        await notifyBookingRescheduled(booking);
        return NextResponse.json({ status: "rescheduled" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Reschedule failed";
        return NextResponse.json({ error: message }, { status: 409 });
      }
    }
    case "set-meeting-url": {
      await prisma.booking.update({ where: { id }, data: { meetingUrl: parsed.data.meetingUrl } });
      return NextResponse.json({ ok: true });
    }
  }
}
