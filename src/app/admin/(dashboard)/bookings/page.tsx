import { prisma } from "@/lib/prisma";
import { BookingsTable } from "@/components/admin/bookings-table";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { offering: true, customer: true, payment: true },
    orderBy: { startsAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">View and manage all bookings.</p>
      </div>
      <BookingsTable initialBookings={bookings} />
    </div>
  );
}
