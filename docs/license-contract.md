# Orca License Contract

The website issues an offline-verifiable signed license key. The Orca CLI repo should embed the matching public key and verify the key locally. The CLI must not require this website at runtime.

## Key Format

```text
orca_<base64url-json-envelope>.<base64url-ed25519-signature>
```

The envelope is JSON:

```json
{
  "version": 1,
  "algorithm": "Ed25519",
  "keyVersion": "orca-ed25519-v1",
  "payload": {
    "licenseId": "lic_...",
    "customerId": "cus_...",
    "accountId": "acct_...",
    "email": "buyer@example.com",
    "tier": "pro",
    "issuedAt": "2026-05-17T00:00:00.000Z",
    "renewsAt": "2026-06-17T00:00:00.000Z",
    "expiresAt": "2026-06-17T00:00:00.000Z",
    "seatCount": 1,
    "features": ["cli_core", "basic_policy", "local_audit"]
  },
  "signature": "..."
}
```

## Payload Fields

- `licenseId`: unique license id.
- `customerId`: Stripe customer id or local fallback id.
- `accountId`: website account id.
- `email`: account email.
- `tier`: `free`, `pro`, or `team`.
- `issuedAt`: ISO-8601 signing time.
- `renewsAt`: subscription period end when present.
- `expiresAt`: local verification expiry when present.
- `seatCount`: Team seats, or `1` for Free/Pro.
- `features`: entitlement strings.

License keys are signed, not encrypted. Treat copied license keys as sensitive
because the envelope includes account identity and entitlement data.

## Entitlements

Free:

- `cli_core`
- `basic_policy`
- `local_audit`

Pro:

- Free entitlements
- `local_dashboard`
- `session_reports`
- `productivity_reports`

Team:

- Pro entitlements
- `ci_gate`
- `team_policy_packs`
- `baseline_drift_checks`
- `audit_bundles`

## Verification Rules

1. Parse the `orca_` envelope.
2. Reject the key if the envelope `signature` does not exactly match the
   signature suffix after the `.` separator.
3. Select the public key by `keyVersion`.
4. Verify Ed25519 over the canonical JSON signing input containing `version`, `algorithm`, `keyVersion`, and `payload`.
5. Reject unknown key versions.
6. Reject invalid signatures.
7. Reject expired licenses when `expiresAt` is older than local time.
8. Never call `orca-tx.com` during normal local verification.

The website also refuses to issue a paid license from a subscription whose
period end is already in the past at processing time, even if Stripe still
reports an entitled status in a delayed event.

## Verification Fixture

`docs/license-verification-fixture.json` contains a public key, key version,
signed Team license key, verification timestamp, and expected payload. It
contains no private key material. Use it in the Orca CLI repo to confirm the
local decoder, canonical signing input, Ed25519 verification, expiry check, and
envelope-signature equality rule match this website.

## Rotation Semantics

License rotation issues a new signed license for the account. Because Orca
verifies licenses locally and does not call this website at runtime, rotation
does not remotely invalidate already copied license keys. Old paid keys remain
valid until their embedded `expiresAt`. Use shorter subscription-aligned expiry
windows when revocation latency matters.
