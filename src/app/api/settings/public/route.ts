import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Public, non-sensitive subset of availability settings used to bound the booking calendar. */
export async function GET() {
  const settings = await prisma.availabilitySettings.findFirst();
  return NextResponse.json({
    timezone: settings?.timezone ?? "Asia/Kolkata",
    maxAdvanceDays: settings?.maxAdvanceDays ?? 45,
    minNoticeHours: settings?.minNoticeHours ?? 12,
  });
}
