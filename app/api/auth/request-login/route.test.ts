import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { setStoreForTests } from "@/lib/server/db";

describe("POST /api/auth/request-login", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ORCA_SITE_URL = "https://orca-tx.com";
    setStoreForTests(undefined);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
    vi.restoreAllMocks();
  });

  it("creates a dev-visible one-time link for an existing account", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_login", email: "buyer@example.com" });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/request-login", {
        method: "POST",
        headers: { accept: "application/json" },
        body: new URLSearchParams({ email: "buyer@example.com" }),
      })
    );
    const body = await response.json();
    const token = new URL(body.devAccessLink).searchParams.get("token");

    expect(response.status).toBe(200);
    expect(body.devAccessLink).toContain("/api/auth/magic?token=");
    await expect(store.consumeLoginToken(token!)).resolves.toBe("acct_login");
  });

  it("does not expose whether an account exists", async () => {
    const { POST } = await import("./route");
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("http://localhost/api/auth/request-login", {
        method: "POST",
        headers: { accept: "application/json" },
        body: new URLSearchParams({ email: "missing@example.com" }),
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("sends production login emails without returning the link to the browser", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_AUTH_SECRET = "a-production-session-secret-with-32-bytes";
    process.env.RESEND_API_KEY = "re_live_test";
    process.env.ORCA_EMAIL_FROM = "Orca <accounts@orca-tx.com>";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 })
    );
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_prod_login", email: "buyer@example.com" });

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/auth/request-login", {
        method: "POST",
        headers: {
          accept: "application/json",
          origin: "https://orca-tx.com",
        },
        body: new URLSearchParams({ email: "buyer@example.com" }),
      })
    );
    const body = await response.json();

    expect(body).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer re_live_test",
        }),
      })
    );
  });

  it("throttles repeated login emails for the same account without revealing the limit", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_AUTH_SECRET = "a-production-session-secret-with-32-bytes";
    process.env.RESEND_API_KEY = "re_live_test";
    process.env.ORCA_EMAIL_FROM = "Orca <accounts@orca-tx.com>";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 })
    );
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_throttle", email: "throttle@example.com" });

    for (let index = 0; index < 6; index += 1) {
      const response = await POST(
        new NextRequest("https://orca-tx.com/api/auth/request-login", {
          method: "POST",
          headers: {
            accept: "application/json",
            origin: "https://orca-tx.com",
          },
          body: new URLSearchParams({ email: "throttle@example.com" }),
        })
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("keeps email delivery failures generic to avoid account enumeration", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_AUTH_SECRET = "a-production-session-secret-with-32-bytes";
    process.env.RESEND_API_KEY = "re_live_test";
    process.env.ORCA_EMAIL_FROM = "Orca <accounts@orca-tx.com>";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unavailable", { status: 503 })
    );
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_email_failure", email: "buyer@example.com" });

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/auth/request-login", {
        method: "POST",
        headers: {
          accept: "application/json",
          origin: "https://orca-tx.com",
        },
        body: new URLSearchParams({ email: "buyer@example.com" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects cross-site account-link requests before issuing tokens", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    const { POST } = await import("./route");
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/auth/request-login", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: new URLSearchParams({ email: "buyer@example.com" }),
      })
    );

    expect(response.status).toBe(403);
  });
});
