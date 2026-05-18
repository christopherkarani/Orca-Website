import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isProductionRuntime } from "./env";
import type { AccountRecord, OrcaStore } from "./store";

export const SESSION_COOKIE = "orca_session";

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

export async function createSession(
  store: OrcaStore,
  accountId: string,
  options: { now?: Date; days?: number } = {}
) {
  const now = options.now ?? new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + (options.days ?? 30));
  const account = await store.getAccountById(accountId);
  if (!account) throw new Error(`Unknown account ${accountId}`);
  const token = signSessionToken({
    accountId,
    email: account.email,
    expiresAt: expiresAt.toISOString(),
    nonce: base64Url(randomBytes(16)),
  });
  const session = await store.createSession(accountId, token, expiresAt.toISOString());
  return { ...session, token };
}

export async function createLoginToken(
  store: OrcaStore,
  accountId: string,
  options: { now?: Date; minutes?: number } = {}
) {
  const now = options.now ?? new Date();
  const expiresAt = new Date(now);
  expiresAt.setMinutes(expiresAt.getMinutes() + (options.minutes ?? 15));
  const token = base64Url(randomBytes(32));
  await store.createLoginToken(accountId, token, expiresAt.toISOString());
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function getAccountFromRequest(
  store: OrcaStore,
  request: NextRequest
): Promise<AccountRecord | null> {
  const token = getSessionTokenFromRequest(request);
  return getAccountFromSessionToken(store, token);
}

export function getSessionTokenFromRequest(request: NextRequest): string | null {
  return parseCookie(request.headers.get("cookie"), SESSION_COOKIE);
}

export async function getAccountFromSessionToken(
  store: OrcaStore,
  token: string | null | undefined
): Promise<AccountRecord | null> {
  if (!token) return null;
  const session = await store.getSession(token);
  if (session) return store.getAccountById(session.accountId);
  if (isProductionRuntime()) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;
  if (new Date(payload.expiresAt) < new Date()) return null;
  return store.upsertAccount({ id: payload.accountId, email: payload.email });
}

export function base64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

type SessionTokenPayload = {
  accountId: string;
  email: string;
  expiresAt: string;
  nonce: string;
};

function authSecret(): string {
  const secret = process.env.ORCA_AUTH_SECRET;
  if (secret) return secret;
  if (isProductionRuntime()) {
    throw new Error("ORCA_AUTH_SECRET is required in production");
  }
  return "local-development-auth-secret";
}

function encodeJson(value: unknown): string {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

function signatureFor(body: string): string {
  return base64Url(createHmac("sha256", authSecret()).update(body).digest());
}

function signSessionToken(payload: SessionTokenPayload): string {
  const body = encodeJson(payload);
  return `${body}.${signatureFor(body)}`;
}

function verifySessionToken(token: string): SessionTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = signatureFor(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    return decodeJson<SessionTokenPayload>(body);
  } catch {
    return null;
  }
}
