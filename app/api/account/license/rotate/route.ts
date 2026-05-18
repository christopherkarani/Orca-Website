import { NextRequest, NextResponse } from "next/server";
import { getAccountForLicenseRequest, getClerkUserId } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { getLicenseSigningConfig } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

export async function POST(request: NextRequest) {
  const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
  if (!hasBearer) {
    const invalidOrigin = rejectInvalidOrigin(request);
    if (invalidOrigin) return invalidOrigin;
    if (!(await getClerkUserId())) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
  }

  const store = getStore();
  const account = await getAccountForLicenseRequest(store, request, "license:rotate");
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
