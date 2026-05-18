import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "@/lib/server/auth";
import { setStoreForTests } from "@/lib/server/db";
import { createMemoryStore } from "@/lib/server/memory-store";

const stripeMocks = vi.hoisted(() => ({
  portalCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    billingPortal = {
      sessions: {
        create: stripeMocks.portalCreate,
      },
    };
  },
}));

describe("POST /api/billing/portal", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_portal";
    process.env.ORCA_SITE_URL = "https://orca-tx.com";
    stripeMocks.portalCreate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("redirects unauthenticated customers to account access", async () => {
    const { POST } = await import("./route");
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
        headers: { origin: "http://localhost" },
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/account?error=session");
    expect(stripeMocks.portalCreate).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated production requests before requiring the database", async () => {
    const { POST } = await import("./route");
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_SITE_URL = "https://orca-tx.com";
    delete process.env.DATABASE_URL;

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/billing/portal", {
        method: "POST",
        headers: { origin: "https://orca-tx.com" },
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/account?error=session");
    expect(stripeMocks.portalCreate).not.toHaveBeenCalled();
  });

  it("creates a Stripe Customer Portal session for the authenticated subscription customer", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_portal", email: "portal@example.com" });
    await store.upsertSubscription({
      accountId: "acct_portal",
      customerId: "cus_portal",
      stripeSubscriptionId: "sub_portal",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    const session = await createSession(store, "acct_portal");
    stripeMocks.portalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/test",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
        headers: {
          cookie: `orca_session=${session.token}`,
          origin: "http://localhost",
        },
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://billing.stripe.com/p/session/test");
    expect(stripeMocks.portalCreate).toHaveBeenCalledWith({
      customer: "cus_portal",
      return_url: "https://orca-tx.com/account",
    });
  });

  it("prefers the active entitled subscription for Customer Portal access", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_portal_overlap", email: "overlap@example.com" });
    await store.upsertSubscription({
      accountId: "acct_portal_overlap",
      customerId: "cus_old_canceled",
      stripeSubscriptionId: "sub_old_canceled",
      tier: "free",
      status: "canceled",
      seatCount: 1,
    });
    await store.upsertSubscription({
      accountId: "acct_portal_overlap",
      customerId: "cus_active",
      stripeSubscriptionId: "sub_active",
      tier: "team",
      status: "active",
      seatCount: 4,
      currentPeriodEnd: "2026-07-18T00:00:00.000Z",
    });
    const session = await createSession(store, "acct_portal_overlap");
    stripeMocks.portalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/active",
    });

    await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
        headers: {
          cookie: `orca_session=${session.token}`,
          origin: "http://localhost",
        },
      })
    );

    expect(stripeMocks.portalCreate).toHaveBeenCalledWith({
      customer: "cus_active",
      return_url: "https://orca-tx.com/account",
    });
  });

  it("rejects cross-site portal requests before contacting Stripe", async () => {
    const { POST } = await import("./route");
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      })
    );

    expect(response.status).toBe(403);
    expect(stripeMocks.portalCreate).not.toHaveBeenCalled();
  });

  it("redirects back to account when Stripe cannot create a portal session", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_portal_error", email: "error@example.com" });
    await store.upsertSubscription({
      accountId: "acct_portal_error",
      customerId: "cus_portal_error",
      stripeSubscriptionId: "sub_portal_error",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    const session = await createSession(store, "acct_portal_error");
    stripeMocks.portalCreate.mockRejectedValue(new Error("portal not configured"));

    const response = await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
        headers: {
          cookie: `orca_session=${session.token}`,
          origin: "http://localhost",
        },
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/account?error=billing_portal");
  });

  it("redirects back to account when Stripe returns no portal URL", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_portal_missing_url", email: "missing@example.com" });
    await store.upsertSubscription({
      accountId: "acct_portal_missing_url",
      customerId: "cus_portal_missing_url",
      stripeSubscriptionId: "sub_portal_missing_url",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    const session = await createSession(store, "acct_portal_missing_url");
    stripeMocks.portalCreate.mockResolvedValue({});

    const response = await POST(
      new NextRequest("http://localhost/api/billing/portal", {
        method: "POST",
        headers: {
          cookie: `orca_session=${session.token}`,
          origin: "http://localhost",
        },
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/account?error=billing_portal");
  });
});
