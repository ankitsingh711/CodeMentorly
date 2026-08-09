import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const offerings = [
  {
    slug: "career-engineering-consultation",
    name: "30-Minute Career & Engineering Consultation",
    tagline: "Get unstuck on career direction and technical growth",
    description:
      "A focused 30-minute session for developers who need advice on career direction, job preparation, technical growth, or engineering decisions.",
    audience: "Developers navigating a career decision, job search, or growth plateau.",
    deliverables: [
      "Direct, honest feedback on your situation",
      "A concrete next-steps plan",
      "Resources tailored to your goals",
    ],
    priceCents: 4900,
    durationMinutes: 30,
    sortOrder: 1,
  },
  {
    slug: "technical-deep-dive",
    name: "60-Minute Technical Deep Dive",
    tagline: "Work through a real technical problem, together",
    description:
      "A 60-minute 1:1 session to work through a real technical problem such as architecture, debugging, APIs, databases, React/Next.js, Node.js, or backend design.",
    audience: "Engineers stuck on a specific technical problem who need an expert pair.",
    deliverables: [
      "Live problem-solving on your actual codebase or design",
      "Clear explanation of the 'why', not just the fix",
      "Written summary of what we covered",
    ],
    priceCents: 9900,
    durationMinutes: 60,
    sortOrder: 2,
  },
  {
    slug: "code-review-architecture-session",
    name: "Code Review & Architecture Session",
    tagline: "Bring your codebase — leave with a clear improvement plan",
    description:
      "Bring your codebase, PR, architecture, or technical challenge. We review it together and identify concrete improvements, risks, and next steps.",
    audience: "Teams and solo builders who want a second pair of experienced eyes.",
    deliverables: [
      "Line-by-line or architecture-level review",
      "Prioritized list of risks and improvements",
      "Follow-up notes you can act on immediately",
    ],
    priceCents: 14900,
    durationMinutes: 60,
    sortOrder: 3,
  },
  {
    slug: "ai-llm-engineering-consultation",
    name: "AI / LLM Engineering Consultation",
    tagline: "Ship AI features that actually work in production",
    description:
      "Get practical guidance on building AI-powered products including LLM applications, RAG systems, AI agents, LangChain/LangGraph, evaluation, architecture, cost optimization, and production deployment.",
    audience: "Teams building AI features who want to avoid common production pitfalls.",
    deliverables: [
      "Architecture review for your AI feature or agent",
      "Cost and latency optimization guidance",
      "Evaluation and reliability strategy",
    ],
    priceCents: 14900,
    durationMinutes: 60,
    sortOrder: 4,
  },
  {
    slug: "mock-system-design-interview",
    name: "Mock System Design / Technical Interview",
    tagline: "Practice under real interview conditions",
    description:
      "A realistic technical interview session covering system design, backend architecture, APIs, databases, scalability, and engineering tradeoffs.",
    audience: "Engineers preparing for SDE-2+ or staff-level technical interviews.",
    deliverables: [
      "A realistic mock interview with live feedback",
      "Structured evaluation against real interview rubrics",
      "A focused practice plan for your gaps",
    ],
    priceCents: 9900,
    durationMinutes: 60,
    sortOrder: 5,
  },
  {
    slug: "custom-engineering-consultation",
    name: "Custom Engineering Consultation",
    tagline: "For the problem that doesn't fit a box",
    description:
      "A flexible 90-minute session for a technical problem that doesn't fit the standard offerings.",
    audience: "Anyone with a technical challenge that needs more time or a custom scope.",
    deliverables: [
      "90 minutes of flexible, focused working time",
      "Whatever combination of review, design, and troubleshooting you need",
      "A written summary of outcomes and next steps",
    ],
    priceCents: 19900,
    durationMinutes: 90,
    sortOrder: 6,
  },
];

async function main() {
  for (const offering of offerings) {
    await prisma.offering.upsert({
      where: { slug: offering.slug },
      update: offering,
      create: offering,
    });
  }

  // Monday - Friday, 10:00 - 19:00 (matches AvailabilitySettings default timezone)
  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    await prisma.availabilityRule.upsert({
      where: { dayOfWeek_startTime_endTime: { dayOfWeek, startTime: "10:00", endTime: "19:00" } },
      update: { isActive: true },
      create: { dayOfWeek, startTime: "10:00", endTime: "19:00", isActive: true },
    });
  }

  const existingSettings = await prisma.availabilitySettings.findFirst();
  if (!existingSettings) {
    await prisma.availabilitySettings.create({
      data: {
        timezone: "Asia/Kolkata",
        bufferMinutes: 15,
        minNoticeHours: 12,
        maxAdvanceDays: 45,
      },
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME ?? "Admin";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: adminName },
    create: { email: adminEmail, name: adminName, passwordHash, role: "ADMIN" },
  });

  console.log(`Seeded ${offerings.length} offerings, weekday availability, and admin user (${adminEmail}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
