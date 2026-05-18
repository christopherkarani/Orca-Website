import { generateKeyPairSync } from "node:crypto";

let devKeyPair:
  | {
      privateKey: string;
      publicKey: string;
    }
  | undefined;

function getDevKeyPair() {
  if (!devKeyPair) {
    devKeyPair = generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
  }
  return devKeyPair;
}

export function getBaseUrl(): string {
  const url = (
    process.env.ORCA_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  if (isProductionRuntime() && !url.startsWith("https://")) {
    throw new Error("ORCA_SITE_URL must be an https URL in production");
  }
  return url;
}

export function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.ORCA_RUNTIME_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.NODE_ENV === ("production" as string)
  );
}

export function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    proPriceId: process.env.STRIPE_PRO_PRICE_ID,
    teamPriceId: process.env.STRIPE_TEAM_PRICE_ID,
  };
}

export function getLicenseSigningConfig() {
  if (process.env.ORCA_LICENSE_PRIVATE_KEY_PEM) {
    return {
      privateKeyPem: process.env.ORCA_LICENSE_PRIVATE_KEY_PEM.replaceAll("\\n", "\n"),
      publicKeyPem: process.env.ORCA_LICENSE_PUBLIC_KEY_PEM?.replaceAll("\\n", "\n"),
      keyVersion: process.env.ORCA_LICENSE_KEY_VERSION ?? "orca-ed25519-v1",
      mode: "env" as const,
    };
  }

  if (!isProductionRuntime()) {
    const keys = getDevKeyPair();
    return {
      privateKeyPem: keys.privateKey,
      publicKeyPem: keys.publicKey,
      keyVersion: "local-dev-ed25519",
      mode: "development" as const,
    };
  }

  throw new Error("ORCA_LICENSE_PRIVATE_KEY_PEM is required in production");
}

export function requireStripeSecret(): string {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }
  if (isProductionRuntime() && !secret.startsWith("sk_live_")) {
    throw new Error("STRIPE_SECRET_KEY must be a live-mode key in production");
  }
  return secret;
}
