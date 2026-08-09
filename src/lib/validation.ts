import { z } from "zod";

export const createBookingSchema = z.object({
  offeringId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(64),
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(160),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  topic: z.string().trim().min(5, "Tell us a bit about what you need help with").max(200),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  linkedinOrGithub: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\//.test(v), "Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const rescheduleBookingSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(64),
});

export const offeringInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(4000),
  audience: z.string().trim().min(2).max(500),
  deliverables: z.array(z.string().trim().min(1)).min(1).max(10),
  priceCents: z.coerce.number().int().min(0).max(10_000_00),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type OfferingInput = z.infer<typeof offeringInputSchema>;

export const availabilityRuleInputSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  isActive: z.coerce.boolean().default(true),
});

export const availabilitySettingsInputSchema = z.object({
  timezone: z.string().min(1).max(64),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  minNoticeHours: z.coerce.number().int().min(0).max(240),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  meetingUrlTemplate: z.string().trim().max(500).optional().or(z.literal("")),
});
