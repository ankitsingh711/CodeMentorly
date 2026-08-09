import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/utils";
import {
  bookingConfirmationEmail,
  paymentConfirmationEmail,
  cancellationEmail,
  rescheduleEmail,
  reminderEmail,
  adminNewBookingEmail,
  adminCancellationEmail,
} from "@/lib/email-templates";
import type { Booking, Customer, Offering, NotificationType } from "@prisma/client";

type FullBooking = Booking & { offering: Offering; customer: Customer };

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

function toEmailData(booking: FullBooking) {
  const zoned = toZonedTime(booking.startsAt, booking.timezone);
  const zonedEnd = toZonedTime(booking.endsAt, booking.timezone);
  return {
    bookingNumber: booking.bookingNumber,
    offeringName: booking.offering.name,
    dateLabel: format(zoned, "EEEE, MMMM d, yyyy"),
    timeRangeLabel: `${format(zoned, "h:mm a")} – ${format(zonedEnd, "h:mm a")}`,
    timezone: booking.timezone,
    customerName: booking.customer.fullName,
    meetingUrl: booking.meetingUrl,
    topic: booking.topic,
  };
}

async function dispatch(booking: FullBooking, type: NotificationType, to: string, build: () => { subject: string; html: string }) {
  const notification = await prisma.notification.create({
    data: { bookingId: booking.id, type, recipient: to, status: "PENDING" },
  });

  const { subject, html } = build();
  const result = await sendEmail({ to, subject, html });

  await prisma.notification.update({
    where: { id: notification.id },
    data: result.ok
      ? { status: "SENT", sentAt: new Date() }
      : { status: "FAILED", error: result.error ?? "unknown error" },
  });
}

export async function notifyBookingConfirmed(booking: FullBooking) {
  const data = toEmailData(booking);
  await dispatch(booking, "BOOKING_CONFIRMATION_CUSTOMER", booking.customer.email, () =>
    bookingConfirmationEmail(data),
  );
  await dispatch(booking, "PAYMENT_CONFIRMATION_CUSTOMER", booking.customer.email, () =>
    paymentConfirmationEmail({ ...data, amountLabel: formatPrice(booking.priceCents, booking.currency) }),
  );
  if (ADMIN_EMAIL) {
    await dispatch(booking, "NEW_BOOKING_ADMIN", ADMIN_EMAIL, () =>
      adminNewBookingEmail({ ...data, customerEmail: booking.customer.email }),
    );
  }
}

export async function notifyBookingCancelled(booking: FullBooking, reason?: string) {
  const data = toEmailData(booking);
  await dispatch(booking, "CANCELLATION_CUSTOMER", booking.customer.email, () =>
    cancellationEmail({ ...data, reason }),
  );
  if (ADMIN_EMAIL) {
    await dispatch(booking, "CANCELLATION_ADMIN", ADMIN_EMAIL, () =>
      adminCancellationEmail({ ...data, customerEmail: booking.customer.email }),
    );
  }
}

export async function notifyBookingRescheduled(booking: FullBooking) {
  const data = toEmailData(booking);
  await dispatch(booking, "RESCHEDULE_CUSTOMER", booking.customer.email, () => rescheduleEmail(data));
}

export async function notifyBookingReminder(booking: FullBooking) {
  const data = toEmailData(booking);
  await dispatch(booking, "REMINDER_CUSTOMER", booking.customer.email, () => reminderEmail(data));
}
