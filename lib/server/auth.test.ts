import { afterEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "./memory-store";
import { createLoginToken, createSession, getAccountFromSessionToken } from "./auth";
import { sessionStorageKey } from "./session-token";

describe("account session signing", () => {
  const originalRuntimeEnv = process.env.ORCA_RUNTIME_ENV;
  const originalSecret = process.env.ORCA_AUTH_SECRET;

  afterEach(() => {
    process.env.ORCA_RUNTIME_ENV = originalRuntimeEnv;
    process.env.ORCA_AUTH_SECRET = originalSecret;
  });

  it("requires an auth secret in production", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    delete process.env.ORCA_AUTH_SECRET;
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_prod", email: "prod@example.com" });

    await expect(createSession(store, "acct_prod")).rejects.toThrow(
      "ORCA_AUTH_SECRET is required in production"
    );
  });

  it("requires a persisted session record in production", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_AUTH_SECRET = "a-production-session-secret-with-32-bytes";
    const issuingStore = createMemoryStore();
    await issuingStore.upsertAccount({ id: "acct_session", email: "session@example.com" });
    const session = await createSession(issuingStore, "acct_session");

    const freshStoreWithoutSession = createMemoryStore();
    const account = await getAccountFromSessionToken(
      freshStoreWithoutSession,
      session.token
    );

    expect(account).toBeNull();
  });

  it("stores only a session token hash while authenticating with the raw cookie token", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_hash", email: "hash@example.com" });
    const session = await createSession(store, "acct_hash");

    const account = await getAccountFromSessionToken(store, session.token);
    const persistedSession = await store.getSession(session.token);

    expect(account?.id).toBe("acct_hash");
    expect(session.token).toContain(".");
    expect(persistedSession?.token).toBe(sessionStorageKey(session.token));
  });

  it("stores login tokens as hashes and consumes them only once", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_login_hash", email: "login-hash@example.com" });
    const loginToken = await createLoginToken(store, "acct_login_hash");

    await expect(store.consumeLoginToken(loginToken.token)).resolves.toBe("acct_login_hash");
    await expect(store.consumeLoginToken(loginToken.token)).resolves.toBeNull();
  });
});
