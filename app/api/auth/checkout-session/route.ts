import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAccountFromClerk } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import {
  getStripeConfig,
  getLicenseSigningConfig,
  requireStripeSecret,
} from "@/lib/server/env";
import {
  mapStripePriceToTier,
  subscriptionHasCurrentPaidEntitlements,
} from "@/lib/billing/entitlements";

function subscriptionQuantity(subscription: Stripe.Subscription): number | undefined {
  const quantity = subscription.items?.data?.[0]?.quantity;
  return typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
    ? quantity
    : undefined;
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | undefined {
  return subscription.items?.data?.[0]?.price?.id;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | undefined {
  const subscriptionWithLegacyPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const itemWithPeriod = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const periodEnd =
    typeof subscriptionWithLegacyPeriod.current_period_end === "number"
      ? subscriptionWithLegacyPeriod.current_period_end
      : itemWithPeriod?.current_period_end;
  return typeof periodEnd === "number"
    ? new Date(periodEnd * 1000).toISOString()
    : undefined;
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/account?error=checkout_session", request.url), 303);
  }

  const stripe = new Stripe(requireStripeSecret());
  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.redirect(new URL("/account?error=checkout_session", request.url), 303);
  }
  if (checkoutSession.status !== "complete" || checkoutSession.payment_status !== "paid") {
    return NextResponse.redirect(new URL("/account?error=checkout_incomplete", request.url), 303);
  }

  const accountId = checkoutSession.metadata?.accountId;
  let seatCount = Math.max(
    1,
    Number.parseInt(checkoutSession.metadata?.seatCount ?? "1", 10)
  );
  const email =
    checkoutSession.customer_email ??
    checkoutSession.customer_details?.email ??
    undefined;
  const stripeCustomerId =
    typeof checkoutSession.customer === "string" ? checkoutSession.customer : undefined;
  const stripeSubscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : undefined;
  if (!accountId || !email || !stripeCustomerId || !stripeSubscriptionId) {
    return NextResponse.redirect(new URL("/account?error=checkout_metadata", request.url), 303);
  }

  const store = getStore();
  const account = await getAccountFromClerk(store);
  if (!account || account.id !== accountId || account.email !== email.toLowerCase()) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/account", request.url), 303);
  }
  let stripeSubscription: Stripe.Subscription;
  try {
    stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  } catch {
    return NextResponse.redirect(new URL("/account?error=subscription_lookup", request.url), 303);
  }
  if (stripeSubscription.status !== "active" && stripeSubscription.status !== "trialing") {
    return NextResponse.redirect(new URL("/account?error=subscription_inactive", request.url), 303);
  }
  const tier = mapStripePriceToTier(subscriptionPriceId(stripeSubscription), getStripeConfig());
  if (!tier) {
    return NextResponse.redirect(new URL("/account?error=subscription_price", request.url), 303);
  }
  if (tier === "team") {
    seatCount = subscriptionQuantity(stripeSubscription) ?? seatCount;
  } else {
    seatCount = 1;
  }
  const currentPeriodEnd = subscriptionPeriodEnd(stripeSubscription);
  if (
    !subscriptionHasCurrentPaidEntitlements(
      stripeSubscription.status,
      currentPeriodEnd
    )
  ) {
    return NextResponse.redirect(new URL("/account?error=subscription_period", request.url), 303);
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
    status: stripeSubscription.status,
    seatCount,
    currentPeriodEnd,
  });
  const signing = getLicenseSigningConfig();
  await store.issueLicenseForAccount(account.id, {
    privateKeyPem: signing.privateKeyPem,
    keyVersion: signing.keyVersion,
  });
  return NextResponse.redirect(new URL("/account?checkout=success", request.url), 303);
}
