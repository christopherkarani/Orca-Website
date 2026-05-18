import {
  getEntitlementsForTier,
  mapStripePriceToTier,
  subscriptionHasCurrentPaidEntitlements,
  type OrcaTier,
  type StripePriceConfig,
} from "./entitlements";
import type { OrcaStore } from "@/lib/server/store";

export type WebhookConfig = StripePriceConfig & {
  licensePrivateKeyPem: string;
  licenseKeyVersion: string;
  now?: Date;
};

type StripeLikeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

type WebhookResult = { processed: true } | { processed: false; reason: string };

const RETRYABLE_REASONS = new Set([
  "missing_subscription_fields",
  "unknown_account",
  "unknown_subscription",
]);

export function isRetryableWebhookResult(result: WebhookResult): boolean {
  return !result.processed && RETRYABLE_REASONS.has(result.reason);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function getMetadata(object: Record<string, unknown>): Record<string, string> {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, string>)
    : {};
}

function getSubscriptionDetailsMetadata(
  object: Record<string, unknown>
): Record<string, string> {
  const parent = object.parent as
    | {
        subscription_details?: {
          metadata?: Record<string, string> | null;
        } | null;
      }
    | undefined;
  const metadata = parent?.subscription_details?.metadata;
  return metadata && typeof metadata === "object" ? metadata : {};
}

function getInvoiceSubscriptionId(object: Record<string, unknown>): string | undefined {
  const parent = object.parent as
    | {
        subscription_details?: {
          subscription?: string | { id?: string };
        } | null;
      }
    | undefined;
  const subscription = parent?.subscription_details?.subscription;
  if (typeof subscription === "string") return subscription;
  return subscription?.id;
}

function getPriceId(object: Record<string, unknown>): string | undefined {
  return getFirstSubscriptionItem(object)?.price?.id;
}

function getFirstSubscriptionItem(object: Record<string, unknown>):
  | { price?: { id?: string }; quantity?: number; current_period_end?: number }
  | undefined {
  const items = object.items as
    | {
        data?: Array<{
          price?: { id?: string };
          quantity?: number;
          current_period_end?: number;
        }>;
      }
    | undefined;
  return items?.data?.[0];
}

function getTierFromObject(
  object: Record<string, unknown>,
  config: StripePriceConfig
): OrcaTier | null {
  return mapStripePriceToTier(getPriceId(object), config);
}

function getItemQuantity(object: Record<string, unknown>): number | undefined {
  const quantity = getFirstSubscriptionItem(object)?.quantity;
  return typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
    ? quantity
    : undefined;
}

function getSeatCount(object: Record<string, unknown>, tier: OrcaTier): number {
  if (tier !== "team") return 1;
  return getItemQuantity(object) ?? 1;
}

function periodEndIso(object: Record<string, unknown>): string | undefined {
  const periodEnd =
    getNumber(object.current_period_end) ??
    getNumber(getFirstSubscriptionItem(object)?.current_period_end);
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined;
}

export async function processStripeEvent(
  store: OrcaStore,
  event: StripeLikeEvent,
  config: WebhookConfig
): Promise<WebhookResult> {
  if (!(await store.claimWebhookEvent(event.id, event.type, event.created))) {
    return { processed: false, reason: "duplicate_event" };
  }

  try {
    const result = await processClaimedStripeEvent(store, event, config);
    if (!isRetryableWebhookResult(result)) {
      await store.completeWebhookEvent(event.id);
    } else {
      await store.releaseWebhookEvent(event.id);
    }
    return result;
  } catch (error) {
    await store.releaseWebhookEvent(event.id);
    throw error;
  }
}

