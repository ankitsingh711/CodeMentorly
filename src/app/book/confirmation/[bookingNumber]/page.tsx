import { notFound } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CheckCircle2, Mail, Video, Copy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: { offering: true, customer: true, payment: true },
  });

  if (!booking) notFound();

  const zonedStart = toZonedTime(booking.startsAt, booking.timezone);
  const zonedEnd = toZonedTime(booking.endsAt, booking.timezone);

  const statusLabel: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
    PENDING: { label: "Awaiting payment", variant: "warning" },
    CONFIRMED: { label: "Confirmed", variant: "success" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
    COMPLETED: { label: "Completed", variant: "muted" },
    REFUNDED: { label: "Refunded", variant: "muted" },
  };
  const status = statusLabel[booking.status];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          {booking.status === "CONFIRMED" ? (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">You&apos;re booked 🎉</h1>
            </>
          ) : booking.status === "PENDING" ? (
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Payment pending</h1>
          ) : (
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Booking {booking.status.toLowerCase()}</h1>
          )}

          <p className="mt-2 text-muted-foreground">
            Check your email for the confirmation and meeting details.
          </p>
        </div>

        <Card className="mx-auto mt-8 max-w-lg">
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold">{booking.offering.name}</p>
              <p className="text-muted-foreground">{format(zonedStart, "EEEE, MMMM d, yyyy")}</p>
              <p className="text-muted-foreground">
                {format(zonedStart, "h:mm a")} – {format(zonedEnd, "h:mm a")} ({booking.timezone})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Booking reference</p>
                <p className="font-mono font-medium">{booking.bookingNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">{formatPrice(booking.priceCents, booking.currency)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Confirmation sent to {booking.customer.email}
            </div>

            {booking.meetingUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-indigo-400" />
                <a href={booking.meetingUrl} className="text-indigo-400 underline underline-offset-2">
                  {booking.meetingUrl}
                </a>
              </div>
            )}

            {!booking.meetingUrl && booking.status === "CONFIRMED" && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Copy className="h-3.5 w-3.5" />
                Your meeting link will be sent to your email before the session.
              </p>
            )}
          </CardContent>
        </Card>

        {(booking.status === "CONFIRMED" || booking.status === "PENDING") && (
          <div className="mx-auto mt-6 max-w-lg text-center">
            <CancelBookingButton bookingNumber={booking.bookingNumber} />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
