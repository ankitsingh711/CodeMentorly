import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, UnauthorizedError } from "@/server/admin-guard";
import { offeringInputSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = offeringInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const offering = await prisma.offering.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ offering });
  } catch {
    return NextResponse.json({ error: "Offering not found or slug conflict" }, { status: 409 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const { id } = await params;
  // Soft-disable instead of hard delete — bookings reference offerings and
  // deleting one would break historical booking records.
  const offering = await prisma.offering.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ offering });
}
