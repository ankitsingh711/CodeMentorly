import { describe, expect, it } from "vitest";
import { generateBookingNumber } from "@/lib/booking-number";

describe("generateBookingNumber", () => {
  it("produces a CM- prefixed reference", () => {
    expect(generateBookingNumber()).toMatch(/^CM-[A-Z2-9]{6}$/);
  });

  it("does not include ambiguous characters", () => {
    const number = generateBookingNumber();
    expect(number).not.toMatch(/[01IO]/);
  });

  it("generates distinct values across many calls", () => {
    const values = new Set(Array.from({ length: 200 }, () => generateBookingNumber()));
    expect(values.size).toBeGreaterThan(190);
  });
});
