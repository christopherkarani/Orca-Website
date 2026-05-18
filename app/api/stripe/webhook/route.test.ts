import { NextRequest } from "next/server";
import Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { setStoreForTests } from "@/lib/server/db";
import { POST } from "./route";

describe("POST /api/stripe/webhook", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("verifies Stripe signatures and applies idempotency", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    await store.upsertAccount({ id: "acct_webhook", email: "webhook@example.com" });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const payload = JSON.stringify({
      id: "evt_route_checkout",
      object: "event",
      type: "checkout.session.completed",
      created: 1779062400,
      data: {
        object: {
          id: "cs_route",
          object: "checkout.session",
          customer: "cus_route",
          customer_email: "webhook@example.com",
          subscription: "sub_route",
          status: "complete",
          payment_status: "paid",
          metadata: { accountId: "acct_webhook", tier: "pro", seatCount: "1" },
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const first = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": signature },
      })
    );
    const second = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": signature },
      })
    );

    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, processed: true });
    expect(await second.json()).toMatchObject({
      received: true,
      processed: false,
      reason: "duplicate_event",
    });
    expect(await store.getCustomerByStripeId("cus_route")).toMatchObject({
      accountId: "acct_webhook",
    });
    expect(await store.getCurrentLicenseForAccount("acct_webhook")).toBeNull();
  });

  it("rejects invalid signatures without mutating state", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "bad" },
      })
    );

    expect(response.status).toBe(400);
  });

  it("allows local signed fixture verification without a Stripe API secret", async () => {
    setStoreForTests(createMemoryStore());
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    const stripe = new Stripe("sk_test_fixture");
    const payload = JSON.stringify({
      id: "evt_route_fixture",
      object: "event",
      type: "fixture.ping",
      created: 1779062400,
      data: { object: {} },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": signature },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      processed: true,
    });
  });

  it("returns non-2xx for retryable out-of-order webhook processing", async () => {
    setStoreForTests(createMemoryStore());
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
    const stripe = new Stripe("sk_test_fixture");
    const payload = JSON.stringify({
      id: "evt_route_retryable",
      object: "event",
      type: "invoice.payment_failed",
      created: 1779062400,
      data: {
        object: {
          id: "in_retryable",
          subscription: "sub_not_seen_yet",
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": signature },
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      processed: false,
      reason: "unknown_subscription",
    });
  });
});
