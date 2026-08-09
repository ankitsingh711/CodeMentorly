import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, UnauthorizedError } from "@/server/admin-guard";
import type { BookingStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as BookingStatus | null;

  const bookings = await prisma.booking.findMany({
    where: status ? { status } : undefined,
    include: { offering: true, customer: true, payment: true },
    orderBy: { startsAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ bookings });
}
