import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, UnauthorizedError } from "@/server/admin-guard";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const now = new Date();

  const [total, upcoming, completed, cancelled, confirmedRevenue, recentCustomers] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED", startsAt: { gte: now } } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: { in: ["CANCELLED", "REFUNDED"] } } }),
    prisma.booking.aggregate({
      _sum: { priceCents: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    prisma.customer.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return NextResponse.json({
    totalBookings: total,
    upcomingBookings: upcoming,
    completedSessions: completed,
    cancelledBookings: cancelled,
    revenueCents: confirmedRevenue._sum.priceCents ?? 0,
    recentCustomers,
  });
}
