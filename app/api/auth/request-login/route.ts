import { NextRequest, NextResponse } from "next/server";
import { createLoginToken } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { sendLoginLinkEmail } from "@/lib/server/email";
import { getBaseUrl, isProductionRuntime } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

const MAX_LOGIN_LINKS_PER_HOUR = 5;

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function wantsJson(request: NextRequest): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function genericResponse(request: NextRequest, devAccessLink?: string) {
  if (wantsJson(request)) {
    return NextResponse.json({ ok: true, devAccessLink });
  }
  return NextResponse.redirect(new URL("/account?login=requested", request.url), 303);
}

export async function POST(request: NextRequest) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const formData = await request.formData();
  const email = normalizeEmail(formData.get("email"));
  if (!email.includes("@")) {
    return genericResponse(request);
  }

  const store = getStore();
  const account = await store.getAccountByEmail(email);
  if (!account) {
    return genericResponse(request);
  }

  const since = new Date();
  since.setHours(since.getHours() - 1);
  const recentTokens = await store.countRecentLoginTokens(account.id, since.toISOString());
  if (recentTokens >= MAX_LOGIN_LINKS_PER_HOUR) {
    return genericResponse(request);
  }

  const loginToken = await createLoginToken(store, account.id);
  const baseUrl = isProductionRuntime() ? getBaseUrl() : request.nextUrl.origin;
  const accessLink = `${baseUrl}/api/auth/magic?token=${encodeURIComponent(
    loginToken.token
  )}`;
  try {
    const result = await sendLoginLinkEmail({ to: account.email, accessLink });
    return genericResponse(request, result.devAccessLink);
  } catch {
    return genericResponse(request);
  }
}
