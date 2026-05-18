import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest, getSessionTokenFromRequest } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { getLicenseSigningConfig } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

export async function POST(request: NextRequest) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  if (!getSessionTokenFromRequest(request)) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const store = getStore();
  const account = await getAccountFromRequest(store, request);
  if (!account) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const signing = getLicenseSigningConfig();
  const license = await store.issueLicenseForAccount(account.id, {
    privateKeyPem: signing.privateKeyPem,
    keyVersion: signing.keyVersion,
  });

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/account?license=rotated", request.url), 303);
  }

  return NextResponse.json({
    licenseKey: license.licenseKey,
    activationCommand: `orca license activate ${license.licenseKey}`,
  });
}
