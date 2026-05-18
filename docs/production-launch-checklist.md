# Production Launch Checklist

Use this when turning `https://orca-tx.com` from fail-closed deployment into a
live paid checkout system. Do not launch until every command in the final gate
passes in the production environment.

## 1. Clerk

- Create or select the production Clerk application for Orca.
- Enable GitHub as a social connection. Clerk's GitHub provider setup requires
  the callback URL shown in the Clerk Dashboard to be copied into the GitHub
  OAuth app, then the GitHub client id/secret to be saved back in Clerk.
- Enable email sign-in in Clerk if you want email as a login method.
- Set these Vercel production env vars:

```bash
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production
```

Expected URL values:

```text
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

## 2. Postgres

- Provision the production Postgres database.
- Set the production connection string:

```bash
vercel env add DATABASE_URL production
```

- Apply the schema from a trusted machine with production env loaded:

```bash
npm run db:apply
```

The schema must include `accounts`, `account_api_keys`, `customers`,
`subscriptions`, `licenses`, and `webhook_events`.

## 3. Stripe

- Create live recurring Prices for Orca Pro and Orca Team.
- Enable Stripe Customer Portal.
- Create an enabled webhook endpoint:

```text
https://orca-tx.com/api/stripe/webhook
```

- Subscribe the webhook endpoint to:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

- Set production env vars:

```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_PRO_PRICE_ID production
vercel env add STRIPE_TEAM_PRICE_ID production
```

## 4. License Signing

- Generate the Ed25519 keypair:

```bash
npm run keys:generate
```

- Move the generated values into Vercel production env:

```bash
vercel env add ORCA_LICENSE_PRIVATE_KEY_PEM production
vercel env add ORCA_LICENSE_PUBLIC_KEY_PEM production
vercel env add ORCA_LICENSE_KEY_VERSION production
```

- Store the private key only in server secret storage.
- Copy the public key and key version into the separate Orca CLI repo for local
  verification. Do not require the local CLI to call this website at runtime.

## 5. Site And Origin Settings

```bash
vercel env add ORCA_SITE_URL production
vercel env add ORCA_ALLOWED_ORIGINS production
```

Expected primary value:

```text
ORCA_SITE_URL=https://orca-tx.com
```

Leave `ORCA_ALLOWED_ORIGINS` empty unless another trusted production origin
must submit browser POST requests.

## 6. Final Gates

Run locally against the production-configured environment or in the deploy
environment:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm audit
npm run preflight:prod
```

Then verify the live deployment:

```bash
curl -i https://orca-tx.com/pricing
curl -i https://orca-tx.com/account
curl -i https://orca-tx.com/api/health
```

Expected after full provisioning:

- `/pricing` returns `200` and shows Free, Pro, Team, and activation steps.
- `/account` returns `200` and Clerk sign-in works with GitHub.
- `/api/health` returns `200` with `{"status":"ready","production":true}`.
- Pro Checkout redirects to Stripe Checkout.
- Team Checkout redirects to Stripe Checkout and preserves seat quantity.
- Checkout success returns to `/account` with a signed license.
- The account dashboard shows plan, seat count, license key, activation command,
  API key management, and Stripe Customer Portal access.
- `orca license activate <key>` is documented for the CLI handoff.

## 7. Do Not Launch If

- `npm run preflight:prod` fails.
- GitHub Actions cannot run because of account billing lock.
- Clerk GitHub login has not been tested on `https://orca-tx.com`.
- Stripe webhook endpoint is missing any required event.
- The license private key is visible in logs, client bundles, docs, or examples.
- The separate Orca CLI repo does not have the matching public key/key version.
