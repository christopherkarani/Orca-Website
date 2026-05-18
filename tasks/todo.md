# Add Website Docs

## Plan

- [x] Verify the website repo and current positioning.
- [x] Verify the framework source of truth from `christopherkarani/Orca`.
- [x] Add a verified `/docs` page.
- [x] Fix docs-related links that point to missing routes.
- [x] Fix stale homepage plugin setup snippets.
- [x] Run lint/build and inspect the rendered docs page.
- [x] Polish docs layout with sticky navigation, verified-source banner, and flatter integration rows.

## Review

- Added `/docs` with install, quickstart, policy, integration, security boundary, replay, red-team, and troubleshooting sections.
- Corrected missing CTA routes from `/quickstart` and `/tutorial` to `/docs` anchors.
- Corrected homepage plugin snippets to use `christopherkarani/Orca`, `orca-opencode-plugin`, and `orca-openclaw-plugin`.
- Verified source claims against `christopherkarani/Orca` on `main`, release `v1.1.0`, and Zig `0.15.2`.
- Passed `npm run lint` and `npm run build`.
- Polished `/docs` with a verified-source panel, desktop sticky contents rail, section-aligned headings, and flatter technical-reference rows.
- Rendered `/docs` at `http://localhost:3000/docs` in Safari and Playwright; fixed mobile horizontal overflow and rechecked at 390px width after the polish pass.

# Orca Commercial Foundation

## Objective

Build the website/backend commercial layer only: landing/pricing, Stripe Checkout, customer accounts, signed license issuing, account license dashboard, billing portal path, docs, and tests. The separate Orca CLI repo remains out of scope except for documenting the license contract it can verify locally.

## Assumptions And Boundary Checks

- [x] Confirmed this repo is a Next.js 16 TypeScript app with no existing database, auth, Stripe, or license backend.
- [x] Confirmed project memory points to `https://orca-tx.com` as the current Orca website/domain context.
- [x] Confirmed the product boundary: website sells/issues licenses; Orca remains local-first and should not upload local sessions or depend on this backend at runtime.
- [x] Noted pre-existing local edits/untracked files and will avoid reverting them.
- [x] Verify Stripe/Next route-handler implementation assumptions against current docs or installed package APIs before finalizing webhook code.
- [x] Challenge false positives before shipping: make sure no page copy implies hosted monitoring, cloud sync, telemetry upload, or remote dashboards.

## TDD Plan

- [x] Add failing tests for license signing and local verification contract.
- [x] Add failing tests for tier-to-entitlement mapping for Free, Pro, and Team.
- [x] Add failing tests for Stripe webhook idempotency and subscription lifecycle transitions.
- [x] Add failing tests for authenticated account license fetch/rotation routes.
- [x] Add rendering tests or route smoke tests for pricing and account/license pages using the repo's available test stack.
- [x] Run the new tests once before implementation and record the expected failures.

## Implementation Plan

- [x] Add database schema/models for accounts, customers, subscriptions, licenses, and webhook idempotency records.
- [x] Add a minimal email-based account/session layer for website account access.
- [x] Add signed license payload generation with private-key env input and public-key verification test helpers.
- [x] Add Stripe Checkout route for Pro and Team plans.
- [x] Add Stripe webhook route with signature verification and idempotent checkout/subscription/payment handlers.
- [x] Add customer portal route.
- [x] Add account API routes to fetch and rotate the current signed license.
- [x] Add pricing page with Free, Pro, and Team plans.
- [x] Add account dashboard showing plan, license key/download, activation command, billing portal, and docs links.
- [x] Add "How activation works" content on pricing/account/docs surfaces.
- [x] Update landing page/navigation so a visitor can understand Orca's value and buy within 30 seconds.

## Docs Plan

- [x] Update README/setup docs for local development.
- [x] Add environment variable documentation without real secrets.
- [x] Add Stripe setup and webhook testing notes.
- [x] Add license contract docs for the Orca CLI repo, including payload fields and verification model.
- [x] Add deployment notes for `orca-tx.com`.

## Verification Plan

