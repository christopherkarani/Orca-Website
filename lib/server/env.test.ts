import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { getBaseUrl, getLicenseSigningConfig, requireStripeSecret } from "./env";

describe("server environment guards", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects test-mode Stripe secrets in production", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_test_not_for_launch";

    expect(() => requireStripeSecret()).toThrow(
      "STRIPE_SECRET_KEY must be a live-mode key in production"
    );
  });

  it("requires an https base URL in production", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_SITE_URL = "http://localhost:3000";

    expect(() => getBaseUrl()).toThrow("ORCA_SITE_URL must be an https URL in production");
  });

  it("requires matching Ed25519 license keys in production at runtime", () => {
    const keyPair = generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = keyPair.privateKey;
    process.env.ORCA_LICENSE_KEY_VERSION = "orca-ed25519-v1";
    delete process.env.ORCA_LICENSE_PUBLIC_KEY_PEM;

    expect(() => getLicenseSigningConfig()).toThrow(
      "ORCA_LICENSE_PRIVATE_KEY_PEM and ORCA_LICENSE_PUBLIC_KEY_PEM are required in production"
    );
  });

  it("rejects placeholder license key versions in production at runtime", () => {
    const keyPair = generateKeyPairSync("ed25519", {
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_LICENSE_PRIVATE_KEY_PEM = keyPair.privateKey;
    process.env.ORCA_LICENSE_PUBLIC_KEY_PEM = keyPair.publicKey;
    process.env.ORCA_LICENSE_KEY_VERSION = "replace_key_version";

    expect(() => getLicenseSigningConfig()).toThrow(
      "ORCA_LICENSE_KEY_VERSION is required in production"
    );
  });
});
