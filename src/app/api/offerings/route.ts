import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const offerings = await prisma.offering.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ offerings });
}
