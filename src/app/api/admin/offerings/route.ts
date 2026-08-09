import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, UnauthorizedError } from "@/server/admin-guard";
import { offeringInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const offerings = await prisma.offering.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ offerings });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const body = await request.json().catch(() => null);
  const parsed = offeringInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const offering = await prisma.offering.create({ data: parsed.data });
    return NextResponse.json({ offering }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An offering with that slug already exists" }, { status: 409 });
  }
}
