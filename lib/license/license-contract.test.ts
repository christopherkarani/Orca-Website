import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSignedLicense,
  decodeLicenseKey,
  verifySignedLicense,
} from "./contract";
import verificationFixture from "@/docs/license-verification-fixture.json";

const keyPair = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

const payload = {
  licenseId: "lic_test_123",
  customerId: "cus_test_123",
  accountId: "acct_test_123",
  email: "buyer@example.com",
  tier: "pro" as const,
  issuedAt: "2026-05-17T00:00:00.000Z",
  renewsAt: "2026-06-17T00:00:00.000Z",
  expiresAt: "2026-06-24T00:00:00.000Z",
  seatCount: 1,
  features: ["local_dashboard", "session_reports", "productivity_reports"],
};

describe("signed Orca license contract", () => {
  function base64UrlEncode(input: string): string {
    return Buffer.from(input).toString("base64url");
  }

  function base64UrlDecode(input: string): string {
    return Buffer.from(input, "base64url").toString("utf8");
  }

  it("creates a stable offline-verifiable license key", () => {
    const license = createSignedLicense({
      payload,
      privateKeyPem: keyPair.privateKey,
      keyVersion: "test-ed25519-v1",
    });

    expect(license.key).toMatch(/^orca_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(license.signature).toHaveLength(86);
    expect(decodeLicenseKey(license.key)).toMatchObject({
      payload,
      keyVersion: "test-ed25519-v1",
      signature: license.signature,
    });
    expect(
      verifySignedLicense({
        licenseKey: license.key,
        publicKeys: { "test-ed25519-v1": keyPair.publicKey },
        now: new Date("2026-05-18T00:00:00.000Z"),
      })
    ).toEqual({
      valid: true,
      payload,
      keyVersion: "test-ed25519-v1",
    });
  });

  it("rejects tampered, expired, and unknown-key-version licenses", () => {
    const license = createSignedLicense({
      payload,
      privateKeyPem: keyPair.privateKey,
      keyVersion: "test-ed25519-v1",
    });

    const decoded = decodeLicenseKey(license.key);
    const tampered = createSignedLicense({
      payload: { ...decoded.payload, tier: "team", seatCount: 5 },
      privateKeyPem: keyPair.privateKey,
      keyVersion: "test-ed25519-v1",
    });
    const [tamperedPrefix] = tampered.key.slice("orca_".length).split(".");
    const tamperedEnvelope = JSON.parse(base64UrlDecode(tamperedPrefix));
    tamperedEnvelope.signature = license.signature;
    const forged = `orca_${base64UrlEncode(JSON.stringify(tamperedEnvelope))}.${license.signature}`;

    expect(
      verifySignedLicense({
        licenseKey: forged,
        publicKeys: { "test-ed25519-v1": keyPair.publicKey },
      })
    ).toMatchObject({ valid: false, reason: "invalid_signature" });

    expect(
      verifySignedLicense({
        licenseKey: license.key,
        publicKeys: { "test-ed25519-v1": keyPair.publicKey },
        now: new Date("2026-06-25T00:00:00.000Z"),
      })
    ).toMatchObject({ valid: false, reason: "expired" });

    expect(
      verifySignedLicense({
        licenseKey: license.key,
        publicKeys: {},
      })
    ).toMatchObject({ valid: false, reason: "unknown_key_version" });
  });

  it("rejects envelopes whose embedded signature does not match the key suffix", () => {
    const license = createSignedLicense({
      payload,
      privateKeyPem: keyPair.privateKey,
      keyVersion: "test-ed25519-v1",
    });
    const [prefix, suffix] = license.key.slice("orca_".length).split(".");
    const envelope = JSON.parse(base64UrlDecode(prefix));
    envelope.signature = "different_signature";
    const malformedKey = `orca_${base64UrlEncode(JSON.stringify(envelope))}.${suffix}`;

    expect(
      verifySignedLicense({
        licenseKey: malformedKey,
        publicKeys: { "test-ed25519-v1": keyPair.publicKey },
      })
    ).toMatchObject({ valid: false, reason: "invalid_format" });
  });

  it("verifies the static CLI handoff fixture", () => {
    expect(
      verifySignedLicense({
        licenseKey: verificationFixture.licenseKey,
        publicKeys: {
          [verificationFixture.keyVersion]: verificationFixture.publicKeyPem,
        },
        now: new Date(verificationFixture.verifyAt),
      })
    ).toEqual({
      valid: true,
      payload: verificationFixture.expectedPayload,
      keyVersion: verificationFixture.keyVersion,
    });
  });
});
