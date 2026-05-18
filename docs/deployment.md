# Deployment Notes

## Domain

Production domain: `https://orca-tx.com`.

Set:

```bash
ORCA_SITE_URL=https://orca-tx.com
```

Use `.env.production.example` as the production environment checklist. It uses
placeholder values only; do not commit real deployment secrets.
For a step-by-step operator checklist, see
`docs/production-launch-checklist.md`.

## Database

Provision Postgres and apply:

```bash
npm run db:apply
```

The schema creates accounts, Clerk identity links, hashed license API keys, customers, subscriptions, licenses, and webhook idempotency records.

## Secrets

Generate an Ed25519 keypair for licenses. Store only the private key in server environment variables. Copy the matching public key into the Orca CLI repo when implementing local verification.

Configure Clerk with GitHub social login and email login. Set
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, and
`NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` in the deployment environment.

```bash
npm run keys:generate
```

The key generator writes `.env.license.local` with `0600` permissions and does
not print raw private key material to stdout. Move those values into the
deployment secret store, then remove local copies you no longer need.

Do not log:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLERK_SECRET_KEY`
- `ORCA_LICENSE_PRIVATE_KEY_PEM`
- raw private key material

## Verification Before Launch

```bash
npm test
npm run lint
npm run build
npm audit
npm run preflight:prod
```

`npm run preflight:prod` verifies required production environment variables, the
Postgres schema tables and required account, API-key, billing, license, and
webhook columns, live recurring Stripe prices, an active Customer Portal
configuration, an enabled production webhook endpoint with the required events,
Clerk configuration, and matching license signing key material.
`/api/health` returns only aggregate ready/blocked state in production. Detailed
readiness checks stay in local development and `npm run preflight:prod`.

Then verify:

- `/pricing` renders Free, Pro, and Team.
- Pro Checkout redirects to Stripe in test mode.
- Team Checkout preserves quantity.
- Checkout success redirects through `/api/auth/checkout-session` before `/account`.
- `/account` uses Clerk sign-in/sign-up and shows license API key management for signed-in users.
- `/api/stripe/webhook` accepts signed Stripe events and rejects invalid signatures.
- `/account` shows plan, license key, activation command, download, rotation, and billing portal action.
- `orca license activate <key>` is documented for the CLI handoff.

Do not launch if the removed custom auth routes (`/api/auth/login`,
`/api/auth/request-login`, `/api/auth/magic`) are reachable.
Clerk owns browser sessions. Orca API keys are hashed and scoped to license
automation only. UI-created keys default to `license:read` and `plan:read`;
create a key with `license:rotate` only for automation that must regenerate
licenses.
Browser-facing POST routes require same-origin requests. In production, allowed
origins are limited to `ORCA_SITE_URL` plus comma-separated
`ORCA_ALLOWED_ORIGINS`. The Stripe webhook route is intentionally excluded from
that check and relies on Stripe signature verification.
The Next.js config sets baseline response security headers for all routes:
frame denial, nosniff, strict referrer policy, cross-origin opener isolation,
restricted browser permissions, and HSTS.
Account and API routes also set `Cache-Control: no-store` so license keys,
session redirects, and billing responses are not cached.
