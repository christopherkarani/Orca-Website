import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { createAccountApiKey } from "@/lib/server/auth";
import { setStoreForTests } from "@/lib/server/db";
import { POST } from "./route";

describe("POST /api/account/license/rotate", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("rotates the authenticated account's license", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    const account = await store.upsertAccount({ id: "acct_rotate", email: "rotate@example.com" });
    const { rawKey } = await createAccountApiKey(store, account.id, "CI", [
      "license:read",
      "license:rotate",
      "plan:read",
    ]);

    const response = await POST(
      new NextRequest("http://localhost/api/account/license/rotate", {
        method: "POST",
        headers: {
          authorization: `Bearer ${rawKey}`,
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.licenseKey).toMatch(/^orca_/);
    expect(body.activationCommand).toBe(`orca license activate ${body.licenseKey}`);
  });

  it("rejects cross-site rotation requests", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/account/license/rotate", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      })
    );

    expect(response.status).toBe(403);
  });

  it("rejects unauthenticated production requests before requiring the database", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_SITE_URL = "https://orca-tx.com";
    delete process.env.DATABASE_URL;

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/account/license/rotate", {
        method: "POST",
        headers: { origin: "https://orca-tx.com" },
      })
    );

    expect(response.status).toBe(401);
  });

  it("redirects browser form submissions back to the account dashboard", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    const account = await store.upsertAccount({ id: "acct_rotate_form", email: "form@example.com" });
    const { rawKey } = await createAccountApiKey(store, account.id, "CI", [
      "license:read",
      "license:rotate",
      "plan:read",
    ]);

    const response = await POST(
      new NextRequest("http://localhost/api/account/license/rotate", {
        method: "POST",
        headers: {
          accept: "text/html",
          authorization: `Bearer ${rawKey}`,
        },
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/account?license=rotated");
  });
});
