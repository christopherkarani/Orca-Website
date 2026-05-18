import { createHash, randomBytes, randomUUID } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { isProductionRuntime } from "./env";
import type { AccountApiKeyRecord, AccountRecord, OrcaStore } from "./store";

export const API_KEY_SCOPES = ["license:read", "license:rotate", "plan:read"] as const;

type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function parseBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function parseApiKey(rawKey: string): { id: string; hash: string } | null {
  const match = /^orca_key_(oak_[a-zA-Z0-9-]+)_([a-zA-Z0-9_-]{32,})$/.exec(rawKey);
  if (!match) return null;
  return { id: match[1], hash: hashApiKey(rawKey) };
}

export async function getClerkUserId(): Promise<string | null> {
  try {
    const result = await auth();
    return result.userId;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("cannot be imported from a Client Component")
    ) {
      return null;
    }
    if (isProductionRuntime()) throw error;
    return null;
  }
}

async function clerkPrimaryEmail(): Promise<string | null> {
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find((candidate) => candidate.emailAddress)?.emailAddress;
  return email ? normalizeEmail(email) : null;
}

export async function getAccountFromClerk(
  store: OrcaStore
): Promise<AccountRecord | null> {
  const userId = await getClerkUserId();
  if (!userId) return null;

  const existing = await store.getAccountByClerkUserId(userId);
  if (existing) return existing;

  const email = await clerkPrimaryEmail();
  if (!email) return null;
  return store.upsertAccount({ clerkUserId: userId, email });
}

export async function requireAccountFromClerk(store: OrcaStore): Promise<AccountRecord> {
  const account = await getAccountFromClerk(store);
  if (!account) throw new Error("Clerk authentication required");
  return account;
}

export function createRawApiKey() {
  const id = `oak_${randomUUID()}`;
  const secret = randomBytes(32).toString("base64url");
  const rawKey = `orca_key_${id}_${secret}`;
  return {
    id,
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: `orca_key_${id.slice(0, 8)}`,
    keyLast4: rawKey.slice(-4),
  };
}

export async function createAccountApiKey(
  store: OrcaStore,
  accountId: string,
  name: string,
  scopes: ApiKeyScope[] = [...API_KEY_SCOPES]
) {
  const generated = createRawApiKey();
  const record = await store.createApiKey({
    id: generated.id,
    accountId,
    name: name.trim() || "Orca license key",
    keyHash: generated.keyHash,
    keyPrefix: generated.keyPrefix,
    keyLast4: generated.keyLast4,
    scopes,
  });
  return { record, rawKey: generated.rawKey };
}

export async function getAccountFromApiKey(
  store: OrcaStore,
  request: NextRequest,
  requiredScope: ApiKeyScope
): Promise<{ account: AccountRecord; apiKey: AccountApiKeyRecord } | null> {
  const rawKey = parseBearerToken(request);
  if (!rawKey) return null;
  const parsed = parseApiKey(rawKey);
  if (!parsed) return null;
  const apiKey = await store.getActiveApiKeyByHash(parsed.id, parsed.hash);
  if (!apiKey || !apiKey.scopes.includes(requiredScope)) return null;
  const account = await store.getAccountById(apiKey.accountId);
  return account ? { account, apiKey } : null;
}

export async function getAccountForLicenseRequest(
  store: OrcaStore,
  request: NextRequest,
  requiredScope: ApiKeyScope
): Promise<AccountRecord | null> {
  const apiKeyAccount = await getAccountFromApiKey(store, request, requiredScope);
  if (apiKeyAccount) return apiKeyAccount.account;
  return getAccountFromClerk(store);
}
