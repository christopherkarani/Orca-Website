import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest, getSessionTokenFromRequest } from "@/lib/server/auth";
import { getLicenseSigningConfig } from "@/lib/server/env";
import { getStore } from "@/lib/server/db";
import type { OrcaStore } from "@/lib/server/store";

function licenseResponse(license: Awaited<ReturnType<OrcaStore["getCurrentLicenseForAccount"]>>) {
  if (!license) return null;
  return {
    licenseId: license.id,
    accountId: license.accountId,
    tier: license.tier,
    status: license.status,
    seatCount: license.seatCount,
    features: license.features,
    licenseKey: license.licenseKey,
    signature: license.signature,
    issuedAt: license.issuedAt,
    renewsAt: license.renewsAt,
    expiresAt: license.expiresAt,
  };
}

export async function GET(request: NextRequest) {
  if (!getSessionTokenFromRequest(request)) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const store = getStore();
  const account = await getAccountFromRequest(store, request);
  if (!account) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
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
    license: licenseResponse(license),
    activationCommand: `orca license activate ${license.licenseKey}`,
  });
}
