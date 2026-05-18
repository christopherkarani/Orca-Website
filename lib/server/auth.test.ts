import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccountApiKey,
  getAccountFromApiKey,
  getAccountForLicenseRequest,
} from "./auth";
import { createMemoryStore } from "./memory-store";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkMocks.auth,
  currentUser: clerkMocks.currentUser,
}));

describe("account API keys", () => {
  afterEach(() => {
    clerkMocks.auth.mockReset();
    clerkMocks.currentUser.mockReset();
  });

  it("stores only hashed API keys and authenticates by bearer token", async () => {
    const store = createMemoryStore();
    const account = await store.upsertAccount({
      id: "acct_api",
      clerkUserId: "user_api",
      email: "api@example.com",
    });
    const { rawKey, record } = await createAccountApiKey(store, account.id, "CI");

    expect(rawKey).toMatch(/^orca_key_oak_/);
    expect(record.keyLast4).toBe(rawKey.slice(-4));
    expect(JSON.stringify(await store.listApiKeys(account.id))).not.toContain(rawKey);

    const request = new NextRequest("https://orca-tx.com/api/account/license", {
      headers: { authorization: `Bearer ${rawKey}` },
    });
    const authenticated = await getAccountFromApiKey(store, request, "license:read");

    expect(authenticated?.account.id).toBe(account.id);
    expect(authenticated?.apiKey.lastUsedAt).toBeDefined();
  });

  it("rejects revoked keys", async () => {
    const store = createMemoryStore();
    const account = await store.upsertAccount({
      id: "acct_revoked",
      clerkUserId: "user_revoked",
      email: "revoked@example.com",
    });
    const { rawKey, record } = await createAccountApiKey(store, account.id, "CI");
    await store.revokeApiKey(account.id, record.id);

    const request = new NextRequest("https://orca-tx.com/api/account/license", {
      headers: { authorization: `Bearer ${rawKey}` },
    });

    await expect(getAccountFromApiKey(store, request, "license:read")).resolves.toBeNull();
  });

  it("rejects keys without the required scope", async () => {
    const store = createMemoryStore();
    const account = await store.upsertAccount({
      id: "acct_scope",
      clerkUserId: "user_scope",
      email: "scope@example.com",
    });
    const { rawKey } = await createAccountApiKey(store, account.id, "Read only", [
      "license:read",
    ]);

    const request = new NextRequest("https://orca-tx.com/api/account/license/rotate", {
      headers: { authorization: `Bearer ${rawKey}` },
    });

    await expect(
      getAccountForLicenseRequest(store, request, "license:rotate")
    ).resolves.toBeNull();
  });

  it("does not fall back to Clerk when an Authorization header is present", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({
      id: "acct_clerk",
      clerkUserId: "user_clerk",
      email: "clerk@example.com",
    });
    clerkMocks.auth.mockResolvedValue({ userId: "user_clerk" });
    clerkMocks.currentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "clerk@example.com" },
      emailAddresses: [],
    });

    const request = new NextRequest("https://orca-tx.com/api/account/license", {
      headers: { authorization: "Bearer orca_key_oak_missing_invalid" },
    });

    await expect(
      getAccountForLicenseRequest(store, request, "license:read")
    ).resolves.toBeNull();
    expect(clerkMocks.auth).not.toHaveBeenCalled();
  });
});
