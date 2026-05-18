import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { createLoginToken } from "@/lib/server/auth";
import { createMemoryStore } from "@/lib/server/memory-store";
import { setStoreForTests } from "@/lib/server/db";

describe("/api/auth/magic", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    setStoreForTests(undefined);
  });

  it("shows a confirmation page without consuming the token on GET", async () => {
    const { GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_magic", email: "magic@example.com" });
    const loginToken = await createLoginToken(store, "acct_magic");

    const response = await GET(
      new NextRequest(
        `http://localhost/api/auth/magic?token=${encodeURIComponent(loginToken.token)}`
      )
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(body).toContain("Open your Orca account");
    await expect(store.consumeLoginToken(loginToken.token)).resolves.toBe("acct_magic");
  });

  it("consumes a one-time login token on POST and creates an account session", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_magic_post", email: "magic-post@example.com" });
    const loginToken = await createLoginToken(store, "acct_magic_post");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/magic", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({ token: loginToken.token }),
      })
    );
    const replay = await POST(
      new NextRequest("http://localhost/api/auth/magic", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({ token: loginToken.token }),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain("orca_session=");
    expect(response.headers.get("location")).toContain("login=success");
    expect(replay.headers.get("set-cookie")).toBeNull();
    expect(replay.headers.get("location")).toContain("login_link");
  });

  it("rejects expired login tokens", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);
    await store.upsertAccount({ id: "acct_expired", email: "expired@example.com" });
    await store.createLoginToken(
      "acct_expired",
      "expired-token",
      "2020-01-01T00:00:00.000Z"
    );

    const response = await POST(
      new NextRequest("http://localhost/api/auth/magic", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body: new URLSearchParams({ token: "expired-token" }),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("location")).toContain("login_link");
  });

  it("rejects cross-site magic-link token consumption", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    const { POST } = await import("./route");
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/auth/magic", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: new URLSearchParams({ token: "stolen-token" }),
      })
    );

    expect(response.status).toBe(403);
  });
});
