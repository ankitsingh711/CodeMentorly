import { prisma } from "@/lib/prisma";
import { OfferingsManager } from "@/components/admin/offerings-manager";

export default async function AdminOfferingsPage() {
  const offerings = await prisma.offering.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offerings</h1>
        <p className="text-sm text-muted-foreground">Add, edit, price, and enable or disable services.</p>
      </div>
      <OfferingsManager initialOfferings={offerings} />
    </div>
  );
}
