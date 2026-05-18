import { generateKeyPairSync, randomUUID } from "node:crypto";
import {
  getEntitlementsForTier,
  subscriptionHasCurrentPaidEntitlements,
} from "@/lib/billing/entitlements";
import { createSignedLicense } from "@/lib/license/contract";
import type {
  AccountRecord,
  AccountApiKeyRecord,
  CustomerRecord,
  IssueLicenseOptions,
  LicenseRecord,
  OrcaStore,
  SubscriptionRecord,
  UpsertAccountInput,
  UpsertSubscriptionInput,
  WebhookEventStatus,
} from "./store";

export type MemoryStore = OrcaStore & {
  testPrivateKeyPem: string;
  testPublicKeyPem: string;
};

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function fallbackCustomerId(accountId: string): string {
  return `cus_local_${accountId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
}

export function createMemoryStore(): MemoryStore {
  const keyPair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "pem", type: "spki" },
  });
  const accounts = new Map<string, AccountRecord>();
  const accountsByEmail = new Map<string, string>();
  const accountsByClerkUserId = new Map<string, string>();
  const customersByStripeId = new Map<string, CustomerRecord>();
  const subscriptionsByStripeId = new Map<string, SubscriptionRecord>();
  const licensesByAccountId = new Map<string, LicenseRecord>();
  const licensesBySourceEventId = new Map<string, LicenseRecord>();
  const apiKeysById = new Map<string, AccountApiKeyRecord & { keyHash: string }>();
  const webhookEvents = new Map<string, WebhookEventStatus>();

  const store: MemoryStore = {
    testPrivateKeyPem: keyPair.privateKey,
    testPublicKeyPem: keyPair.publicKey,

    async upsertAccount(input: UpsertAccountInput) {
      const email = normalizeEmail(input.email);
      const existingId =
        (input.clerkUserId ? accountsByClerkUserId.get(input.clerkUserId) : undefined) ??
        accountsByEmail.get(email);
      if (existingId) {
        const existing = accounts.get(existingId);
        if (!existing) throw new Error("Account index is corrupt");
        existing.email = email;
        existing.clerkUserId = input.clerkUserId ?? existing.clerkUserId;
        existing.updatedAt = nowIso();
        accountsByEmail.set(email, existing.id);
        if (existing.clerkUserId) accountsByClerkUserId.set(existing.clerkUserId, existing.id);
        return existing;
      }

      const id = input.id ?? `acct_${randomUUID()}`;
      const account: AccountRecord = {
        id,
        clerkUserId: input.clerkUserId,
        email,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      accounts.set(id, account);
      accountsByEmail.set(email, id);
      if (input.clerkUserId) accountsByClerkUserId.set(input.clerkUserId, id);
      return account;
    },

    async getAccountById(id: string) {
      return accounts.get(id) ?? null;
    },

    async getAccountByEmail(email: string) {
      const id = accountsByEmail.get(normalizeEmail(email));
      return id ? accounts.get(id) ?? null : null;
    },

    async getAccountByClerkUserId(clerkUserId: string) {
      const id = accountsByClerkUserId.get(clerkUserId);
      return id ? accounts.get(id) ?? null : null;
    },

    async upsertCustomer(input) {
      const existing = customersByStripeId.get(input.stripeCustomerId);
      const customer: CustomerRecord = {
        id: existing?.id ?? `cust_${randomUUID()}`,
        accountId: input.accountId,
        stripeCustomerId: input.stripeCustomerId,
        email: normalizeEmail(input.email),
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      customersByStripeId.set(input.stripeCustomerId, customer);
      return customer;
    },

    async getCustomerByStripeId(stripeCustomerId: string) {
      return customersByStripeId.get(stripeCustomerId) ?? null;
    },

    async upsertSubscription(input: UpsertSubscriptionInput) {
      const existing = subscriptionsByStripeId.get(input.stripeSubscriptionId);
      const subscription: SubscriptionRecord = {
        id: existing?.id ?? input.id ?? `sub_${randomUUID()}`,
        accountId: input.accountId,
        customerId: input.customerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        tier: input.tier,
        status: input.status,
        seatCount: input.seatCount,
        currentPeriodEnd: input.currentPeriodEnd,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      subscriptionsByStripeId.set(input.stripeSubscriptionId, subscription);
      return subscription;
    },

    async getSubscriptionByStripeId(stripeSubscriptionId: string) {
      return subscriptionsByStripeId.get(stripeSubscriptionId) ?? null;
    },

    async getCurrentSubscriptionForAccount(accountId: string) {
      return (
        [...subscriptionsByStripeId.values()]
          .filter((subscription) => subscription.accountId === accountId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
      );
    },

    async getCurrentEntitledSubscriptionForAccount(accountId: string) {
      return (
        [...subscriptionsByStripeId.values()]
          .filter(
            (subscription) =>
              subscription.accountId === accountId &&
              subscription.tier !== "free" &&
              subscriptionHasCurrentPaidEntitlements(
                subscription.status,
                subscription.currentPeriodEnd
              )
          )
          .sort((a, b) => {
            const periodSort = (b.currentPeriodEnd ?? "").localeCompare(
              a.currentPeriodEnd ?? ""
            );
            return periodSort || b.updatedAt.localeCompare(a.updatedAt);
          })[0] ?? null
      );
    },

    async issueLicenseForAccount(accountId: string, options: IssueLicenseOptions) {
      if (options.sourceEventId) {
        const existing = licensesBySourceEventId.get(options.sourceEventId);
        if (existing) return existing;
      }
      const account = accounts.get(accountId);
      if (!account) throw new Error(`Unknown account ${accountId}`);
      const subscription =
        (await store.getCurrentEntitledSubscriptionForAccount(accountId)) ??
        (await store.getCurrentSubscriptionForAccount(accountId));
      if (
        subscription &&
        subscription.tier !== "free" &&
        !subscriptionHasCurrentPaidEntitlements(
          subscription.status,
          subscription.currentPeriodEnd,
          options.now
        )
      ) {
        return store.revokePaidLicenseForAccount(accountId, options);
      }
      const tier = subscription?.tier ?? "free";
      const seatCount = subscription?.seatCount ?? 1;
      const entitlements = getEntitlementsForTier(tier, seatCount);
      const issuedAt = nowIso(options.now);
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
      const license: LicenseRecord = {
        id: signed.payload.licenseId,
        accountId,
        customerId,
        subscriptionId: subscription?.id,
        sourceEventId: options.sourceEventId,
        tier: entitlements.tier,
        status: "active",
        seatCount: entitlements.seatCount,
        features: entitlements.features,
        licenseKey: signed.key,
        signature: signed.signature,
        issuedAt,
        renewsAt: subscription?.currentPeriodEnd,
        expiresAt: subscription?.currentPeriodEnd,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      licensesByAccountId.set(accountId, license);
      if (options.sourceEventId) licensesBySourceEventId.set(options.sourceEventId, license);
      return license;
    },

    async revokePaidLicenseForAccount(accountId: string, options: IssueLicenseOptions) {
      if (options.sourceEventId) {
        const existing = licensesBySourceEventId.get(options.sourceEventId);
        if (existing) return existing;
      }
      const account = accounts.get(accountId);
      if (!account) throw new Error(`Unknown account ${accountId}`);
      const entitlements = getEntitlementsForTier("free", 1);
      const issuedAt = nowIso(options.now);
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
      const license: LicenseRecord = {
        id: signed.payload.licenseId,
        accountId,
        customerId: signed.payload.customerId,
        sourceEventId: options.sourceEventId,
        tier: "free",
        status: "revoked",
        seatCount: 1,
        features: entitlements.features,
        licenseKey: signed.key,
        signature: signed.signature,
        issuedAt,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      licensesByAccountId.set(accountId, license);
      if (options.sourceEventId) licensesBySourceEventId.set(options.sourceEventId, license);
      return license;
    },

    async getCurrentLicenseForAccount(accountId: string) {
      return licensesByAccountId.get(accountId) ?? null;
    },

    async claimWebhookEvent(eventId: string) {
      if (webhookEvents.has(eventId)) return false;
      webhookEvents.set(eventId, "processing");
      return true;
    },

    async completeWebhookEvent(eventId: string) {
      webhookEvents.set(eventId, "processed");
    },

    async releaseWebhookEvent(eventId: string) {
      if (webhookEvents.get(eventId) === "processing") {
        webhookEvents.delete(eventId);
      }
    },

    async createApiKey(input) {
      const record: AccountApiKeyRecord & { keyHash: string } = {
        id: input.id,
        accountId: input.accountId,
        name: input.name,
        keyPrefix: input.keyPrefix,
        keyLast4: input.keyLast4,
        scopes: input.scopes,
        keyHash: input.keyHash,
        createdAt: nowIso(),
      };
      apiKeysById.set(record.id, record);
      return record;
    },

    async listApiKeys(accountId: string) {
      return [...apiKeysById.values()]
        .filter((key) => key.accountId === accountId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async revokeApiKey(accountId: string, keyId: string) {
      const key = apiKeysById.get(keyId);
      if (key?.accountId === accountId && !key.revokedAt) {
        key.revokedAt = nowIso();
      }
    },

    async getActiveApiKeyByHash(keyId: string, keyHash: string) {
      const key = apiKeysById.get(keyId);
      if (!key || key.keyHash !== keyHash || key.revokedAt) return null;
      key.lastUsedAt = nowIso();
      return key;
    },
  };

  return store;
}