async function processClaimedStripeEvent(
  store: OrcaStore,
  event: StripeLikeEvent,
  config: WebhookConfig
): Promise<WebhookResult> {
  const processingNow = config.now ?? new Date();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionStatus = getString(session.status);
    const paymentStatus = getString(session.payment_status);
    if (sessionStatus !== "complete" || paymentStatus !== "paid") {
      return { processed: false, reason: "checkout_not_paid" };
    }

    const metadata = getMetadata(session);
    const email =
      getString(session.customer_email) ??
      getString((session.customer_details as { email?: string } | undefined)?.email);
    const accountId = metadata.accountId;
    const stripeCustomerId = getString(session.customer);

    if (!email || !stripeCustomerId || !accountId) {
      return { processed: false, reason: "missing_checkout_fields" };
    }

    const account = await store.upsertAccount({ id: accountId, email });
    await store.upsertCustomer({
      accountId: account.id,
      stripeCustomerId,
      email: account.email,
    });
    return { processed: true };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object;
    const metadata = getMetadata(subscription);
    const accountId =
      metadata.accountId ??
      (getString(subscription.id)
        ? (await store.getSubscriptionByStripeId(getString(subscription.id)!))?.accountId
        : undefined);
    const stripeCustomerId = getString(subscription.customer);
    const stripeSubscriptionId = getString(subscription.id);
    const tier = getTierFromObject(subscription, config);
    const status = getString(subscription.status) ?? "incomplete";
    const currentPeriodEnd = periodEndIso(subscription);

    if (!accountId || !stripeCustomerId || !stripeSubscriptionId || !tier) {
      return { processed: false, reason: "missing_subscription_fields" };
    }

    let account = await store.getAccountById(accountId);
    if (!account) {
      const metadataEmail = metadata.email;
      if (!metadataEmail?.includes("@")) {
        return { processed: false, reason: "unknown_account" };
      }
      account = await store.upsertAccount({ id: accountId, email: metadataEmail });
    }
    await store.upsertCustomer({
      accountId: account.id,
      stripeCustomerId,
      email: account.email,
    });
    await store.upsertSubscription({
      accountId: account.id,
      customerId: stripeCustomerId,
      stripeSubscriptionId,
      tier,
      status,
      seatCount: getSeatCount(subscription, tier),
      currentPeriodEnd,
    });

    if (status === "active" || status === "trialing") {
      if (
        !subscriptionHasCurrentPaidEntitlements(
          status,
          currentPeriodEnd,
          processingNow
        )
      ) {
        return { processed: false, reason: "missing_subscription_period" };
      }
      await store.issueLicenseForAccount(account.id, {
        privateKeyPem: config.licensePrivateKeyPem,
        keyVersion: config.licenseKeyVersion,
        now: processingNow,
      });
    } else {
      await store.revokePaidLicenseForAccount(account.id, {
        privateKeyPem: config.licensePrivateKeyPem,
        keyVersion: config.licenseKeyVersion,
        now: processingNow,
      });
    }
    return { processed: true };
  }

  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "invoice.payment_failed"
  ) {
    const subscription = event.data.object;
    const metadata = {
      ...getSubscriptionDetailsMetadata(subscription),
      ...getMetadata(subscription),
    };
    const stripeSubscriptionId =
      getString(subscription.subscription) ??
      getInvoiceSubscriptionId(subscription) ??
      getString(subscription.id);
    const existing = stripeSubscriptionId
      ? await store.getSubscriptionByStripeId(stripeSubscriptionId)
      : null;
    const accountId = metadata.accountId ?? existing?.accountId;
    if (!accountId) return { processed: false, reason: "unknown_subscription" };
    let account = await store.getAccountById(accountId);
    if (!account) {
      const metadataEmail = metadata.email;
      if (!metadataEmail?.includes("@")) {
        return { processed: false, reason: "unknown_account" };
      }
      account = await store.upsertAccount({ id: accountId, email: metadataEmail });
    }

    if (existing && stripeSubscriptionId) {
      await store.upsertSubscription({
        ...existing,
        status: "canceled",
        tier: "free",
        seatCount: 1,
        stripeSubscriptionId,
      });
    }

    const fallbackSubscription = await store.getCurrentEntitledSubscriptionForAccount(account.id);
    if (fallbackSubscription) {
      await store.issueLicenseForAccount(account.id, {
        privateKeyPem: config.licensePrivateKeyPem,
        keyVersion: config.licenseKeyVersion,
        now: processingNow,
      });
      return { processed: true };
    }

    await store.revokePaidLicenseForAccount(account.id, {
      privateKeyPem: config.licensePrivateKeyPem,
      keyVersion: config.licenseKeyVersion,
      now: processingNow,
    });
    return { processed: true };
  }

  // Unknown Stripe events are recorded for idempotency but intentionally do not mutate state.
  void getEntitlementsForTier;
  return { processed: true };
}
