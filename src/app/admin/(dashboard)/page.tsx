import { CalendarCheck, CheckCircle2, CircleDollarSign, ListChecks, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

export default async function AdminDashboardPage() {
  const now = new Date();

  const [total, upcoming, completed, cancelled, revenue, recentBookings] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED", startsAt: { gte: now } } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: { in: ["CANCELLED", "REFUNDED"] } } }),
    prisma.booking.aggregate({ _sum: { priceCents: true }, where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    prisma.booking.findMany({
      include: { offering: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of bookings and revenue.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total bookings" value={total} icon={ListChecks} />
        <StatCard label="Upcoming" value={upcoming} icon={CalendarCheck} />
        <StatCard label="Revenue" value={formatPrice(revenue._sum.priceCents ?? 0)} icon={CircleDollarSign} />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} />
        <StatCard label="Cancelled" value={cancelled} icon={XCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{booking.customer.fullName}</p>
                    <p className="truncate text-muted-foreground">
                      {booking.offering.name} · {format(booking.startsAt, "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden font-medium sm:inline">
                      {formatPrice(booking.priceCents, booking.currency)}
                    </span>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "CONFIRMED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "CANCELLED" || status === "REFUNDED"
          ? "destructive"
          : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
