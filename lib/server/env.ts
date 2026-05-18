import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";

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

function presentSecret(value: string | undefined): boolean {
  return Boolean(value?.trim() && !/replace|example|placeholder|test_replace/i.test(value));
}

function normalizePem(value: string | undefined): string | undefined {
  return value?.replaceAll("\\n", "\n");
}

function validateProductionLicenseKeyPair(
  privateKeyPem: string | undefined,
  publicKeyPem: string | undefined
) {
  if (!privateKeyPem || !publicKeyPem) {
    throw new Error("ORCA_LICENSE_PRIVATE_KEY_PEM and ORCA_LICENSE_PUBLIC_KEY_PEM are required in production");
  }
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(publicKeyPem);
  if (
    privateKey.asymmetricKeyType !== "ed25519" ||
    publicKey.asymmetricKeyType !== "ed25519"
  ) {
    throw new Error("Orca license signing keys must be Ed25519");
  }
  const message = Buffer.from("orca-runtime-license-key-check");
  const signature = sign(null, message, privateKey);
  if (!verify(null, message, publicKey, signature)) {
    throw new Error("ORCA_LICENSE_PRIVATE_KEY_PEM and ORCA_LICENSE_PUBLIC_KEY_PEM do not match");
  }
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
  const privateKeyPem = normalizePem(process.env.ORCA_LICENSE_PRIVATE_KEY_PEM);
  const publicKeyPem = normalizePem(process.env.ORCA_LICENSE_PUBLIC_KEY_PEM);
  if (privateKeyPem) {
    if (isProductionRuntime()) {
      if (!presentSecret(process.env.ORCA_LICENSE_KEY_VERSION)) {
        throw new Error("ORCA_LICENSE_KEY_VERSION is required in production");
      }
      validateProductionLicenseKeyPair(privateKeyPem, publicKeyPem);
    }
    return {
      privateKeyPem,
      publicKeyPem,
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

export function requireStripePriceConfig() {
  const config = getStripeConfig();
  if (isProductionRuntime() && (!config.proPriceId || !config.teamPriceId)) {
    throw new Error("STRIPE_PRO_PRICE_ID and STRIPE_TEAM_PRICE_ID are required in production");
  }
  return {
    proPriceId: config.proPriceId,
    teamPriceId: config.teamPriceId,
  };
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
