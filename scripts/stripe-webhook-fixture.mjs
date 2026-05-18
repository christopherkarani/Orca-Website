import Stripe from "stripe";

const target = process.env.ORCA_WEBHOOK_URL ?? "http://localhost:3000/api/stripe/webhook";
const secret = process.env.STRIPE_WEBHOOK_SECRET;

if (!secret) {
  console.error("STRIPE_WEBHOOK_SECRET is required");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_fixture");

const accountId = process.env.ORCA_FIXTURE_ACCOUNT_ID ?? "acct_fixture";
const email = process.env.ORCA_FIXTURE_EMAIL ?? "fixture@example.com";
const subscriptionId = process.env.ORCA_FIXTURE_SUBSCRIPTION_ID ?? "sub_fixture";
const customerId = process.env.ORCA_FIXTURE_CUSTOMER_ID ?? "cus_fixture";
const initialTier = process.env.ORCA_FIXTURE_TIER ?? "pro";
const updatedTier = process.env.ORCA_FIXTURE_UPDATED_TIER ?? initialTier;
const initialSeatCount = Number.parseInt(process.env.ORCA_FIXTURE_SEAT_COUNT ?? "1", 10);
const updatedSeatCount = Number.parseInt(
  process.env.ORCA_FIXTURE_UPDATED_SEAT_COUNT ?? String(initialSeatCount),
  10
);

function priceIdForTier(tier) {
  if (tier === "team") return process.env.STRIPE_TEAM_PRICE_ID;
  if (tier === "pro") return process.env.STRIPE_PRO_PRICE_ID;
  return undefined;
}

function requirePriceId(tier) {
  const priceId = priceIdForTier(tier);
  if (!priceId) {
    console.error(`Missing Stripe price id for fixture tier: ${tier}`);
    process.exit(1);
  }
  return priceId;
}

function subscriptionObject({
  tier,
  seatCount,
  status,
  currentPeriodEnd,
}) {
  return {
    id: subscriptionId,
    object: "subscription",
    customer: customerId,
    status,
    metadata: {
      accountId,
      email,
      tier,
      seatCount: String(seatCount),
    },
    items: {
      data: [
        {
          quantity: tier === "team" ? seatCount : 1,
          current_period_end: currentPeriodEnd,
          price: {
            id: requirePriceId(tier),
          },
        },
      ],
    },
  };
}

async function postEvent({ id, type, object }) {
  const payload = JSON.stringify({
    id,
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });

  const body = await response.text();
  console.log(`${type}: ${response.status} ${response.statusText}`);
  console.log(body);

  if (!response.ok) process.exit(1);

  try {
    const parsed = JSON.parse(body);
    if (parsed.processed !== true) process.exit(1);
  } catch {
    process.exit(1);
  }
}

const now = Math.floor(Date.now() / 1000);
const runId = `${now}_${Math.random().toString(36).slice(2, 8)}`;

await postEvent({
  id: `evt_fixture_created_${runId}`,
  type: "customer.subscription.created",
  object: subscriptionObject({
    tier: initialTier,
    seatCount: Number.isFinite(initialSeatCount) ? initialSeatCount : 1,
    status: "active",
    currentPeriodEnd: now + 30 * 24 * 60 * 60,
  }),
});

await postEvent({
  id: `evt_fixture_updated_${runId}`,
  type: "customer.subscription.updated",
  object: subscriptionObject({
    tier: updatedTier,
    seatCount: Number.isFinite(updatedSeatCount) ? updatedSeatCount : 1,
    status: "active",
    currentPeriodEnd: now + 60 * 24 * 60 * 60,
  }),
});

await postEvent({
  id: `evt_fixture_deleted_${runId}`,
  type: "customer.subscription.deleted",
  object: subscriptionObject({
    tier: updatedTier,
    seatCount: Number.isFinite(updatedSeatCount) ? updatedSeatCount : 1,
    status: "canceled",
    currentPeriodEnd: now + 60 * 24 * 60 * 60,
  }),
});