- [x] Run tests.
- [x] Run lint/typecheck if present.
- [x] Run production build.
- [x] Start the local website.
- [x] Verify pricing page renders.
- [x] Verify account/license page renders with test data.
- [x] Verify license signing test passes.
- [x] Verify webhook fixture can create/update/cancel a subscription and produce expected license state.
- [x] Record exact commands and remaining manual Stripe dashboard steps.

## Review

- Red TDD run recorded with `npm test`: all six new suites failed on missing implementation modules/pages/routes, as expected.
- Implemented signed Ed25519 license issuing, local verification helpers, entitlement mapping, Postgres schema/store, Stripe Checkout, Stripe Customer Portal, signed webhook processing, idempotent webhook records, account sessions, license fetch/rotate APIs, pricing page, account dashboard, and activation docs.
- Verification passed: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Production dependency audit passed with `npm audit --omit=dev` after upgrading Next to `16.2.6` and overriding PostCSS to the patched line.
- Playwright verified `http://localhost:3001/pricing` on a fresh dev server renders Free/Pro/Team and activation steps.
- Playwright verified `http://localhost:3001/account` on a fresh dev server renders plan, license key, activation command, copy, download, rotate, billing, and docs controls.
- Remaining manual Stripe dashboard steps are documented in `docs/stripe-setup.md`: create recurring Prices, set env price ids/secrets, enable Customer Portal, and register the production webhook endpoint.

# Production Readiness Hardening

## Objective

Remove the remaining repo-owned blockers that prevent a real production launch, especially account-access security, mandatory production secrets, deploy preflight checks, and evidence that a hosted deployment can fail closed before traffic.

## Plan

- [x] Replace open email-only account access with authenticated account access that does not expose licenses to anyone who merely knows an email.
- [x] Require production auth configuration instead of using development fallbacks. This was later migrated from custom session secrets to Clerk keys.
- [x] Add production health/readiness route that checks app config without exposing secret values.
- [x] Add deploy preflight script for required env, license key material, Postgres schema presence, and Stripe key/price/portal configuration where credentials are available.
- [x] Add setup scripts for license key generation, database schema application, and signed webhook fixture verification.
- [x] Add tests for auth hardening and preflight behavior.
- [x] Update README/deployment/Stripe docs with the hardened production launch sequence.
- [x] Rerun tests, typecheck, lint, build, audit, and local route checks.

## Review

