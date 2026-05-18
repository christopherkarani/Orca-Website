import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export type ReadinessCheck = {
  name: string;
  ok: boolean;
  message: string;
};

export type ReadinessReport = {
  ok: boolean;
  checks: ReadinessCheck[];
};

function present(value: string | undefined): boolean {
  return Boolean(
    value && value.trim() && !/replace|example|placeholder|test_replace/i.test(value)
  );
}

function hasPem(value: string | undefined, label: "PRIVATE" | "PUBLIC"): boolean {
  return Boolean(value?.replaceAll("\\n", "\n").includes(`-----BEGIN ${label} KEY-----`));
}

function hasMatchingLicenseKeys(
  privateKeyPem: string | undefined,
  publicKeyPem: string | undefined
): boolean {
  if (!hasPem(privateKeyPem, "PRIVATE") || !hasPem(publicKeyPem, "PUBLIC")) return false;
  try {
    const privateKey = createPrivateKey(privateKeyPem!.replaceAll("\\n", "\n"));
    const publicKey = createPublicKey(publicKeyPem!.replaceAll("\\n", "\n"));
    if (
      privateKey.asymmetricKeyType !== "ed25519" ||
      publicKey.asymmetricKeyType !== "ed25519"
    ) {
      return false;
    }
    const message = Buffer.from("orca-readiness-key-check");
    const signature = sign(null, message, privateKey);
    return verify(null, message, publicKey, signature);
  } catch {
    return false;
  }
}

export function assessProductionReadiness(
  env: Record<string, string | undefined> = process.env
): ReadinessReport {
  const checks: ReadinessCheck[] = [
    {
      name: "site_url",
      ok: Boolean(env.ORCA_SITE_URL?.startsWith("https://")),
      message: "ORCA_SITE_URL must be the production https:// URL.",
    },
    {
      name: "clerk_publishable_key",
      ok:
        present(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!.startsWith("pk_"),
      message: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be configured for Clerk.",
    },
    {
      name: "clerk_secret_key",
      ok: present(env.CLERK_SECRET_KEY) && env.CLERK_SECRET_KEY!.startsWith("sk_"),
      message: "CLERK_SECRET_KEY must be configured for Clerk server auth.",
    },
    {
      name: "database_url",
      ok: present(env.DATABASE_URL),
      message: "DATABASE_URL must point at the production Postgres database.",
    },
    {
      name: "stripe_secret",
      ok: present(env.STRIPE_SECRET_KEY) && env.STRIPE_SECRET_KEY!.startsWith("sk_live_"),
      message: "STRIPE_SECRET_KEY must be a live-mode server-side key for production.",
    },
    {
      name: "stripe_webhook_secret",
      ok:
        present(env.STRIPE_WEBHOOK_SECRET) &&
        env.STRIPE_WEBHOOK_SECRET!.startsWith("whsec_"),
      message: "STRIPE_WEBHOOK_SECRET must be configured from the production webhook.",
    },
    {
      name: "stripe_pro_price",
      ok:
        present(env.STRIPE_PRO_PRICE_ID) &&
        env.STRIPE_PRO_PRICE_ID!.startsWith("price_"),
      message: "STRIPE_PRO_PRICE_ID must be a recurring Stripe Price id.",
    },
    {
      name: "stripe_team_price",
      ok:
        present(env.STRIPE_TEAM_PRICE_ID) &&
        env.STRIPE_TEAM_PRICE_ID!.startsWith("price_"),
      message: "STRIPE_TEAM_PRICE_ID must be a recurring Stripe Price id.",
    },
    {
      name: "license_private_key",
      ok: hasPem(env.ORCA_LICENSE_PRIVATE_KEY_PEM, "PRIVATE"),
      message: "ORCA_LICENSE_PRIVATE_KEY_PEM must contain an Ed25519 private key PEM.",
    },
    {
      name: "license_public_key",
      ok: hasPem(env.ORCA_LICENSE_PUBLIC_KEY_PEM, "PUBLIC"),
      message: "ORCA_LICENSE_PUBLIC_KEY_PEM must contain the matching public key PEM.",
    },
    {
      name: "license_key_version",
      ok: present(env.ORCA_LICENSE_KEY_VERSION),
      message: "ORCA_LICENSE_KEY_VERSION must identify the signing key.",
    },
    {
      name: "license_key_pair",
      ok: hasMatchingLicenseKeys(
        env.ORCA_LICENSE_PRIVATE_KEY_PEM,
        env.ORCA_LICENSE_PUBLIC_KEY_PEM
      ),
      message: "ORCA_LICENSE_PRIVATE_KEY_PEM and ORCA_LICENSE_PUBLIC_KEY_PEM must be a matching Ed25519 key pair.",
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}
