import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { JsonLd } from "@/components/site/json-ld";
import { site } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const offering = await prisma.offering.findUnique({ where: { slug } });
  if (!offering) return {};
  return {
    title: `Book: ${offering.name}`,
    description: offering.description,
  };
}

export default async function BookOfferingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offering = await prisma.offering.findUnique({ where: { slug } });

  if (!offering || !offering.isActive) notFound();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: offering.name,
          description: offering.description,
          provider: { "@type": "Person", name: site.ownerName },
          offers: {
            "@type": "Offer",
            price: (offering.priceCents / 100).toFixed(2),
            priceCurrency: offering.currency.toUpperCase(),
            url: `${site.url}/book/${offering.slug}`,
          },
        }}
      />
      <SiteHeader />
      <main className="flex-1 px-4 py-12 sm:px-6">
        <BookingWizard offering={offering} />
      </main>
      <SiteFooter />
    </>
  );
}
