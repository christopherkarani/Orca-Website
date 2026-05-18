import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assessProductionReadiness } from "./readiness";

const keyPair = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

describe("production readiness assessment", () => {
  it("fails closed on missing production configuration", () => {
    const report = assessProductionReadiness({});

    expect(report.ok).toBe(false);
    expect(report.checks.filter((check) => !check.ok).map((check) => check.name)).toContain(
      "clerk_secret_key"
    );
  });

  it("accepts complete production-shaped configuration", () => {
    const report = assessProductionReadiness({
      ORCA_SITE_URL: "https://orca-tx.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_123",
      CLERK_SECRET_KEY: "sk_live_123",
      DATABASE_URL: "postgres://orca:secret@db.orca-tx.internal:5432/orca",
      STRIPE_SECRET_KEY: "sk_live_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_PRO_PRICE_ID: "price_pro",
      STRIPE_TEAM_PRICE_ID: "price_team",
      ORCA_LICENSE_PRIVATE_KEY_PEM: keyPair.privateKey,
      ORCA_LICENSE_PUBLIC_KEY_PEM: keyPair.publicKey,
      ORCA_LICENSE_KEY_VERSION: "orca-ed25519-v1",
    });

    expect(report.ok).toBe(true);
  });

  it("rejects non-matching license signing keys", () => {
    const otherKeyPair = generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
    const report = assessProductionReadiness({
      ORCA_SITE_URL: "https://orca-tx.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_123",
      CLERK_SECRET_KEY: "sk_live_123",
      DATABASE_URL: "postgres://orca:secret@db.orca-tx.internal:5432/orca",
      STRIPE_SECRET_KEY: "sk_live_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_PRO_PRICE_ID: "price_pro",
      STRIPE_TEAM_PRICE_ID: "price_team",
      ORCA_LICENSE_PRIVATE_KEY_PEM: keyPair.privateKey,
      ORCA_LICENSE_PUBLIC_KEY_PEM: otherKeyPair.publicKey,
      ORCA_LICENSE_KEY_VERSION: "orca-ed25519-v1",
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "license_key_pair", ok: false })
    );
  });

  it("rejects production-shaped placeholder secrets", () => {
    const report = assessProductionReadiness({
      ORCA_SITE_URL: "https://orca-tx.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_replace_me",
      CLERK_SECRET_KEY: "sk_live_replace_me",
      DATABASE_URL: "postgres://orca:secret@db.orca-tx.internal:5432/orca",
      STRIPE_SECRET_KEY: "sk_live_replace_me",
      STRIPE_WEBHOOK_SECRET: "whsec_replace_me",
      STRIPE_PRO_PRICE_ID: "price_replace_with_live_pro",
      STRIPE_TEAM_PRICE_ID: "price_replace_with_live_team",
      ORCA_LICENSE_PRIVATE_KEY_PEM: "replace_with_escaped_ed25519_private_key_pem",
      ORCA_LICENSE_PUBLIC_KEY_PEM: "replace_with_escaped_ed25519_public_key_pem",
      ORCA_LICENSE_KEY_VERSION: "replace_key_version",
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "stripe_webhook_secret", ok: false })
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "clerk_publishable_key", ok: false })
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "clerk_secret_key", ok: false })
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "license_key_version", ok: false })
    );
  });

  it("rejects generic placeholder-shaped values", () => {
    const report = assessProductionReadiness({
      ORCA_SITE_URL: "https://orca-tx.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_placeholder",
      CLERK_SECRET_KEY: "sk_live_placeholder",
      DATABASE_URL: "postgres://orca:placeholder@db.orca-tx.internal:5432/orca",
      STRIPE_SECRET_KEY: "sk_live_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
      STRIPE_PRO_PRICE_ID: "price_placeholder_pro",
      STRIPE_TEAM_PRICE_ID: "price_placeholder_team",
      ORCA_LICENSE_PRIVATE_KEY_PEM: keyPair.privateKey,
      ORCA_LICENSE_PUBLIC_KEY_PEM: keyPair.publicKey,
      ORCA_LICENSE_KEY_VERSION: "placeholder-key-version",
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "clerk_secret_key", ok: false })
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "stripe_secret", ok: false })
    );
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "license_key_version", ok: false })
    );
  });

  it("rejects placeholder Clerk keys", () => {
    const report = assessProductionReadiness({
      ORCA_SITE_URL: "https://orca-tx.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_replace_me",
      CLERK_SECRET_KEY: "sk_live_replace_me",
      DATABASE_URL: "postgres://orca:secret@db.orca-tx.internal:5432/orca",
      STRIPE_SECRET_KEY: "sk_live_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_PRO_PRICE_ID: "price_pro",
      STRIPE_TEAM_PRICE_ID: "price_team",
      ORCA_LICENSE_PRIVATE_KEY_PEM: keyPair.privateKey,
      ORCA_LICENSE_PUBLIC_KEY_PEM: keyPair.publicKey,
      ORCA_LICENSE_KEY_VERSION: "orca-ed25519-v1",
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "clerk_publishable_key", ok: false })
    );
  });

  it("rejects matching non-Ed25519 license signing keys", () => {
    const rsaKeyPair = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
    const report = assessProductionReadiness({
      ORCA_SITE_URL: "https://orca-tx.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_123",
      CLERK_SECRET_KEY: "sk_live_123",
      DATABASE_URL: "postgres://orca:secret@db.orca-tx.internal:5432/orca",
      STRIPE_SECRET_KEY: "sk_live_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_PRO_PRICE_ID: "price_pro",
      STRIPE_TEAM_PRICE_ID: "price_team",
      ORCA_LICENSE_PRIVATE_KEY_PEM: rsaKeyPair.privateKey,
      ORCA_LICENSE_PUBLIC_KEY_PEM: rsaKeyPair.publicKey,
      ORCA_LICENSE_KEY_VERSION: "orca-ed25519-v1",
    });

    expect(report.ok).toBe(false);
    expect(report.checks).toContainEqual(
      expect.objectContaining({ name: "license_key_pair", ok: false })
    );
  });
});
