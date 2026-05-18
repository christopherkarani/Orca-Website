import { NextRequest, NextResponse } from "next/server";
import {
  API_KEY_SCOPES,
  createAccountApiKey,
  getAccountFromClerk,
  getClerkUserId,
  type ApiKeyScope,
} from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

const DEFAULT_API_KEY_SCOPES: ApiKeyScope[] = ["license:read", "plan:read"];

async function parseCreateKeyRequest(request: NextRequest): Promise<{
  name: string;
  scopes: ApiKeyScope[];
} | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof input.name === "string" && input.name.trim()
    ? input.name.trim().slice(0, 80)
    : "License read key";
  const requestedScopes = Array.isArray(input.scopes)
    ? input.scopes
    : DEFAULT_API_KEY_SCOPES;
  if (
    requestedScopes.length === 0 ||
    requestedScopes.some((scope) => !API_KEY_SCOPES.includes(scope as ApiKeyScope))
  ) {
    return null;
  }
  return { name, scopes: [...new Set(requestedScopes)] as ApiKeyScope[] };
}

export async function GET() {
  if (!(await getClerkUserId())) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const store = getStore();
  const account = await getAccountFromClerk(store);
  if (!account) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const keys = await store.listApiKeys(account.id);
  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  if (!(await getClerkUserId())) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const store = getStore();
  const account = await getAccountFromClerk(store);
  if (!account) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const input = await parseCreateKeyRequest(request);
  if (!input) return NextResponse.json({ error: "Invalid API key scopes" }, { status: 400 });

  const { record, rawKey } = await createAccountApiKey(
    store,
    account.id,
    input.name,
    input.scopes
  );
  return NextResponse.json({ key: record, rawKey }, { status: 201 });
}
