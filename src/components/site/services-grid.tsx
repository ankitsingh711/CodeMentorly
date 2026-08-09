import { prisma } from "@/lib/prisma";
import { ServiceCard } from "@/components/site/service-card";

export async function ServicesGrid() {
  const offerings = await prisma.offering.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <section id="services" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-indigo-400">Services</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Choose the session that fits</h2>
          <p className="mt-3 text-muted-foreground">
            Every session is 1:1, focused entirely on your problem, and booked directly on my calendar.
          </p>
        </div>

        {offerings.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            No services are available right now. Please check back soon.
          </p>
        ) : (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((offering) => (
              <ServiceCard key={offering.id} offering={offering} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
