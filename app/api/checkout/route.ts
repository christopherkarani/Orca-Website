import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAccountFromClerk, getClerkUserId } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { getBaseUrl, getStripeConfig, requireStripeSecret } from "@/lib/server/env";
import { rejectInvalidOrigin } from "@/lib/server/request-security";
import type { OrcaTier } from "@/lib/billing/entitlements";

const MAX_TEAM_SEATS = 250;

function validPaidTier(value: FormDataEntryValue | null): Exclude<OrcaTier, "free"> | null {
  return value === "pro" || value === "team" ? value : null;
}

function normalizeSeatCount(value: FormDataEntryValue | null): number {
  const parsed = Number.parseInt(String(value ?? "1"), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_TEAM_SEATS, Math.max(1, parsed));
}

function checkoutError(request: NextRequest, error: string, status: number) {
  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL(`/pricing?error=${error}`, request.url), 303);
  }
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const invalidOrigin = rejectInvalidOrigin(request);
  if (invalidOrigin) return invalidOrigin;

  const formData = await request.formData();
  const tier = validPaidTier(formData.get("tier"));
  const seatCount = normalizeSeatCount(formData.get("seatCount"));
  if (!tier) {
    return NextResponse.redirect(new URL("/pricing?error=checkout", request.url), 303);
  }

  if (!(await getClerkUserId())) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/pricing", request.url), 303);
  }
  const store = getStore();
  const account = await getAccountFromClerk(store);
  if (!account) {
    return NextResponse.redirect(new URL("/sign-in?redirect_url=/pricing", request.url), 303);
  }

  const stripeConfig = getStripeConfig();
  const price = tier === "pro" ? stripeConfig.proPriceId : stripeConfig.teamPriceId;
  if (!price) {
    return checkoutError(request, "checkout_config", 500);
  }

  let session: Stripe.Checkout.Session;
  try {
    const stripe = new Stripe(requireStripeSecret());
    const baseUrl = getBaseUrl();
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: account.email,
      line_items: [{ price, quantity: tier === "team" ? seatCount : 1 }],
      success_url: `${baseUrl}/api/auth/checkout-session?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      metadata: {
        accountId: account.id,
        tier,
        seatCount: String(tier === "team" ? seatCount : 1),
      },
      subscription_data: {
        metadata: {
          accountId: account.id,
          email: account.email,
          tier,
          seatCount: String(tier === "team" ? seatCount : 1),
        },
      },
    });
  } catch {
    return checkoutError(request, "checkout_unavailable", 502);
  }

  if (!session.url) {
    return checkoutError(request, "checkout_unavailable", 502);
  }

  return NextResponse.redirect(session.url, 303);
}
