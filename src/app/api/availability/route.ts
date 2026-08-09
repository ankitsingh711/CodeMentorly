import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/availability";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const querySchema = z.object({
  offeringId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(64),
});

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  const limited = rateLimit(`availability:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    offeringId: searchParams.get("offeringId"),
    date: searchParams.get("date"),
    timezone: searchParams.get("timezone"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const slots = await getAvailableSlots({
    offeringId: parsed.data.offeringId,
    dateISO: parsed.data.date,
    timezone: parsed.data.timezone,
  });

  return NextResponse.json({ slots });
}
