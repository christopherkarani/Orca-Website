# Orca Website Production Readiness Audit

Date: 2026-05-18

## Objective

Build the Orca website/backend commercial layer so users can buy Orca Pro or
Team, receive a signed offline-verifiable license key, manage billing, and use
Clerk-managed accounts with scoped API keys. The separate Orca CLI repo remains
out of scope except for the public-key/license-contract handoff.

## Repo-Owned Evidence

- Landing and pricing: `app/page.tsx`, `app/pricing/page.tsx`,
  `app/pricing/pricing-page.test.tsx`.
- Clerk account access: `app/sign-in/[[...sign-in]]/page.tsx`,
  `app/sign-up/[[...sign-up]]/page.tsx`, `proxy.ts`, `lib/server/auth.ts`.
- API keys: `app/api/account/api-keys/route.ts`,
  `app/api/account/api-keys/[keyId]/route.ts`, `account_api_keys` in
  `db/schema.sql`.
- Stripe Checkout and portal: `app/api/checkout/route.ts`,
  `app/api/auth/checkout-session/route.ts`, `app/api/billing/portal/route.ts`.
- Stripe webhooks and idempotency: `app/api/stripe/webhook/route.ts`,
  `lib/billing/webhooks.ts`, `webhook_events` in `db/schema.sql`.
- Signed licenses: `lib/license/contract.ts`, license rows in `db/schema.sql`,
  `docs/license-contract.md`.
- Account dashboard: `app/account/page.tsx`, `app/account/AccountDashboard.tsx`,
  `app/account/ApiKeyManager.tsx`.
- Production gates: `scripts/deploy-preflight.mjs`,
  `scripts/production-smoke.mjs`, `scripts/vercel-env-check.mjs`,
  `scripts/production-launch-check.mjs`.
- Launch docs: `README.md`, `docs/deployment.md`, `docs/stripe-setup.md`,
  `docs/production-launch-checklist.md`.

## Verified Commands

The latest local verification passed:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm audit
git diff --check
npm run smoke:prod
```

`npm run smoke:prod` passes against live production in fail-closed mode.

## Blocking Gates

The launch is not complete because the unified launch gate fails:

```bash
npm run launch:prod:check
```

Current blockers:

- Missing Vercel production env names for Clerk, Postgres, Stripe, and license
  signing.
- `npm run preflight:prod` fails without real production env and service
  credentials.
- Live `/account`, `/sign-in`, and `/sign-up` still show Clerk-not-configured
  fallback copy.
- Live `/api/health` returns `503` blocked instead of ready.
- GitHub Actions cannot start because the GitHub account is locked due to a
  billing issue.
- The separate Orca CLI repo still needs the matching license public key and key
  version before paid licenses can be verified locally.

## Completion Verdict

The repository implementation is ready for external provisioning and fails
closed correctly. The overall production launch is not complete until
`npm run launch:prod:check` passes on clean `main` with real production Clerk,
Postgres, Stripe, Vercel env, license signing keys, and a successful GitHub
Actions run.
