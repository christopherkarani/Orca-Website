import postgres from "postgres";
import Stripe from "stripe";
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

const requiredTables = [
  "accounts",
  "account_api_keys",
  "customers",
  "subscriptions",
  "licenses",
  "webhook_events",
];

const requiredColumns = {
  accounts: ["id", "clerk_user_id", "email", "created_at", "updated_at"],
  account_api_keys: [
    "id",
    "account_id",
    "name",
    "key_hash",
    "key_prefix",
    "key_last4",
    "scopes",
    "last_used_at",
    "revoked_at",
    "created_at",
  ],
  customers: [
    "id",
    "account_id",
    "stripe_customer_id",
    "email",
    "created_at",
    "updated_at",
  ],
  subscriptions: [
    "id",
    "account_id",
    "customer_id",
    "stripe_subscription_id",
    "tier",
    "status",
    "seat_count",
    "current_period_end",
    "created_at",
    "updated_at",
  ],
  licenses: [
    "id",
    "account_id",
    "customer_id",
    "subscription_id",
    "source_event_id",
    "tier",
    "status",
    "seat_count",
    "features",
    "license_key",
    "signature",
    "issued_at",
    "renews_at",
    "expires_at",
    "created_at",
    "updated_at",
  ],
  webhook_events: ["id", "type", "stripe_created", "status", "claimed_at", "processed_at"],
};

const requiredWebhookEvents = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function requireEnv(name, predicate = (value) => Boolean(value?.trim())) {
  const value = process.env[name];
  if (!predicate(value)) fail(`${name} is missing or invalid`);
  return value;
}

function presentSecret(value) {
  return Boolean(value?.trim()) && !/replace|example|placeholder/i.test(value);
}

function hasPem(label) {
  return (value) =>
    presentSecret(value) &&
    Boolean(value?.replaceAll("\\n", "\n").includes(`-----BEGIN ${label} KEY-----`));
}

const siteUrl = requireEnv("ORCA_SITE_URL", (value) => value?.startsWith("https://"));
const databaseUrl = requireEnv("DATABASE_URL");
const stripeSecret = requireEnv(
  "STRIPE_SECRET_KEY",
  (value) => presentSecret(value) && value?.startsWith("sk_live_")
);
requireEnv(
  "STRIPE_WEBHOOK_SECRET",
  (value) => presentSecret(value) && value?.startsWith("whsec_")
);
const proPriceId = requireEnv(
  "STRIPE_PRO_PRICE_ID",
  (value) => presentSecret(value) && value?.startsWith("price_")
);
const teamPriceId = requireEnv(
  "STRIPE_TEAM_PRICE_ID",
  (value) => presentSecret(value) && value?.startsWith("price_")
);
requireEnv(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  (value) => presentSecret(value) && value?.startsWith("pk_")
);
requireEnv(
  "CLERK_SECRET_KEY",
  (value) => presentSecret(value) && value?.startsWith("sk_")
);
const privateKeyPem = requireEnv("ORCA_LICENSE_PRIVATE_KEY_PEM", hasPem("PRIVATE"));
const publicKeyPem = requireEnv("ORCA_LICENSE_PUBLIC_KEY_PEM", hasPem("PUBLIC"));
requireEnv("ORCA_LICENSE_KEY_VERSION", presentSecret);

if (privateKeyPem && publicKeyPem) {
  try {
    const privateKey = createPrivateKey(privateKeyPem.replaceAll("\\n", "\n"));
    const publicKey = createPublicKey(publicKeyPem.replaceAll("\\n", "\n"));
    if (
      privateKey.asymmetricKeyType !== "ed25519" ||
      publicKey.asymmetricKeyType !== "ed25519"
    ) {
      fail("License key material must be Ed25519");
    }
    const message = Buffer.from("orca-production-preflight");
    const signature = sign(null, message, privateKey);
    if (!verify(null, message, publicKey, signature)) {
      fail("ORCA_LICENSE_PRIVATE_KEY_PEM and ORCA_LICENSE_PUBLIC_KEY_PEM do not match");
    }
  } catch (error) {
    fail(`License key material check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (databaseUrl) {
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: process.env.POSTGRES_SSL === "false" ? false : "require",
  });
  try {
    const rows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const present = new Set(rows.map((row) => row.table_name));
    for (const table of requiredTables) {
      if (!present.has(table)) fail(`Missing database table: ${table}`);
    }
    const columnRows = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
    const columnsByTable = new Map();
    for (const row of columnRows) {
      const columns = columnsByTable.get(row.table_name) ?? new Set();
      columns.add(row.column_name);
      columnsByTable.set(row.table_name, columns);
    }
    for (const [table, columns] of Object.entries(requiredColumns)) {
      const presentColumns = columnsByTable.get(table) ?? new Set();
      for (const column of columns) {
        if (!presentColumns.has(column)) fail(`Missing database column: ${table}.${column}`);
      }
    }
  } catch (error) {
    fail(`Database preflight failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

if (stripeSecret && proPriceId && teamPriceId) {
  const stripe = new Stripe(stripeSecret);
  for (const [label, priceId] of [
    ["Pro", proPriceId],
    ["Team", teamPriceId],
  ]) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.livemode) fail(`${label} Stripe price must be in live mode`);
      if (!price.active) fail(`${label} Stripe price is inactive`);
      if (!price.recurring) fail(`${label} Stripe price must be recurring`);
    } catch (error) {
      fail(`${label} Stripe price check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
    if (!configs.data.some((config) => config.active)) {
      fail("Stripe Customer Portal has no active configuration");
    }
  } catch (error) {
    fail(`Stripe Customer Portal check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const webhookUrl = `${siteUrl}/api/stripe/webhook`;
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find(
      (candidate) => candidate.url === webhookUrl && candidate.status === "enabled"
    );
    if (!endpoint) {
      fail(`Stripe webhook endpoint is not enabled for ${webhookUrl}`);
    } else {
      for (const eventName of requiredWebhookEvents) {
        if (
          !endpoint.enabled_events.includes("*") &&
          !endpoint.enabled_events.includes(eventName)
        ) {
          fail(`Stripe webhook endpoint is missing event: ${eventName}`);
        }
      }
    }
  } catch (error) {
    fail(`Stripe webhook endpoint check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error("Orca production preflight failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Orca production preflight passed for ${siteUrl}`);
