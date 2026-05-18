import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { isProductionRuntime } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/account?error=login_link", request.url), 303);
  }

  const safeToken = token.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Open Orca Account</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
    <h1>Open your Orca account</h1>
    <p>This one-time link will create an account session in this browser.</p>
    <form method="post" action="/api/auth/magic">
      <input type="hidden" name="token" value="${safeToken}" />
      <button type="submit" style="background: #000; color: #fff; border: 0; padding: 0.75rem 1rem;">Continue</button>
    </form>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  if (!token) {
    return NextResponse.redirect(new URL("/account?error=login_link", request.url), 303);
  }

  const store = getStore();
  const accountId = await store.consumeLoginToken(token);
  if (!accountId) {
    return NextResponse.redirect(new URL("/account?error=login_link", request.url), 303);
  }

  const session = await createSession(store, accountId);
  const response = NextResponse.redirect(new URL("/account?login=success", request.url), 303);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionRuntime(),
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}
