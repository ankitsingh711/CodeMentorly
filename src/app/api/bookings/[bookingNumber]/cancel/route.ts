import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelBookingSchema } from "@/lib/validation";
import { cancelBooking } from "@/server/booking-service";
import { notifyBookingCancelled } from "@/server/notification-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingNumber: string }> },
) {
  const { bookingNumber } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = cancelBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({ where: { bookingNumber } });
  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (existing.status === "CANCELLED") {
    return NextResponse.json({ error: "Booking is already cancelled" }, { status: 409 });
  }

  const booking = await cancelBooking(existing.id, parsed.data.reason);
  await notifyBookingCancelled(booking, parsed.data.reason);

  return NextResponse.json({ status: booking.status });
}
