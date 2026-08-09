import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession, UnauthorizedError } from "@/server/admin-guard";
import { availabilityRuleInputSchema, availabilitySettingsInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const [rules, settings] = await Promise.all([
    prisma.availabilityRule.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.availabilitySettings.findFirst(),
  ]);

  return NextResponse.json({ rules, settings });
}

const putSchema = z.object({
  rules: z.array(availabilityRuleInputSchema),
  settings: availabilitySettingsInputSchema,
});

export async function PUT(request: Request) {
  try {
    await requireAdminSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { rules, settings } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({});
    if (rules.length > 0) {
      await tx.availabilityRule.createMany({ data: rules });
    }

    const existing = await tx.availabilitySettings.findFirst();
    if (existing) {
      await tx.availabilitySettings.update({
        where: { id: existing.id },
        data: { ...settings, meetingUrlTemplate: settings.meetingUrlTemplate || null },
      });
    } else {
      await tx.availabilitySettings.create({
        data: { ...settings, meetingUrlTemplate: settings.meetingUrlTemplate || null },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
