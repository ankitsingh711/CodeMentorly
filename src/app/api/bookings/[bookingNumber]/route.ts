import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookingNumber: string }> },
) {
  const { bookingNumber } = await params;
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: { offering: true, customer: true, payment: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      timezone: booking.timezone,
      offeringName: booking.offering.name,
      customerEmail: booking.customer.email,
      customerName: booking.customer.fullName,
      meetingUrl: booking.meetingUrl,
      priceCents: booking.priceCents,
      currency: booking.currency,
      paymentStatus: booking.payment?.status ?? null,
      paymentProvider: booking.payment?.provider ?? null,
    },
  });
}
