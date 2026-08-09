import { NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createPendingBooking,
  SlotUnavailableError,
  OfferingUnavailableError,
} from "@/server/booking-service";
import { startCheckout } from "@/server/checkout-service";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limited = rateLimit(`create-booking:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const booking = await createPendingBooking(parsed.data);
    const checkout = await startCheckout(booking);
    return NextResponse.json({
      bookingNumber: booking.bookingNumber,
      checkoutUrl: checkout.url,
    });
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof OfferingUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[api/bookings] failed to create booking:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
