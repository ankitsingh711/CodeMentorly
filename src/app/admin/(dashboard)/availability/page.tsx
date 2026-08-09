import { prisma } from "@/lib/prisma";
import { AvailabilityManager } from "@/components/admin/availability-manager";

export default async function AdminAvailabilityPage() {
  const [rules, settings] = await Promise.all([
    prisma.availabilityRule.findMany({ orderBy: [{ dayOfWeek: "asc" }] }),
    prisma.availabilitySettings.findFirst(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          Configure working days, hours, timezone, buffer, and booking window.
        </p>
      </div>
      <AvailabilityManager initialRules={rules} initialSettings={settings} />
    </div>
  );
}
