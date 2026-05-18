import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { isProductionRuntime } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

export async function POST(request: NextRequest) {
  if (isProductionRuntime()) {
    return NextResponse.json(
      { error: "Direct email login is disabled in production. Use Stripe Checkout access." },
      { status: 403 }
    );
  }
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.redirect(new URL("/account?error=email", request.url), 303);
  }

  const store = getStore();
  const account = await store.upsertAccount({ email });
  const session = await createSession(store, account.id);
  const response = NextResponse.redirect(new URL("/account", request.url), 303);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionRuntime(),
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}
