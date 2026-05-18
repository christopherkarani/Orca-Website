import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAccountFromClerk, getClerkUserId } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { getBaseUrl, requireStripeSecret } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";

export async function POST(request: NextRequest) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  if (!(await getClerkUserId())) {
    return NextResponse.redirect(new URL("/account?error=session", request.url), 303);
  }

  const store = getStore();
  const account = await getAccountFromClerk(store);
  if (!account) {
    return NextResponse.redirect(new URL("/account?error=session", request.url), 303);
  }
  const subscription =
    (await store.getCurrentEntitledSubscriptionForAccount(account.id)) ??
    (await store.getCurrentSubscriptionForAccount(account.id));
  if (!subscription) {
    return NextResponse.redirect(new URL("/pricing", request.url), 303);
  }

  let session: Stripe.BillingPortal.Session;
  try {
    const stripe = new Stripe(requireStripeSecret());
    session = await stripe.billingPortal.sessions.create({
      customer: subscription.customerId,
      return_url: `${getBaseUrl()}/account`,
    });
  } catch {
    return NextResponse.redirect(new URL("/account?error=billing_portal", request.url), 303);
  }
  if (!session.url) {
    return NextResponse.redirect(new URL("/account?error=billing_portal", request.url), 303);
  }
  return NextResponse.redirect(session.url, 303);
}
