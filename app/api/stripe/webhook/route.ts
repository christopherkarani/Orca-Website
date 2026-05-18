import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isRetryableWebhookResult, processStripeEvent } from "@/lib/billing/webhooks";
import { getStore } from "@/lib/server/db";
import {
  getLicenseSigningConfig,
  getStripeConfig,
  isProductionRuntime,
  requireStripeSecret,
} from "@/lib/server/env";

export async function POST(request: NextRequest) {
  const stripeConfig = getStripeConfig();
  if (!stripeConfig.webhookSecret) {
    return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  const stripe = new Stripe(
    stripeConfig.secretKey ?? (isProductionRuntime() ? requireStripeSecret() : "sk_test_fixture")
  );
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeConfig.webhookSecret
    );
  } catch {
    return new NextResponse("Invalid Stripe signature", { status: 400 });
  }

  const signing = getLicenseSigningConfig();
  const result = await processStripeEvent(getStore(), event as unknown as Parameters<typeof processStripeEvent>[1], {
    proPriceId: stripeConfig.proPriceId,
    teamPriceId: stripeConfig.teamPriceId,
    licensePrivateKeyPem: signing.privateKeyPem,
    licenseKeyVersion: signing.keyVersion,
  });

  return NextResponse.json(
    { received: true, ...result },
    { status: isRetryableWebhookResult(result) ? 409 : 200 }
  );
}
