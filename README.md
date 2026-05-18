# Orca Website

Commercial website and backend for Orca at `https://orca-tx.com`.

This repo owns the website, pricing, Stripe Checkout, customer accounts, billing portal links, and signed license issuing. It does not implement Orca CLI features, local dashboards, policy engine behavior, agent integrations, local session parsing, telemetry upload, or cloud sync.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm test
npm run lint
npm run build
npm run vercel:env:check
npm run preflight:prod
npm run smoke:prod
npm run launch:prod:check
```

## Environment

Copy `.env.example` to `.env.local` and fill in local/test values. Use
`.env.production.example` as the production deployment checklist; it contains
only placeholders.

Required for paid flows:

- `DATABASE_URL`: Postgres connection string.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key for GitHub/email sign-in.
- `CLERK_SECRET_KEY`: Clerk server key for route and server component auth.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: `/sign-in`.
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: `/sign-up`.
- `STRIPE_SECRET_KEY`: Stripe secret key. Never expose this client-side.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret.
- `STRIPE_PRO_PRICE_ID`: recurring Stripe Price for Orca Pro.
- `STRIPE_TEAM_PRICE_ID`: recurring Stripe Price for Orca Team.
- `ORCA_LICENSE_PRIVATE_KEY_PEM`: Ed25519 private key PEM used to sign licenses.
- `ORCA_LICENSE_PUBLIC_KEY_PEM`: matching public key PEM for docs/CLI handoff.
- `ORCA_LICENSE_KEY_VERSION`: key id embedded in issued licenses.
- `ORCA_SITE_URL`: canonical site URL, for example `https://orca-tx.com`.

Apply the SQL schema in `db/schema.sql` before enabling production checkout/webhooks.

Setup helpers:

```bash
npm run keys:generate
npm run db:apply
ORCA_WEBHOOK_URL=http://localhost:3000/api/stripe/webhook npm run webhook:fixture
```

`npm run keys:generate` writes signing secrets to `.env.license.local` with
local-only file permissions instead of printing the private key to stdout. That
file is ignored by git.

Clerk owns production human authentication, including GitHub social login,
email login, session security, and account recovery. Orca stores only
commercial records and hashed license automation API keys. UI-created API keys
default to `license:read` and `plan:read`; license rotation requires an
explicit `license:rotate` scoped key.
Browser-facing POST routes reject cross-site `Origin` headers. In production,
only `ORCA_SITE_URL` and comma-separated `ORCA_ALLOWED_ORIGINS` values are
trusted. Stripe webhooks use Stripe signature verification instead.

## Commercial Flow

1. Visitor chooses Pro or Team on `/pricing`.
2. The visitor signs in with Clerk.
3. `/api/checkout` creates a Stripe subscription Checkout Session for the Clerk-linked account.
4. Stripe redirects the customer back through `/api/auth/checkout-session`.
5. `/api/auth/checkout-session` verifies the paid Checkout Session for the signed-in Clerk user.
6. `/api/stripe/webhook` verifies the Stripe signature and idempotently records events.
7. Checkout/subscription webhooks create or link the account/customer/subscription.
8. The backend signs an offline Orca license key.
9. The customer views, copies, downloads, rotates the license, or creates license API keys on `/account`.
10. The local CLI activates with:

```bash
orca license activate <key>
```

The local Orca CLI should verify license signatures with the public key embedded in the Orca repo. Orca does not need to call this website at runtime.
Rotating a license issues a new signed key; already copied offline keys remain valid until their embedded expiry.
License keys are signed rather than encrypted, so customers should treat copied
keys as sensitive account material.

## Docs

- `docs/stripe-setup.md`: Stripe products, prices, portal, and webhook setup.
- `docs/license-contract.md`: signed license payload and verification contract for the Orca CLI repo.
- `docs/deployment.md`: deployment notes for `orca-tx.com`.
- `docs/production-launch-checklist.md`: operator checklist for Clerk, Postgres, Stripe, license keys, Vercel env, and final launch gates.