- Fixed production auth flaw by removing arbitrary email-only account access. This was later superseded by Clerk-managed browser authentication.
- Fixed the production auth launch gate so production requires configured auth secrets instead of development fallbacks. The current gate is Clerk publishable/secret keys.
- Replaced custom website sessions with Clerk sessions during the Clerk migration; Orca now stores commercial records and hashed API keys, not browser session secrets.
- Capped Team checkout seat quantity before creating Stripe Checkout Sessions and preserved the actual Stripe subscription status from checkout success.
- Hardened subscription mapping so Stripe price ids and line-item quantities are the source of truth for plan tier and Team seat count when portal updates change billing state.
- Added same-origin protection for browser-facing POST routes while leaving Stripe webhooks on signature verification.
- Expanded `npm run webhook:fixture` from a single update event to a signed create/update/delete subscription lifecycle and verified it against the local webhook route.
- Reworked webhook idempotency into claim/complete/release semantics so simultaneous duplicate deliveries cannot double-process while thrown failures remain retryable.
- Fixed retryable out-of-order webhook outcomes to return non-2xx so Stripe will retry after the claim is released.
- Added baseline response security headers in `next.config.ts` for all routes.
- Added `Cache-Control: no-store` for account and API routes so license/account/billing responses are not cached.
- Fixed the dashboard license rotation form to redirect back to `/account?license=rotated` instead of leaving browser users on raw JSON.
- Added direct Stripe Customer Portal route tests for unauthenticated, authenticated, and cross-site request paths.
- Hardened Checkout and billing portal routes so browser form submissions redirect back to product/account pages on Stripe/config failures instead of exposing raw JSON or throwing.
- Hardened Checkout success handling so Stripe session/subscription lookup failures redirect to explicit account error states without issuing licenses.
- Hardened readiness and preflight checks so license private/public key material must be a matching Ed25519 pair, not merely matching PEM keys.
- Clarified offline license rotation semantics in the account dashboard, README, and license contract docs so customers know copied keys remain valid until embedded expiry.
- Added `claimed_at` to webhook idempotency records and Postgres stale-claim reclaim behavior so a crashed worker does not leave events stuck forever.
- Added `.env.production.example` with production-shaped placeholder environment values for launch setup.
- Explicitly unignored `.env.example` and `.env.production.example` so setup templates can ship while real `.env*` files stay ignored.
- Added `/api/health` readiness checks and `npm run preflight:prod` for required env, Postgres schema, live Stripe prices, Customer Portal, and license key material.
- Hardened `npm run preflight:prod` to verify matching license key material and an enabled Stripe webhook endpoint for all required production events.
- Fixed reviewed blockers: non-entitled subscriptions cannot reissue paid licenses, Checkout Session licenses require paid complete sessions plus subscription period end, webhook events are recorded after successful processing, production without `DATABASE_URL` fails closed, and preflight requires live Stripe credentials/prices.
- Fixed follow-up review finding: subscription lifecycle webhooks and store-level license issuance refuse paid licenses when the subscription period end is absent.
- Fixed production account recovery gap by adding one-time email login links for existing customers; direct arbitrary email login remains development-only.
- Hardened login links so raw tokens are never stored server-side, tokens expire, and magic links are consumed once before creating a normal account session.
- Added per-account throttling for login-link emails and kept account-link responses generic for missing accounts, throttled accounts, and email delivery failures.
- Added production email configuration to env examples, deployment docs, and production preflight so account recovery cannot silently ship unconfigured.
- Made PostgreSQL current-license selection order by signed license issuance time instead of relying only on `updated_at`.
- Hardened the license key generator so raw signing private keys are written to ignored `.env.license.local` with local-only permissions instead of being printed to stdout.
- Removed PEM-shaped private-key placeholders from env examples so automated secret scans stay clean while production preflight still requires real Ed25519 PEM material.
- Clarified in the account dashboard, README, and license contract that signed license keys are sensitive because their payload includes account identity and entitlements.
- Hardened production readiness checks so production-shaped placeholder secrets such as `whsec_replace_me`, `re_live_replace_me`, and `price_replace...` fail instead of passing simple prefix checks.
- Fixed checkout account ownership: starting Checkout no longer persists an account for an arbitrary email; accounts are created only after Stripe confirms a paid Checkout Session or through signed subscription webhooks.
- Hardened magic-link login so `GET` only renders a confirmation page and the token is consumed on same-origin `POST`, preventing email prefetchers from exhausting login links.
- Fixed overlapping subscription handling so a late cancellation/payment-failed event for an older subscription does not revoke a newer active paid subscription.
- Hardened Checkout Session success so paid entitlements are sourced from the actual Stripe subscription Price ID instead of Checkout metadata.
- Hardened paid-license issuing so active/trialing subscriptions must also have a future period end; stale or expired subscription periods now fail closed to Free/revoked state.
- Expanded production DB preflight to verify required columns for account, session, login token, customer, subscription, license, and webhook tables, not just table presence.
- Fixed delayed webhook behavior so paid entitlement freshness is evaluated at processing time, not Stripe event creation time.
- Replaced the earlier Resend/custom-email launch gate with Clerk-managed human authentication and production Clerk key checks.
- Fixed current subscription selection so account licenses and billing portal sessions prefer an entitled subscription with the furthest current period end.
- Added Checkout route coverage for Stripe Checkout Session creation, Team seat quantity, success/cancel URLs, and downstream Orca metadata.
- Removed stale public/default-template artifacts and retargeted the pixel parity helper from `ollama.com` to `orca-tx.com` so launch verification cannot accidentally compare or expose old clone assets.
- Fixed the unauthenticated `/account` production render path so the login/request-link panel does not require a database connection until a session cookie is present.
- Rechecked the built app after the fix: `/account` returns 200 with `Cache-Control: no-store`, `/pricing` renders the plan/activation content, `/api/health` returns 503 blocked without production env, and removed public template files now return 404.
- Fixed Stripe v22 subscription-period parsing: Checkout success and subscription webhooks now accept `items.data[0].current_period_end`, which is the installed SDK's subscription-item period field, instead of requiring the legacy subscription-level `current_period_end`.
- Fixed Stripe v22 invoice payment-failure parsing so `invoice.payment_failed` can revoke licenses when the subscription id is nested under `parent.subscription_details.subscription`.
- Updated the signed webhook fixture to send subscription item-level `current_period_end` so local fixture verification covers the installed Stripe v22 object shape.
- Re-ran `npm run webhook:fixture` against a local dev server on `http://localhost:3001/api/stripe/webhook`; signed create/update/delete subscription lifecycle events all returned 200 with `processed: true`.
- Hardened the offline license key contract so verification rejects envelopes whose embedded `signature` field does not match the suffix signature, and documented that rule for the CLI handoff.
- Aligned `/api/health` readiness checks with production preflight placeholder detection so generic `placeholder...` values cannot make readiness appear green.
- Hardened unauthenticated account/billing API routes so missing-session requests return controlled 401/redirect responses before requiring `DATABASE_URL` in production.
- Hardened readiness and production preflight email-sender checks so placeholder/example `ORCA_EMAIL_FROM` values cannot pass launch gates.
- Hardened runtime env guards so production routes reject test-mode Stripe secret keys and non-HTTPS site URLs even if deployment happens without a successful preflight.
- Hardened subscription webhook entitlement mapping so paid tier and Team seat count are sourced from Stripe Price ID and item quantity, not mutable subscription metadata.
- Added seat-count display to the account dashboard so Team customers can see the licensed seat quantity alongside the current plan.
- Verification passed after hardening: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit`.
- Local fail-closed preflight check confirmed missing production env/secrets/schema are reported by `npm run preflight:prod`.

## Completion Audit Against Goal

Objective restated: this repo should be ready to run the Orca commercial website/backend layer: product-led landing and pricing pages, paid Stripe Checkout, account/session access, customer/subscription/license persistence, signed offline license issuing, account license dashboard, billing portal path, activation docs, security hardening, test coverage, docs, and deploy verification. The separate Orca CLI repo remains out of scope.

Prompt-to-artifact checklist:

- Landing/pricing pages: implemented in `app/page.tsx`, `app/pricing/page.tsx`, `app/_components/*`; runtime checked with `GET /pricing 200`; pricing test covers Free/Pro/Team, checkout CTAs, activation flow, and absence of hosted/cloud/telemetry claims.
- Stripe Checkout: implemented in `app/api/checkout/route.ts`; `app/api/checkout/route.test.ts` verifies subscription Checkout creation, Pro/Team price routing, Team quantity, success/cancel URLs, account/subscription metadata, cross-site rejection, quantity cap, graceful browser/API failure responses, and that starting Checkout does not persist an account before Stripe confirms payment.
- Accounts and identity: implemented in `lib/server/auth.ts`, Clerk sign-in/sign-up pages, `proxy.ts`, and `accounts.clerk_user_id`; tests verify API-key auth, scoped API-key rejection, no API-key-to-Clerk fallback on invalid authorization headers, and Postgres linking of first-time Clerk logins to existing commercial account rows with the same email.
- Checkout success route: `app/api/auth/checkout-session/route.ts` verifies paid completed sessions, fetches the Stripe subscription, embeds subscription period end, preserves Stripe subscription status, and redirects to account error states for Stripe lookup failures.
- Customer/subscription/license/API-key models: schema in `db/schema.sql`; stores in `lib/server/memory-store.ts` and `lib/server/postgres-store.ts`; preflight checks required tables and columns, including API-key scopes, Clerk links, license source-event ids, and webhook `claimed_at` stale-claim recovery.
- Stripe webhooks: implemented in `app/api/stripe/webhook/route.ts` with raw-body signature verification and `lib/billing/webhooks.ts` lifecycle processing; tests cover signature rejection, claim-based idempotency, concurrent duplicate delivery, retry after thrown failures, no second license if completion fails after mutation, non-2xx retryable out-of-order outcomes, checkout completion, subscription create/update/cancel/payment failure, non-entitled status downgrade, and missing period rejection.
- Webhook fixture: `scripts/stripe-webhook-fixture.mjs` posts signed `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` events; verified locally against `http://localhost:3001/api/stripe/webhook` with all three responses returning `{ "processed": true }`.
- Subscription-to-license mapping: tests verify paid licenses use Stripe price ids over stale metadata and Team seat count follows Stripe line-item quantity.
- License signing and local verification contract: implemented in `lib/license/contract.ts`; tests cover Ed25519 signing, base64url license format, tamper rejection, expiry rejection, and unknown key version rejection; docs in `docs/license-contract.md`.
- License rotation semantics: account UI and docs state that rotation issues a new key but cannot remotely invalidate copied offline keys before their embedded expiry.
- Entitlements: implemented in `lib/billing/entitlements.ts`; tests map Free/Pro/Team to explicit local-first features.
- Account dashboard and license APIs: implemented in `app/account/*`, `app/api/account/license/route.ts`, and `app/api/account/license/rotate/route.ts`; tests cover dashboard rendering, unauthenticated account-page rendering without database access, unauthenticated API rejection, authenticated license fetch, JSON rotation, and browser-form rotation redirect.
- Stripe Customer Portal: implemented in `app/api/billing/portal/route.ts`; route tests cover unauthenticated redirect, authenticated portal session creation, cross-site rejection, Stripe failure redirect, and missing-URL redirect; deploy preflight verifies an active Stripe Customer Portal configuration.
- Activation docs: `/docs#activation`, `docs/license-contract.md`, README, and pricing/account UI document `orca license activate <key>`.
- Security requirements: secrets only read from server env; private key and Stripe secrets are not exposed client-side; webhooks verify signatures; production DB/auth/signing config fails closed; preflight verifies Clerk keys, live Stripe keys/prices, webhook endpoint/events, schema, and matching Ed25519 license key pair as applicable; production `/api/health` returns only aggregate ready/blocked state.
- Browser request security: `lib/server/request-security.ts` rejects cross-site `Origin` headers for Checkout, API-key management, billing portal, and cookie-authenticated license rotation routes; tests cover same-origin, cross-origin, missing-Origin production behavior, and production refusal to trust arbitrary request hosts.
- Response security headers: `next.config.ts` applies frame denial, nosniff, strict referrer policy, cross-origin opener isolation, restricted browser permissions, and HSTS across all routes.
- Sensitive response caching: `app/account/page.tsx` explicitly calls `noStore()` with forced dynamic/no-store route config and `next.config.ts`/`proxy.ts` set no-store on account/API surfaces; locally verified production `next start` account/API no-store headers and security headers.
- CI/deploy verification: `.github/workflows/production-readiness.yml` runs install, tests, typecheck, lint, build, audit, and fail-closed production preflight.
- Environment docs: `.env.example` covers local/test values and `.env.production.example` covers production-shaped placeholders without real secrets, including Clerk, Stripe, Postgres, and license signing configuration.
- External launch gate: not complete locally because real production env, Postgres, Clerk keys/provider setup, live Stripe prices, live Stripe webhook endpoint, Customer Portal, and signing secrets are not provisioned in this workspace. `npm run preflight:prod` correctly fails closed until those are configured.

## Production Readiness Status

As of the latest verification pass, the repo-owned commercial foundation is green but the deployment is not production ready until external services are configured. Passing gates: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit`, `git diff --check`, and a repo secret-pattern scan. The decisive production gate, `npm run preflight:prod`, still fails closed because this workspace does not have real production values for:

- `ORCA_SITE_URL`
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_TEAM_PRICE_ID`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ORCA_LICENSE_PRIVATE_KEY_PEM`
- `ORCA_LICENSE_PUBLIC_KEY_PEM`
- `ORCA_LICENSE_KEY_VERSION`

No additional repo-owned implementation blocker is currently known. The remaining work is production provisioning: apply `db/schema.sql` to the production Postgres database, configure Clerk with GitHub/email sign-in and deployment keys, create live Stripe Pro/Team recurring prices, enable Stripe Customer Portal, create the live webhook endpoint for `/api/stripe/webhook` with all required events, generate and store the Ed25519 license signing key pair, embed the public key in the separate Orca CLI repo, and rerun `npm run preflight:prod` in the deploy environment until it passes.

## Clerk Auth Migration

- Replaced the custom website auth layer with Clerk for production human login, including GitHub/email provider support through Clerk-managed sign-in and sign-up pages.
- Removed direct email login, one-time magic links, Resend delivery, custom session cookies, account login tokens, and the related production preflight requirements.
- Added `clerk_user_id` to accounts so Stripe customers, subscriptions, and signed licenses remain Orca-owned while Clerk owns browser identity and recovery.
- Added hashed account API keys scoped to license automation only. API keys can fetch license data, rotate a license, and inspect plan state; they cannot manage billing or replace Clerk dashboard login.
- Added account dashboard API-key management, plus `/api/account/api-keys`, `/api/account/api-keys/[keyId]`, and `/api/account/plan`.
- Updated docs, env examples, deployment preflight, readiness checks, and setup scripts to require Clerk keys instead of Resend or `ORCA_AUTH_SECRET`.
- Verification after the migration passed: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit`, `git diff --check`, and repo secret-pattern scan.
- `npm run preflight:prod` still fails closed locally because real production env/services are not configured: site URL, Postgres, live Stripe, Clerk keys, and license signing keys.

# Clerk Production Linking Hardening

## Plan

- [x] Audit the Clerk/API-key implementation against production account-linking behavior.
- [x] Add a regression test for linking a first-time Clerk login to an existing commercial account row with the same verified email.
- [x] Fix the Postgres account upsert path so existing Stripe/webhook-created accounts can be linked to Clerk without losing account ownership checks.
- [x] Run focused tests for the new Postgres store behavior.
- [x] Rerun the production-readiness verification suite and update this review.

## Review

- Fixed production account linking so a first-time Clerk/GitHub login can attach to an existing Stripe/webhook-created commercial account row by verified email, while refusing to take over an email already linked to another Clerk user.
- Removed stale work-email fields from pricing checkout cards so paid plan CTAs flow through Clerk sign-in instead of implying custom email auth.
- Hardened API authentication so any request with an `Authorization` header must authenticate by API key and can no longer fall back to Clerk.
- Default UI-created API keys now use least-privilege `license:read` and `plan:read` scopes; `license:rotate` must be requested explicitly and invalid scopes are rejected.
- Hardened production origin checks so `request.nextUrl.origin` is trusted only in local development. Production accepts `ORCA_SITE_URL` plus explicit comma-separated `ORCA_ALLOWED_ORIGINS`.
- Hardened runtime env checks to match preflight: production license signing requires a non-placeholder key version plus matching Ed25519 private/public key material; production webhook handling requires both Stripe price ids.
- Redacted detailed `/api/health` readiness checks in production; the route now returns only aggregate ready/blocked state there.
- Added license `source_event_id` persistence and tests so a Stripe retry after mutation but before webhook completion does not issue a second license for the same event.
- Added DB integrity constraints for subscription customer linkage, license subscription linkage, API-key scope allowlisting, and source-event uniqueness.
- Added `docs/production-launch-checklist.md` as the single external provisioning runbook for Clerk, Postgres, Stripe, Vercel env, license signing keys, preflight, smoke checks, and do-not-launch gates.
- Added `npm run smoke:prod` to verify live pricing, account, docs, sign-in/sign-up, production health redaction, no-store account caching, and final ready-state health with `ORCA_EXPECT_READY=true`.
- Added `npm run vercel:env:check` to verify required Vercel production environment variable names are present without printing secret values.
- Added `npm run launch:prod:check` as a single launch gate for clean `main`, current-commit GitHub Actions success, Vercel env names, production preflight, and ready-mode live smoke.
- Verification after this pass: `npm test` (22 files, 92 tests), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm audit`, `git diff --check`, secret-pattern scan, production-build HTTP checks for `/pricing`, `/docs`, `/account`, `/api/health`, and signed webhook fixture lifecycle against local dev server.
- `npm run preflight:prod` still fails closed locally because real production env/services are not configured: site URL, Postgres, live Stripe, Clerk keys, and license signing keys.
