import { describe, expect, it } from "vitest";
import { createBookingSchema, offeringInputSchema } from "@/lib/validation";

describe("createBookingSchema", () => {
  const base = {
    offeringId: "offering_123",
    startsAt: "2026-06-12T10:00:00.000Z",
    timezone: "Asia/Kolkata",
    fullName: "Jane Doe",
    email: "jane@example.com",
    topic: "Help me review my API design",
  };

  it("accepts a valid booking payload", () => {
    const result = createBookingSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = createBookingSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a topic that is too short", () => {
    const result = createBookingSchema.safeParse({ ...base, topic: "hi" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-ISO startsAt", () => {
    const result = createBookingSchema.safeParse({ ...base, startsAt: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed LinkedIn/GitHub URL", () => {
    const result = createBookingSchema.safeParse({ ...base, linkedinOrGithub: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty optional LinkedIn/GitHub field", () => {
    const result = createBookingSchema.safeParse({ ...base, linkedinOrGithub: "" });
    expect(result.success).toBe(true);
  });
});

describe("offeringInputSchema", () => {
  it("rejects an uppercase slug", () => {
    const result = offeringInputSchema.safeParse({
      slug: "Not-Valid",
      name: "Test",
      tagline: "Test",
      description: "A valid description here",
      audience: "Everyone",
      deliverables: ["Something"],
      priceCents: 1000,
      durationMinutes: 30,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid offering", () => {
    const result = offeringInputSchema.safeParse({
      slug: "valid-slug",
      name: "Test",
      tagline: "Test",
      description: "A valid description here",
      audience: "Everyone",
      deliverables: ["Something"],
      priceCents: 1000,
      durationMinutes: 30,
    });
    expect(result.success).toBe(true);
  });
});
