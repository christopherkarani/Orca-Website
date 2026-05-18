# Deployment Notes

## Domain

Production domain: `https://orca-tx.com`.

Set:

```bash
ORCA_SITE_URL=https://orca-tx.com
```

Use `.env.production.example` as the production environment checklist. It uses
placeholder values only; do not commit real deployment secrets.

## Database

Provision Postgres and apply:

```bash
npm run db:apply
```

The schema creates accounts, account sessions, customers, subscriptions, licenses, and webhook idempotency records.

## Secrets

Generate an Ed25519 keypair for licenses. Store only the private key in server environment variables. Copy the matching public key into the Orca CLI repo when implementing local verification.

Generate a separate random 32+ byte `ORCA_AUTH_SECRET` for signed account sessions.
Configure Resend with a verified sender and set `RESEND_API_KEY` plus
`ORCA_EMAIL_FROM` so returning customers can request one-time account access
links after their checkout session cookie expires or is lost.
Set `ORCA_PREFLIGHT_EMAIL_TO` to a monitored internal inbox. Production preflight
sends a minimal test email there to prove the Resend key and sender can actually
deliver account-access mail.
The account-link route returns a generic response for unknown accounts,
throttled accounts, and delivery failures, so it should not disclose whether an
email is a customer.
Magic links render a confirmation page on `GET` and consume the token only on a
same-origin `POST`, which avoids common email security scanners exhausting the
token before the customer opens it.

```bash
npm run keys:generate
```

The key generator writes `.env.license.local` with `0600` permissions and does
not print raw private key material to stdout. Move those values into the
deployment secret store, then remove local copies you no longer need.

Do not log:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
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
Postgres schema tables and required account, billing, license, session, and webhook columns, live recurring Stripe
prices, an active Customer Portal configuration, an enabled production webhook
endpoint with the required events, a configured login email sender, and matching
license signing key material.
`/api/health` performs the same local configuration shape checks without
exposing secret values.

Then verify:

- `/pricing` renders Free, Pro, and Team.
- Pro Checkout redirects to Stripe in test mode.
- Team Checkout preserves quantity.
- Checkout success redirects through `/api/auth/checkout-session` before `/account`.
- Returning customer login from `/account` sends a one-time email link and `/api/auth/magic` consumes it once.
- `/api/stripe/webhook` accepts signed Stripe events and rejects invalid signatures.
- `/account` shows plan, license key, activation command, download, rotation, and billing portal action.
- `orca license activate <key>` is documented for the CLI handoff.

Direct email login is disabled in production. Do not launch if `/api/auth/login` accepts arbitrary email access with `NODE_ENV=production`.
Account sessions are signed for the browser and stored as hashes in the database.
Browser-facing POST routes require same-origin requests. The Stripe webhook route
is intentionally excluded from that check and relies on Stripe signature
verification.
The Next.js config sets baseline response security headers for all routes:
frame denial, nosniff, strict referrer policy, cross-origin opener isolation,
restricted browser permissions, and HSTS.
Account and API routes also set `Cache-Control: no-store` so license keys,
session redirects, and billing responses are not cached.
