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
npm run preflight:prod
```

## Environment

Copy `.env.example` to `.env.local` and fill in local/test values. Use
`.env.production.example` as the production deployment checklist; it contains
only placeholders.

Required for paid flows:

- `DATABASE_URL`: Postgres connection string.
- `ORCA_AUTH_SECRET`: random 32+ byte secret for signed account sessions.
- `RESEND_API_KEY`: server-only key used to send one-time account access links.
- `ORCA_EMAIL_FROM`: verified sender for account access emails.
- `ORCA_PREFLIGHT_EMAIL_TO`: monitored inbox that receives production preflight email checks.
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

Direct email login is development-only. Production account access is created from
a verified Stripe Checkout Session redirect or a one-time email link sent to an
existing customer account.
Email links open a confirmation page first and consume the token only on
same-origin POST, which prevents common email-link prefetchers from burning the
login token.
Production sessions must exist in the account session table; a signed cookie alone is not enough in production. Session cookies are stored as SHA-256 hashes server-side.
Browser-facing POST routes reject cross-site `Origin` headers; Stripe webhooks use Stripe signature verification instead.

## Commercial Flow

1. Visitor chooses Pro or Team on `/pricing`.
2. `/api/checkout` creates a Stripe subscription Checkout Session.
3. Stripe redirects the customer back through `/api/auth/checkout-session`.
4. `/api/auth/checkout-session` verifies the paid Checkout Session, creates or links the account, and creates the account session.
5. `/api/stripe/webhook` verifies the Stripe signature and idempotently records events.
6. Checkout/subscription webhooks create or link the account/customer/subscription.
7. The backend signs an offline Orca license key.
8. The customer views, copies, downloads, or rotates the license on `/account`.
9. Returning customers request a one-time account link from `/account` if their browser session is gone.
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
