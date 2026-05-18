import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  getEntitlementsForTier,
  subscriptionHasCurrentPaidEntitlements,
  type OrcaTier,
} from "@/lib/billing/entitlements";
import { createSignedLicense } from "@/lib/license/contract";
import type {
  AccountRecord,
  CustomerRecord,
  IssueLicenseOptions,
  LoginTokenRecord,
  LicenseRecord,
  OrcaStore,
  SessionRecord,
  SubscriptionRecord,
  UpsertAccountInput,
  UpsertSubscriptionInput,
} from "./store";
import { sessionStorageKey } from "./session-token";

type Sql = ReturnType<typeof postgres>;

type AccountRow = {
  id: string;
  email: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type CustomerRow = {
  id: string;
  account_id: string;
  stripe_customer_id: string;
  email: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type SubscriptionRow = {
  id: string;
  account_id: string;
  customer_id: string;
  stripe_subscription_id: string;
  tier: OrcaTier;
  status: string;
  seat_count: number;
  current_period_end: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type LicenseRow = {
  id: string;
  account_id: string;
  customer_id: string;
  subscription_id: string | null;
  tier: OrcaTier;
  status: "active" | "revoked";
  seat_count: number;
  features: string[] | string;
  license_key: string;
  signature: string;
  issued_at: Date | string;
  renews_at: Date | string | null;
  expires_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function accountFromRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    email: row.email,
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

function customerFromRow(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    stripeCustomerId: row.stripe_customer_id,
    email: row.email,
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

function subscriptionFromRow(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    customerId: row.customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    tier: row.tier,
    status: row.status,
    seatCount: row.seat_count,
    currentPeriodEnd: iso(row.current_period_end),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

function licenseFromRow(row: LicenseRow): LicenseRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    customerId: row.customer_id,
    subscriptionId: row.subscription_id ?? undefined,
    tier: row.tier,
    status: row.status,
    seatCount: row.seat_count,
    features: Array.isArray(row.features) ? row.features : JSON.parse(row.features),
    licenseKey: row.license_key,
    signature: row.signature,
    issuedAt: iso(row.issued_at)!,
    renewsAt: iso(row.renews_at),
    expiresAt: iso(row.expires_at),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function fallbackCustomerId(accountId: string): string {
  return `cus_local_${accountId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
}

export class PostgresStore implements OrcaStore {
  constructor(private readonly sql: Sql) {}

  async upsertAccount(input: UpsertAccountInput): Promise<AccountRecord> {
    const id = input.id ?? `acct_${randomUUID()}`;
    const email = normalizeEmail(input.email);
    const rows = await this.sql<AccountRow[]>`
      INSERT INTO accounts (id, email)
      VALUES (${id}, ${email})
      ON CONFLICT (email) DO UPDATE SET updated_at = now()
      RETURNING *
    `;
    return accountFromRow(rows[0]);
  }

  async getAccountById(id: string): Promise<AccountRecord | null> {
    const rows = await this.sql<AccountRow[]>`SELECT * FROM accounts WHERE id = ${id} LIMIT 1`;
    return rows[0] ? accountFromRow(rows[0]) : null;
  }

  async getAccountByEmail(email: string): Promise<AccountRecord | null> {
    const rows = await this.sql<AccountRow[]>`
      SELECT * FROM accounts WHERE email = ${normalizeEmail(email)} LIMIT 1
    `;
    return rows[0] ? accountFromRow(rows[0]) : null;
  }

  async upsertCustomer(input: {
    accountId: string;
    stripeCustomerId: string;
    email: string;
  }): Promise<CustomerRecord> {
    const rows = await this.sql<CustomerRow[]>`
      INSERT INTO customers (id, account_id, stripe_customer_id, email)
      VALUES (${`cust_${randomUUID()}`}, ${input.accountId}, ${input.stripeCustomerId}, ${normalizeEmail(input.email)})
      ON CONFLICT (stripe_customer_id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        email = EXCLUDED.email,
        updated_at = now()
      RETURNING *
    `;
    return customerFromRow(rows[0]);
  }

  async getCustomerByStripeId(stripeCustomerId: string): Promise<CustomerRecord | null> {
    const rows = await this.sql<CustomerRow[]>`
      SELECT * FROM customers WHERE stripe_customer_id = ${stripeCustomerId} LIMIT 1
    `;
    return rows[0] ? customerFromRow(rows[0]) : null;
  }

  async upsertSubscription(input: UpsertSubscriptionInput): Promise<SubscriptionRecord> {
    const rows = await this.sql<SubscriptionRow[]>`
      INSERT INTO subscriptions (
        id, account_id, customer_id, stripe_subscription_id, tier, status, seat_count, current_period_end
      )
      VALUES (
        ${input.id ?? `sub_${randomUUID()}`},
        ${input.accountId},
        ${input.customerId},
        ${input.stripeSubscriptionId},
        ${input.tier},
        ${input.status},
        ${input.seatCount},
        ${input.currentPeriodEnd ?? null}
      )
      ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        customer_id = EXCLUDED.customer_id,
        tier = EXCLUDED.tier,
        status = EXCLUDED.status,
        seat_count = EXCLUDED.seat_count,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now()
      RETURNING *
    `;
    return subscriptionFromRow(rows[0]);
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubscriptionRecord | null> {
    const rows = await this.sql<SubscriptionRow[]>`
      SELECT * FROM subscriptions WHERE stripe_subscription_id = ${stripeSubscriptionId} LIMIT 1
    `;
    return rows[0] ? subscriptionFromRow(rows[0]) : null;
  }

  async getCurrentSubscriptionForAccount(accountId: string): Promise<SubscriptionRecord | null> {
    const rows = await this.sql<SubscriptionRow[]>`
      SELECT * FROM subscriptions WHERE account_id = ${accountId} ORDER BY updated_at DESC LIMIT 1
    `;
    return rows[0] ? subscriptionFromRow(rows[0]) : null;
  }

  async getCurrentEntitledSubscriptionForAccount(
    accountId: string
  ): Promise<SubscriptionRecord | null> {
    const rows = await this.sql<SubscriptionRow[]>`
      SELECT * FROM subscriptions
      WHERE account_id = ${accountId}
        AND tier <> ${"free"}
        AND current_period_end IS NOT NULL
        AND status IN (${"active"}, ${"trialing"})
        AND current_period_end > now()
      ORDER BY current_period_end DESC, updated_at DESC
      LIMIT 1
    `;
    return rows[0] ? subscriptionFromRow(rows[0]) : null;
  }

  async issueLicenseForAccount(
    accountId: string,
    options: IssueLicenseOptions
  ): Promise<LicenseRecord> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error(`Unknown account ${accountId}`);
    const subscription =
      (await this.getCurrentEntitledSubscriptionForAccount(accountId)) ??
      (await this.getCurrentSubscriptionForAccount(accountId));
    if (
      subscription &&
      subscription.tier !== "free" &&
      !subscriptionHasCurrentPaidEntitlements(
        subscription.status,
        subscription.currentPeriodEnd,
        options.now
      )
    ) {
      return this.revokePaidLicenseForAccount(accountId, options);
    }
    const tier = subscription?.tier ?? "free";
    const entitlements = getEntitlementsForTier(tier, subscription?.seatCount ?? 1);
    const issuedAt = (options.now ?? new Date()).toISOString();
    const customerId = subscription?.customerId ?? fallbackCustomerId(accountId);
    const signed = createSignedLicense({
      payload: {
        licenseId: `lic_${randomUUID()}`,
        accountId,
        customerId,
        email: account.email,
        tier: entitlements.tier,
        issuedAt,
        renewsAt: subscription?.currentPeriodEnd,
        expiresAt: subscription?.currentPeriodEnd,
        seatCount: entitlements.seatCount,
        features: entitlements.features,
      },
      privateKeyPem: options.privateKeyPem,
      keyVersion: options.keyVersion,
    });
    const rows = await this.sql<LicenseRow[]>`
      INSERT INTO licenses (
        id, account_id, customer_id, subscription_id, tier, status, seat_count, features,
        license_key, signature, issued_at, renews_at, expires_at
      )
      VALUES (
        ${signed.payload.licenseId},
        ${accountId},
        ${customerId},
        ${subscription?.id ?? null},
        ${entitlements.tier},
        ${"active"},
        ${entitlements.seatCount},
        ${this.sql.json(entitlements.features)},
        ${signed.key},
        ${signed.signature},
        ${issuedAt},
        ${subscription?.currentPeriodEnd ?? null},
        ${subscription?.currentPeriodEnd ?? null}
      )
      RETURNING *
    `;
    return licenseFromRow(rows[0]);
  }

  async revokePaidLicenseForAccount(
    accountId: string,
    options: IssueLicenseOptions
  ): Promise<LicenseRecord> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error(`Unknown account ${accountId}`);
    const issuedAt = (options.now ?? new Date()).toISOString();
    const entitlements = getEntitlementsForTier("free", 1);
    const signed = createSignedLicense({
      payload: {
        licenseId: `lic_${randomUUID()}`,
        accountId,
        customerId: fallbackCustomerId(accountId),
        email: account.email,
        tier: "free",
        issuedAt,
        seatCount: 1,
        features: entitlements.features,
      },
      privateKeyPem: options.privateKeyPem,
      keyVersion: options.keyVersion,
    });
    const rows = await this.sql<LicenseRow[]>`
      INSERT INTO licenses (
        id, account_id, customer_id, tier, status, seat_count, features,
        license_key, signature, issued_at
      )
      VALUES (
        ${signed.payload.licenseId},
        ${accountId},
        ${signed.payload.customerId},
        ${"free"},
        ${"revoked"},
        ${1},
        ${this.sql.json(entitlements.features)},
        ${signed.key},
        ${signed.signature},
        ${issuedAt}
      )
      RETURNING *
    `;
    return licenseFromRow(rows[0]);
  }

  async getCurrentLicenseForAccount(accountId: string): Promise<LicenseRecord | null> {
    const rows = await this.sql<LicenseRow[]>`
      SELECT * FROM licenses
      WHERE account_id = ${accountId}
      ORDER BY issued_at DESC, created_at DESC
      LIMIT 1
    `;
    return rows[0] ? licenseFromRow(rows[0]) : null;
  }

  async claimWebhookEvent(eventId: string, type: string, created: number): Promise<boolean> {
    const rows = await this.sql<{ id: string }[]>`
      INSERT INTO webhook_events (id, type, stripe_created, status, claimed_at, processed_at)
      VALUES (${eventId}, ${type}, ${created}, ${"processing"}, now(), null)
      ON CONFLICT (id) DO UPDATE SET
        status = ${"processing"},
        claimed_at = now(),
        processed_at = null
      WHERE webhook_events.status = ${"processing"}
        AND webhook_events.claimed_at < now() - interval '10 minutes'
      RETURNING id
    `;
    return rows.length > 0;
  }

  async completeWebhookEvent(eventId: string): Promise<void> {
    await this.sql`
      UPDATE webhook_events
      SET status = ${"processed"}, processed_at = now()
      WHERE id = ${eventId}
    `;
  }

  async releaseWebhookEvent(eventId: string): Promise<void> {
    await this.sql`
      DELETE FROM webhook_events
      WHERE id = ${eventId} AND status = ${"processing"}
    `;
  }

  async createSession(
    accountId: string,
    token: string,
    expiresAt: string
  ): Promise<SessionRecord> {
    const tokenHash = sessionStorageKey(token);
    const rows = await this.sql<
      { token: string; account_id: string; expires_at: Date | string; created_at: Date | string }[]
    >`
      INSERT INTO account_sessions (token, account_id, expires_at)
      VALUES (${tokenHash}, ${accountId}, ${expiresAt})
      RETURNING *
    `;
    return {
      token: rows[0].token,
      accountId: rows[0].account_id,
      expiresAt: iso(rows[0].expires_at)!,
      createdAt: iso(rows[0].created_at)!,
    };
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    const tokenHash = sessionStorageKey(token);
    const rows = await this.sql<
      { token: string; account_id: string; expires_at: Date | string; created_at: Date | string }[]
    >`
      SELECT * FROM account_sessions
      WHERE token = ${tokenHash} AND expires_at > now()
      LIMIT 1
    `;
    if (!rows[0]) return null;
    return {
      token: rows[0].token,
      accountId: rows[0].account_id,
      expiresAt: iso(rows[0].expires_at)!,
      createdAt: iso(rows[0].created_at)!,
    };
  }

  async createLoginToken(
    accountId: string,
    token: string,
    expiresAt: string
  ): Promise<LoginTokenRecord> {
    const tokenHash = sessionStorageKey(token);
    const rows = await this.sql<
      {
        token_hash: string;
        account_id: string;
        expires_at: Date | string;
        consumed_at: Date | string | null;
        created_at: Date | string;
      }[]
    >`
      INSERT INTO account_login_tokens (token_hash, account_id, expires_at)
      VALUES (${tokenHash}, ${accountId}, ${expiresAt})
      RETURNING *
    `;
    return {
      tokenHash: rows[0].token_hash,
      accountId: rows[0].account_id,
      expiresAt: iso(rows[0].expires_at)!,
      consumedAt: iso(rows[0].consumed_at),
      createdAt: iso(rows[0].created_at)!,
    };
  }

  async consumeLoginToken(token: string): Promise<string | null> {
    const tokenHash = sessionStorageKey(token);
    const rows = await this.sql<{ account_id: string }[]>`
      UPDATE account_login_tokens
      SET consumed_at = now()
      WHERE token_hash = ${tokenHash}
        AND consumed_at IS NULL
        AND expires_at > now()
      RETURNING account_id
    `;
    return rows[0]?.account_id ?? null;
  }

  async countRecentLoginTokens(accountId: string, since: string): Promise<number> {
    const rows = await this.sql<{ count: string }[]>`
      SELECT count(*)::text AS count
      FROM account_login_tokens
      WHERE account_id = ${accountId}
        AND created_at >= ${since}
    `;
    return Number.parseInt(rows[0]?.count ?? "0", 10);
  }
}
