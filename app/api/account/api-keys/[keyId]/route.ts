import { NextRequest, NextResponse } from "next/server";
import { getAccountFromClerk, getClerkUserId } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  if (!(await getClerkUserId())) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const store = getStore();
  const account = await getAccountFromClerk(store);
  if (!account) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { keyId } = await params;
  await store.revokeApiKey(account.id, keyId);
  return NextResponse.json({ ok: true });
}
