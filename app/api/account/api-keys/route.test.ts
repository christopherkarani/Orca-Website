import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setStoreForTests } from "@/lib/server/db";
import { createMemoryStore } from "@/lib/server/memory-store";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkMocks.auth,
  currentUser: clerkMocks.currentUser,
}));

describe("/api/account/api-keys", () => {
  beforeEach(() => {
    clerkMocks.auth.mockResolvedValue({ userId: "user_keys" });
    clerkMocks.currentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "keys@example.com" },
      emailAddresses: [],
    });
  });

  afterEach(() => {
    setStoreForTests(undefined);
  });

  it("creates an API key and only returns the raw secret once", async () => {
    const { POST, GET } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);

    const createResponse = await POST(
      new NextRequest("https://orca-tx.com/api/account/api-keys", {
        method: "POST",
        headers: { origin: "https://orca-tx.com" },
      })
    );
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.rawKey).toMatch(/^orca_key_oak_/);
    expect(created.key.keyLast4).toBe(created.rawKey.slice(-4));
    expect(created.key.scopes).toEqual(["license:read", "plan:read"]);

    const listResponse = await GET();
    const listed = await listResponse.json();
    expect(JSON.stringify(listed)).not.toContain(created.rawKey);
    expect(listed.keys[0]).toMatchObject({
      keyLast4: created.key.keyLast4,
    });
    expect(listed.keys[0]).not.toHaveProperty("revokedAt");
  });

  it("rejects unrecognized API key scopes", async () => {
    const { POST } = await import("./route");
    const store = createMemoryStore();
    setStoreForTests(store);

    const response = await POST(
      new NextRequest("https://orca-tx.com/api/account/api-keys", {
        method: "POST",
        headers: {
          origin: "https://orca-tx.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ scopes: ["license:read", "billing:write"] }),
      })
    );

    expect(response.status).toBe(400);
  });
});
