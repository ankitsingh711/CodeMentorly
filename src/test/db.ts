import { prisma } from "@/lib/prisma";

export async function resetDb() {
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.offering.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.availabilitySettings.deleteMany();
  await prisma.dateOverride.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedTestOffering(overrides: Partial<Parameters<typeof prisma.offering.create>[0]["data"]> = {}) {
  return prisma.offering.create({
    data: {
      slug: `test-offering-${Math.random().toString(36).slice(2, 8)}`,
      name: "Test Offering",
      tagline: "A test offering",
      description: "Test description",
      audience: "Testers",
      deliverables: ["A test deliverable"],
      priceCents: 9900,
      durationMinutes: 60,
      isActive: true,
      ...overrides,
    },
  });
}

export async function seedWeekdayAvailability(timezone = "Asia/Kolkata") {
  for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
    await prisma.availabilityRule.create({
      data: { dayOfWeek, startTime: "10:00", endTime: "19:00", isActive: true },
    });
  }
  await prisma.availabilitySettings.create({
    data: { timezone, bufferMinutes: 15, minNoticeHours: 1, maxAdvanceDays: 60 },
  });
}
