import { createPublicKey, createPrivateKey, sign, verify } from "node:crypto";
import type { OrcaTier } from "@/lib/billing/entitlements";

export type LicensePayload = {
  licenseId: string;
  customerId: string;
  accountId: string;
  email: string;
  tier: OrcaTier;
  issuedAt: string;
  renewsAt?: string;
  expiresAt?: string;
  seatCount: number;
  features: string[];
};

export type SignedLicense = {
  version: 1;
  algorithm: "Ed25519";
  keyVersion: string;
  payload: LicensePayload;
  signature: string;
  key: string;
};

type EncodedLicenseBody = Omit<SignedLicense, "key">;

export type VerificationResult =
  | {
      valid: true;
      payload: LicensePayload;
      keyVersion: string;
    }
  | {
      valid: false;
      reason:
        | "invalid_format"
        | "unknown_key_version"
        | "invalid_signature"
        | "expired";
    };

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return Buffer.from(padded, "base64");
}

function signingInput(payload: LicensePayload, keyVersion: string): string {
  return canonicalize({
    algorithm: "Ed25519",
    keyVersion,
    payload,
    version: 1,
  });
}

export function createSignedLicense({
  payload,
  privateKeyPem,
  keyVersion,
}: {
  payload: LicensePayload;
  privateKeyPem: string;
  keyVersion: string;
}): SignedLicense {
  const privateKey = createPrivateKey(privateKeyPem);
  const signature = sign(null, Buffer.from(signingInput(payload, keyVersion)), privateKey);
  const encodedBody: EncodedLicenseBody = {
    version: 1,
    algorithm: "Ed25519",
    keyVersion,
    payload,
    signature: base64UrlEncode(signature),
  };
  const body = base64UrlEncode(JSON.stringify(encodedBody));

  return {
    ...encodedBody,
    key: `orca_${body}.${encodedBody.signature}`,
  };
}

export function decodeLicenseKey(licenseKey: string): EncodedLicenseBody {
  const match = /^orca_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(licenseKey);
  if (!match) {
    throw new Error("Invalid Orca license format");
  }

  const body = JSON.parse(base64UrlDecode(match[1]).toString("utf8")) as EncodedLicenseBody;
  if (body.signature !== match[2]) {
    throw new Error("Invalid Orca license envelope signature");
  }
  return { ...body, signature: match[2] };
}

export function verifySignedLicense({
  licenseKey,
  publicKeys,
  now = new Date(),
}: {
  licenseKey: string;
  publicKeys: Record<string, string>;
  now?: Date;
}): VerificationResult {
  let body: EncodedLicenseBody;
  try {
    body = decodeLicenseKey(licenseKey);
  } catch {
    return { valid: false, reason: "invalid_format" };
  }

  const publicKeyPem = publicKeys[body.keyVersion];
  if (!publicKeyPem) {
    return { valid: false, reason: "unknown_key_version" };
  }

  const publicKey = createPublicKey(publicKeyPem);
  const validSignature = verify(
    null,
    Buffer.from(signingInput(body.payload, body.keyVersion)),
    publicKey,
    base64UrlDecode(body.signature)
  );

  if (!validSignature) {
    return { valid: false, reason: "invalid_signature" };
  }

  if (body.payload.expiresAt && new Date(body.payload.expiresAt) < now) {
    return { valid: false, reason: "expired" };
  }

  return {
    valid: true,
    payload: body.payload,
    keyVersion: body.keyVersion,
  };
}
