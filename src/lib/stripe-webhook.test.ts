import { describe, expect, it } from "vitest";
import Stripe from "stripe";

// Exercises the same signature-verification primitive used by
// /api/webhooks/stripe, independent of whether STRIPE_SECRET_KEY is set in
// this environment.
describe("Stripe webhook signature verification", () => {
  const stripe = new Stripe("sk_test_dummy_key_for_signature_tests", { apiVersion: "2026-07-29.dahlia" });
  const webhookSecret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });

  it("accepts a payload with a valid signature", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const event = stripe.webhooks.constructEvent(payload, header, webhookSecret);
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rejects a payload with an invalid signature", () => {
    expect(() => stripe.webhooks.constructEvent(payload, "t=1,v1=bogus", webhookSecret)).toThrow();
  });

  it("rejects a payload signed with the wrong secret", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong_secret" });
    expect(() => stripe.webhooks.constructEvent(payload, header, webhookSecret)).toThrow();
  });

  it("rejects a tampered payload", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const tampered = JSON.stringify({ id: "evt_test", type: "charge.refunded" });
    expect(() => stripe.webhooks.constructEvent(tampered, header, webhookSecret)).toThrow();
  });
});
