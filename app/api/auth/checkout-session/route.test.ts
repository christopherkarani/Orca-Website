import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { setStoreForTests } from "@/lib/server/db";

const stripeMocks = vi.hoisted(() => ({
  checkoutRetrieve: vi.fn(),
  subscriptionRetrieve: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = {
      sessions: {
        retrieve: stripeMocks.checkoutRetrieve,
      },
    };

    subscriptions = {
      retrieve: stripeMocks.subscriptionRetrieve,
    };
  },
}));

describe("GET /api/auth/checkout-session", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_route";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
    process.env.STRIPE_TEAM_PRICE_ID = "price_team";
    stripeMocks.checkoutRetrieve.mockReset();
    stripeMocks.subscriptionRetrieve.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("rejects complete checkout sessions that are not paid", async () => {
    const { GET } = await import("./route");
    setStoreForTests(createMemoryStore());
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "unpaid",
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_unpaid")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("checkout_incomplete");
    expect(stripeMocks.subscriptionRetrieve).not.toHaveBeenCalled();
  });

  it("redirects to account error when Stripe cannot retrieve the checkout session", async () => {
    const { GET } = await import("./route");
    setStoreForTests(createMemoryStore());
    stripeMocks.checkoutRetrieve.mockRejectedValue(new Error("Stripe unavailable"));

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_missing")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("checkout_session");
    expect(stripeMocks.subscriptionRetrieve).not.toHaveBeenCalled();
  });

  it("does not issue a paid license when subscription period end is missing", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_period_missing", tier: "pro", seatCount: "1" },
      customer_email: "period@example.com",
      customer: "cus_period_missing",
      subscription: "sub_period_missing",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "active",
      items: { data: [{ price: { id: "price_pro" } }] },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_period_missing")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("subscription_period");
    expect(await store.getCurrentLicenseForAccount("acct_period_missing")).toBeNull();
  });

  it("does not issue a paid license when subscription period end is expired", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_period_expired", tier: "pro", seatCount: "1" },
      customer_email: "expired@example.com",
      customer: "cus_period_expired",
      subscription: "sub_period_expired",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "active",
      current_period_end: 1577836800,
      items: { data: [{ price: { id: "price_pro" } }] },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_period_expired")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("subscription_period");
    expect(await store.getCurrentLicenseForAccount("acct_period_expired")).toBeNull();
  });

  it("redirects to account error when Stripe cannot retrieve the subscription", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_sub_lookup", tier: "pro", seatCount: "1" },
      customer_email: "lookup@example.com",
      customer: "cus_sub_lookup",
      subscription: "sub_lookup",
    });
    stripeMocks.subscriptionRetrieve.mockRejectedValue(new Error("Stripe unavailable"));

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_sub_lookup")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("subscription_lookup");
    expect(await store.getCurrentLicenseForAccount("acct_sub_lookup")).toBeNull();
  });

  it("creates an account session and expiring paid license for a paid checkout", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_checkout_ok", tier: "team", seatCount: "4" },
      customer_email: "team@example.com",
      customer: "cus_checkout_ok",
      subscription: "sub_checkout_ok",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "active",
      current_period_end: 1781654400,
      items: { data: [{ quantity: 6, price: { id: "price_team" } }] },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_checkout_ok")
    );
    const license = await store.getCurrentLicenseForAccount("acct_checkout_ok");

    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain("orca_session=");
    expect(license).toMatchObject({
      tier: "team",
      seatCount: 6,
      expiresAt: "2026-06-17T00:00:00.000Z",
    });
  });

  it("uses the subscription item period end when Stripe omits the legacy subscription-level period", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_checkout_item_period", tier: "pro", seatCount: "1" },
      customer_email: "item-period@example.com",
      customer: "cus_checkout_item_period",
      subscription: "sub_checkout_item_period",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "active",
      items: {
        data: [{ current_period_end: 1781654400, price: { id: "price_pro" } }],
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_item_period")
    );

    expect(response.status).toBe(303);
    await expect(
      store.getCurrentLicenseForAccount("acct_checkout_item_period")
    ).resolves.toMatchObject({
      tier: "pro",
      expiresAt: "2026-06-17T00:00:00.000Z",
    });
  });

  it("preserves the Stripe subscription status when checkout completes during a trial", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_checkout_trial", tier: "pro", seatCount: "1" },
      customer_email: "trial@example.com",
      customer: "cus_checkout_trial",
      subscription: "sub_checkout_trial",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "trialing",
      current_period_end: 1781654400,
      items: { data: [{ price: { id: "price_pro" } }] },
    });

    await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_checkout_trial")
    );

    await expect(store.getSubscriptionByStripeId("sub_checkout_trial")).resolves.toMatchObject({
      status: "trialing",
    });
  });

  it("uses the Stripe subscription price, not stale checkout metadata, for the license tier", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_checkout_price_source", tier: "team", seatCount: "9" },
      customer_email: "price-source@example.com",
      customer: "cus_checkout_price_source",
      subscription: "sub_checkout_price_source",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "active",
      current_period_end: 1781654400,
      items: { data: [{ quantity: 9, price: { id: "price_pro" } }] },
    });

    await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_price_source")
    );

    await expect(store.getCurrentLicenseForAccount("acct_checkout_price_source")).resolves.toMatchObject({
      tier: "pro",
      seatCount: 1,
    });
  });

  it("rejects checkout success when the subscription price is not configured", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = store.testPrivateKeyPem;
    process.env.ORCA_LICENSE_KEY_VERSION = "test-key";
    stripeMocks.checkoutRetrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      metadata: { accountId: "acct_unknown_price", tier: "pro", seatCount: "1" },
      customer_email: "unknown-price@example.com",
      customer: "cus_unknown_price",
      subscription: "sub_unknown_price",
    });
    stripeMocks.subscriptionRetrieve.mockResolvedValue({
      status: "active",
      current_period_end: 1781654400,
      items: { data: [{ price: { id: "price_unknown" } }] },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/checkout-session?session_id=cs_unknown_price")
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("subscription_price");
    expect(await store.getCurrentLicenseForAccount("acct_unknown_price")).toBeNull();
  });
});
