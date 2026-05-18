import { NextRequest, NextResponse } from "next/server";
import { getAccountForLicenseRequest, getClerkUserId } from "@/lib/server/auth";
import { getLicenseSigningConfig } from "@/lib/server/env";
import { getStore } from "@/lib/server/db";

export async function GET(request: NextRequest) {
  const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
  if (!hasBearer && !(await getClerkUserId())) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const store = getStore();
  const account = await getAccountForLicenseRequest(store, request, "plan:read");
  if (!account) {
    return NextResponse.json(
      { error: hasBearer ? "Invalid API key" : "Unauthenticated" },
      { status: 401 }
    );
  }

  let license = await store.getCurrentLicenseForAccount(account.id);
  if (!license) {
    const signing = getLicenseSigningConfig();
    license = await store.issueLicenseForAccount(account.id, {
      privateKeyPem: signing.privateKeyPem,
      keyVersion: signing.keyVersion,
    });
  }

  return NextResponse.json({
    plan: {
      tier: license.tier,
      status: license.status,
      seatCount: license.seatCount,
      features: license.features,
      renewsAt: license.renewsAt,
      expiresAt: license.expiresAt,
    },
  });
}
