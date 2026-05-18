# Stripe Setup

## Products And Prices

Create recurring Stripe Prices for:

- Orca Pro: mapped to `STRIPE_PRO_PRICE_ID`
- Orca Team: mapped to `STRIPE_TEAM_PRICE_ID`

Use subscription mode. Team quantity is passed as the Checkout line item quantity.

The Checkout success URL must route through:

```text
https://orca-tx.com/api/auth/checkout-session?session_id={CHECKOUT_SESSION_ID}
```

That route retrieves the Checkout Session from Stripe and links it to the
currently signed-in Clerk user.
The website does not issue a paid license until Stripe confirms the paid Checkout
Session on that success route or through signed subscription webhooks.
License entitlements are mapped from the actual Stripe subscription Price ID,
not from browser-submitted form fields or Checkout metadata.

## Webhook Endpoint

Endpoint:

```text
https://orca-tx.com/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

The route reads the raw request body with `request.text()` and verifies `stripe-signature` using `STRIPE_WEBHOOK_SECRET`.

The production preflight checks that an enabled Stripe webhook endpoint exists
for this exact URL and includes all required events.

## Customer Portal

Enable Stripe Customer Portal in the Stripe Dashboard. The website creates portal sessions from `/api/billing/portal` for the logged-in account.

## Local Webhook Test

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

Use real test Checkout sessions for end-to-end account/license validation because the fixture event must include Orca metadata: `accountId`, `tier`, and `seatCount`.

To verify this repo's signature-handling path with a local signed fixture, start
the website and post a signed create/update/delete subscription lifecycle:

```bash
STRIPE_WEBHOOK_SECRET=whsec_... \
STRIPE_PRO_PRICE_ID=price_... \
STRIPE_TEAM_PRICE_ID=price_... \
ORCA_FIXTURE_ACCOUNT_ID=acct_fixture \
ORCA_WEBHOOK_URL=http://localhost:3000/api/stripe/webhook \
npm run webhook:fixture
```
