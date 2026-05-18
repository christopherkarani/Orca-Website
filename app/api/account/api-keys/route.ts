import { NextRequest, NextResponse } from "next/server";
import { createAccountApiKey, getAccountFromClerk, getClerkUserId } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

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

  const { record, rawKey } = await createAccountApiKey(
    store,
    account.id,
    "License automation key"
  );
  return NextResponse.json({ key: record, rawKey }, { status: 201 });
}
