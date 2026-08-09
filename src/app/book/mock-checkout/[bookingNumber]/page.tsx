import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MockCheckout } from "@/components/booking/mock-checkout";

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  if (isStripeConfigured) notFound();

  const { bookingNumber } = await params;
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber },
    include: { offering: true, payment: true },
  });

  if (!booking || booking.payment?.provider !== "MOCK") notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4 py-16 sm:px-6">
        <MockCheckout
          bookingNumber={booking.bookingNumber}
          offeringName={booking.offering.name}
          priceCents={booking.priceCents}
          currency={booking.currency}
          initialStatus={booking.status}
        />
      </main>
      <SiteFooter />
    </>
  );
}
