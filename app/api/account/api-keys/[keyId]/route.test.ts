import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAccountApiKey } from "@/lib/server/auth";
import { setStoreForTests } from "@/lib/server/db";
import { createMemoryStore } from "@/lib/server/memory-store";
import { DELETE } from "./route";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkMocks.auth,
  currentUser: clerkMocks.currentUser,
}));

describe("DELETE /api/account/api-keys/[keyId]", () => {
  beforeEach(() => {
    clerkMocks.auth.mockResolvedValue({ userId: "user_revoke_key" });
    clerkMocks.currentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "revoke-key@example.com" },
      emailAddresses: [],
    });
  });

  afterEach(() => {
    setStoreForTests(undefined);
  });

  it("revokes an account API key", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    const account = await store.upsertAccount({
      id: "acct_revoke_key",
      clerkUserId: "user_revoke_key",
      email: "revoke-key@example.com",
    });
    const { record } = await createAccountApiKey(store, account.id, "CI");

    const response = await DELETE(
      new NextRequest(`https://orca-tx.com/api/account/api-keys/${record.id}`, {
        method: "DELETE",
        headers: { origin: "https://orca-tx.com" },
      }),
      { params: Promise.resolve({ keyId: record.id }) }
    );

    expect(response.status).toBe(200);
    await expect(store.listApiKeys(account.id)).resolves.toEqual([
      expect.objectContaining({ id: record.id, revokedAt: expect.any(String) }),
    ]);
  });
});
