import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const seatCount = normalizeSeatCount(formData.get("seatCount"));
  if (!tier || !email || !email.includes("@")) {
    return NextResponse.redirect(new URL("/pricing?error=checkout", request.url), 303);
  }

  const stripeConfig = getStripeConfig();
  const price = tier === "pro" ? stripeConfig.proPriceId : stripeConfig.teamPriceId;
  if (!price) {
    return checkoutError(request, "checkout_config", 500);
  }

  const accountId = `acct_${randomUUID()}`;
  let session: Stripe.Checkout.Session;
  try {
    const stripe = new Stripe(requireStripeSecret());
    const baseUrl = getBaseUrl();
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price, quantity: tier === "team" ? seatCount : 1 }],
      success_url: `${baseUrl}/api/auth/checkout-session?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      metadata: {
        accountId,
        tier,
        seatCount: String(tier === "team" ? seatCount : 1),
      },
      subscription_data: {
        metadata: {
          accountId,
          email,
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
