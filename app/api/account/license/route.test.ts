import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { createSession } from "@/lib/server/auth";
import { setStoreForTests } from "@/lib/server/db";
import { GET } from "./route";

describe("GET /api/account/license", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("rejects unauthenticated requests", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    const response = await GET(new NextRequest("http://localhost/api/account/license"));

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated production requests before requiring the database", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    delete process.env.DATABASE_URL;

    const response = await GET(new NextRequest("http://localhost/api/account/license"));

    expect(response.status).toBe(401);
  });

  it("returns the authenticated account's current license", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_fetch", email: "fetch@example.com" });
    await store.upsertSubscription({
      id: "sub_fetch",
      accountId: "acct_fetch",
      customerId: "cus_fetch",
      stripeSubscriptionId: "sub_fetch",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    await store.issueLicenseForAccount("acct_fetch", {
      privateKeyPem: store.testPrivateKeyPem,
      keyVersion: "test-key",
      now: new Date("2026-05-17T00:00:00.000Z"),
    });
    const session = await createSession(store, "acct_fetch", {
      now: new Date("2026-05-17T00:00:00.000Z"),
    });

    const response = await GET(
      new NextRequest("http://localhost/api/account/license", {
        headers: { cookie: `orca_session=${session.token}` },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.license).toMatchObject({
      accountId: "acct_fetch",
      tier: "pro",
      licenseKey: expect.stringMatching(/^orca_/),
    });
    expect(body.activationCommand).toContain("orca license activate orca_");
  });
});
