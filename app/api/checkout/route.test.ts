import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { setStoreForTests } from "@/lib/server/db";

const stripeMocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = {
      sessions: {
        create: stripeMocks.checkoutCreate,
      },
    };
  },
}));

describe("POST /api/checkout", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_checkout";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
    process.env.STRIPE_TEAM_PRICE_ID = "price_team";
    process.env.ORCA_SITE_URL = "https://orca-tx.com";
    stripeMocks.checkoutCreate.mockReset();
    setStoreForTests(createMemoryStore());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("creates a Stripe Checkout subscription session with downstream Orca metadata", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    stripeMocks.checkoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({
          tier: "team",
          email: "Team@Example.com",
          seatCount: "7",
        }),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/c/pay/cs_test");
    await expect(store.getAccountByEmail("team@example.com")).resolves.toBeNull();
    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer_email: "team@example.com",
        line_items: [{ price: "price_team", quantity: 7 }],
        success_url:
          "https://orca-tx.com/api/auth/checkout-session?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://orca-tx.com/pricing?checkout=cancelled",
        metadata: expect.objectContaining({
          accountId: expect.stringMatching(/^acct_/),
          tier: "team",
          seatCount: "7",
        }),
        subscription_data: {
          metadata: expect.objectContaining({
            accountId: expect.stringMatching(/^acct_/),
            email: "team@example.com",
            tier: "team",
            seatCount: "7",
          }),
        },
      })
    );
  });

  it("rejects invalid checkout form input before calling Stripe", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({
          tier: "free",
          email: "not-an-email",
        }),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/pricing?error=checkout");
    expect(stripeMocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("caps Team checkout quantity before sending it to Stripe", async () => {
    const { POST } = await import("./route");
    stripeMocks.checkoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test",
    });

    await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({
          tier: "team",
          email: "large-team@example.com",
          seatCount: "9999",
        }),
      })
    );

    expect(stripeMocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_team", quantity: 250 }],
        metadata: expect.objectContaining({ seatCount: "250" }),
        subscription_data: {
          metadata: expect.objectContaining({ seatCount: "250" }),
        },
      })
    );
  });

  it("rejects cross-site Checkout requests before calling Stripe", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: new URLSearchParams({
          tier: "pro",
          email: "buyer@example.com",
        }),
      })
    );

    expect(response.status).toBe(403);
    expect(stripeMocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("redirects browser form submissions back to pricing when Checkout is unavailable", async () => {
    const { POST } = await import("./route");
    stripeMocks.checkoutCreate.mockRejectedValue(new Error("Stripe unavailable"));

    const response = await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: {
          accept: "text/html",
          origin: "http://localhost",
        },
        body: new URLSearchParams({
          tier: "pro",
          email: "buyer@example.com",
        }),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/pricing?error=checkout_unavailable");
  });

  it("returns JSON for API-style callers when Checkout is unavailable", async () => {
    const { POST } = await import("./route");
    stripeMocks.checkoutCreate.mockResolvedValue({});

    const response = await POST(
      new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({
          tier: "pro",
          email: "buyer@example.com",
        }),
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "checkout_unavailable",
    });
  });
});
