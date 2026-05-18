import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { processStripeEvent } from "./webhooks";

describe("Stripe webhook processing", () => {
  it("processes checkout completion once and links the Stripe customer", async () => {
    const store = createMemoryStore();
    const event = {
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      created: 1779062400,
      data: {
        object: {
          id: "cs_test_1",
          customer: "cus_test_1",
          customer_email: "buyer@example.com",
          subscription: "sub_test_1",
          status: "complete",
          payment_status: "paid",
          metadata: { accountId: "acct_1", tier: "pro", seatCount: "1" },
        },
      },
    } as const;

    await store.upsertAccount({ id: "acct_1", email: "buyer@example.com" });
    const first = await processStripeEvent(store, event, {
      proPriceId: "price_pro",
      teamPriceId: "price_team",
      licensePrivateKeyPem: store.testPrivateKeyPem,
      licenseKeyVersion: "test-key",
      now: new Date("2026-05-18T00:00:00.000Z"),
    });
    const second = await processStripeEvent(store, event, {
      proPriceId: "price_pro",
      teamPriceId: "price_team",
      licensePrivateKeyPem: store.testPrivateKeyPem,
      licenseKeyVersion: "test-key",
      now: new Date("2026-05-18T00:00:00.000Z"),
    });

    expect(first.processed).toBe(true);
    expect(second).toEqual({ processed: false, reason: "duplicate_event" });
    expect(await store.getCustomerByStripeId("cus_test_1")).toMatchObject({
      accountId: "acct_1",
    });
    expect(await store.getSubscriptionByStripeId("sub_test_1")).toBeNull();
    expect(await store.getCurrentLicenseForAccount("acct_1")).toBeNull();
  });

  it("claims webhook events before mutation so simultaneous retries do not double-process", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_claim", email: "claim@example.com" });
    const event = {
      id: "evt_claim_once",
      type: "customer.subscription.created",
      created: 1779062401,
      data: {
        object: {
          id: "sub_claim",
          customer: "cus_claim",
          status: "active",
          current_period_end: 1781654400,
          metadata: { accountId: "acct_claim", tier: "pro", seatCount: "1" },
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    } as const;

    const results = await Promise.all([
      processStripeEvent(store, event, {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }),
      processStripeEvent(store, event, {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }),
    ]);

    expect(results).toContainEqual({ processed: true });
    expect(results).toContainEqual({ processed: false, reason: "duplicate_event" });
    expect(await store.getCurrentLicenseForAccount("acct_claim")).toMatchObject({
      tier: "pro",
    });
  });

  it("releases a claimed webhook event when processing throws so Stripe can retry", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_retry", email: "retry@example.com" });
    const event = {
      id: "evt_retry_after_throw",
      type: "customer.subscription.created",
      created: 1779062401,
      data: {
        object: {
          id: "sub_retry",
          customer: "cus_retry",
          status: "active",
          current_period_end: 1781654400,
          metadata: { accountId: "acct_retry", tier: "pro", seatCount: "1" },
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    } as const;
    const originalIssueLicense = store.issueLicenseForAccount.bind(store);
    let failOnce = true;
    store.issueLicenseForAccount = async (...args) => {
      if (failOnce) {
        failOnce = false;
        throw new Error("signing failed");
      }
      return originalIssueLicense(...args);
    };

    await expect(
      processStripeEvent(store, event, {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      })
    ).rejects.toThrow("signing failed");

    await expect(
      processStripeEvent(store, event, {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      })
    ).resolves.toEqual({ processed: true });
  });

  it("does not issue a second license if webhook completion fails after mutation", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_complete_retry", email: "complete@example.com" });
    const event = {
      id: "evt_complete_retry",
      type: "customer.subscription.created",
      created: 1779062401,
      data: {
        object: {
          id: "sub_complete_retry",
          customer: "cus_complete_retry",
          status: "active",
          current_period_end: 1781654400,
          metadata: { accountId: "acct_complete_retry", tier: "pro", seatCount: "1" },
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    } as const;
    const originalComplete = store.completeWebhookEvent.bind(store);
    let failOnce = true;
    store.completeWebhookEvent = async (...args) => {
      if (failOnce) {
        failOnce = false;
        throw new Error("completion failed");
      }
      return originalComplete(...args);
    };

    await expect(
      processStripeEvent(store, event, {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      })
    ).rejects.toThrow("completion failed");
    const firstLicense = await store.getCurrentLicenseForAccount("acct_complete_retry");

    await expect(
      processStripeEvent(store, event, {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      })
    ).resolves.toEqual({ processed: true });

    expect(await store.getCurrentLicenseForAccount("acct_complete_retry")).toMatchObject({
      id: firstLicense?.id,
      sourceEventId: "evt_complete_retry",
    });
  });

  it("issues an expiring license from subscription lifecycle events", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_license", email: "license@example.com" });

    await processStripeEvent(
      store,
      {
        id: "evt_sub_license",
        type: "customer.subscription.created",
        created: 1779062401,
        data: {
          object: {
            id: "sub_license",
            customer: "cus_license",
            status: "active",
            current_period_end: 1781654400,
            metadata: { accountId: "acct_license", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getCurrentLicenseForAccount("acct_license")).toMatchObject({
      accountId: "acct_license",
      tier: "pro",
      expiresAt: "2026-06-17T00:00:00.000Z",
    });
  });

  it("uses the subscription item period end when Stripe omits the legacy subscription-level period", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_item_period", email: "item-period@example.com" });

    const result = await processStripeEvent(
      store,
      {
        id: "evt_sub_item_period",
        type: "customer.subscription.created",
        created: 1779062401,
        data: {
          object: {
            id: "sub_item_period",
            customer: "cus_item_period",
            status: "active",
            metadata: { accountId: "acct_item_period", tier: "pro", seatCount: "1" },
            items: {
              data: [{ current_period_end: 1781654400, price: { id: "price_pro" } }],
            },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(result).toEqual({ processed: true });
    expect(await store.getCurrentLicenseForAccount("acct_item_period")).toMatchObject({
      tier: "pro",
      expiresAt: "2026-06-17T00:00:00.000Z",
    });
  });

  it("can bootstrap an account from signed subscription metadata", async () => {
    const store = createMemoryStore();

    await processStripeEvent(
      store,
      {
        id: "evt_sub_bootstrap",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_bootstrap",
            customer: "cus_bootstrap",
            status: "active",
            current_period_end: 1781654400,
            metadata: {
              accountId: "acct_bootstrap",
              email: "bootstrap@example.com",
              tier: "pro",
              seatCount: "1",
            },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getAccountById("acct_bootstrap")).toMatchObject({
      email: "bootstrap@example.com",
    });
    expect(await store.getCurrentLicenseForAccount("acct_bootstrap")).toMatchObject({
      tier: "pro",
      expiresAt: "2026-06-17T00:00:00.000Z",
    });
  });

  it("updates and cancels subscription entitlements deterministically", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_team", email: "team@example.com" });

    await processStripeEvent(
      store,
      {
        id: "evt_sub_update",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_team",
            customer: "cus_team",
            status: "active",
            current_period_end: 1781654400,
            metadata: { accountId: "acct_team", tier: "pro", seatCount: "5" },
            items: { data: [{ quantity: 8, price: { id: "price_team" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getCurrentLicenseForAccount("acct_team")).toMatchObject({
      tier: "team",
      seatCount: 8,
      status: "active",
    });

    await processStripeEvent(
      store,
      {
        id: "evt_sub_deleted",
        type: "customer.subscription.deleted",
        created: 1779062402,
        data: {
          object: {
            id: "sub_team",
            customer: "cus_team",
            status: "canceled",
            metadata: { accountId: "acct_team", tier: "team", seatCount: "5" },
            items: { data: [{ price: { id: "price_team" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getCurrentLicenseForAccount("acct_team")).toMatchObject({
      tier: "free",
      status: "revoked",
    });
  });

  it("revokes paid entitlements when payment fails", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_failed", email: "failed@example.com" });
    await processStripeEvent(
      store,
      {
        id: "evt_failed_active",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_failed",
            customer: "cus_failed",
            status: "active",
            metadata: { accountId: "acct_failed", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    await processStripeEvent(
      store,
      {
        id: "evt_invoice_failed",
        type: "invoice.payment_failed",
        created: 1779062402,
        data: {
          object: {
            id: "in_failed",
            subscription: "sub_failed",
            customer: "cus_failed",
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getCurrentLicenseForAccount("acct_failed")).toMatchObject({
      tier: "free",
      status: "revoked",
    });
  });

  it("revokes paid entitlements from Stripe v22 invoice parent subscription details", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_invoice_parent", email: "invoice-parent@example.com" });
    await store.upsertSubscription({
      accountId: "acct_invoice_parent",
      customerId: "cus_invoice_parent",
      stripeSubscriptionId: "sub_invoice_parent",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    await store.issueLicenseForAccount("acct_invoice_parent", {
      privateKeyPem: store.testPrivateKeyPem,
      keyVersion: "test-key",
      now: new Date("2026-05-18T00:00:00.000Z"),
    });

    const result = await processStripeEvent(
      store,
      {
        id: "evt_invoice_parent_failed",
        type: "invoice.payment_failed",
        created: 1779062402,
        data: {
          object: {
            id: "in_parent_failed",
            customer: "cus_invoice_parent",
            parent: {
              type: "subscription_details",
              subscription_details: {
                subscription: "sub_invoice_parent",
                metadata: { accountId: "acct_invoice_parent" },
              },
            },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(result).toEqual({ processed: true });
    expect(await store.getCurrentLicenseForAccount("acct_invoice_parent")).toMatchObject({
      tier: "free",
      status: "revoked",
    });
  });

  it("preserves paid entitlements when an older subscription is canceled after a newer active subscription exists", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_overlap", email: "overlap@example.com" });
    await processStripeEvent(
      store,
      {
        id: "evt_overlap_old_active",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_overlap_old",
            customer: "cus_overlap",
            status: "active",
            current_period_end: 1781654400,
            metadata: { accountId: "acct_overlap", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );
    await processStripeEvent(
      store,
      {
        id: "evt_overlap_new_active",
        type: "customer.subscription.updated",
        created: 1779062402,
        data: {
          object: {
            id: "sub_overlap_new",
            customer: "cus_overlap",
            status: "active",
            current_period_end: 1784332800,
            metadata: { accountId: "acct_overlap", tier: "team", seatCount: "3" },
            items: { data: [{ quantity: 3, price: { id: "price_team" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    await processStripeEvent(
      store,
      {
        id: "evt_overlap_old_deleted",
        type: "customer.subscription.deleted",
        created: 1779062403,
        data: {
          object: {
            id: "sub_overlap_old",
            customer: "cus_overlap",
            status: "canceled",
            metadata: { accountId: "acct_overlap", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getCurrentLicenseForAccount("acct_overlap")).toMatchObject({
      tier: "team",
      seatCount: 3,
      status: "active",
      expiresAt: "2026-07-18T00:00:00.000Z",
    });
  });

  it("selects the entitled subscription with the furthest current period end", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_furthest_period", email: "period@example.com" });
    await store.upsertSubscription({
      accountId: "acct_furthest_period",
      customerId: "cus_short",
      stripeSubscriptionId: "sub_short",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    await store.upsertSubscription({
      accountId: "acct_furthest_period",
      customerId: "cus_long",
      stripeSubscriptionId: "sub_long",
      tier: "team",
      status: "active",
      seatCount: 5,
      currentPeriodEnd: "2026-07-18T00:00:00.000Z",
    });

    const license = await store.issueLicenseForAccount("acct_furthest_period", {
      privateKeyPem: store.testPrivateKeyPem,
      keyVersion: "test-key",
      now: new Date("2026-05-18T00:00:00.000Z"),
    });

    expect(license).toMatchObject({
      tier: "team",
      seatCount: 5,
      expiresAt: "2026-07-18T00:00:00.000Z",
    });
  });

  it("does not reissue paid licenses for non-entitled subscription statuses", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_past_due", email: "pastdue@example.com" });
    await store.upsertSubscription({
      accountId: "acct_past_due",
      customerId: "cus_past_due",
      stripeSubscriptionId: "sub_past_due",
      tier: "pro",
      status: "past_due",
      seatCount: 1,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });

    const license = await store.issueLicenseForAccount("acct_past_due", {
      privateKeyPem: store.testPrivateKeyPem,
      keyVersion: "test-key",
    });

    expect(license).toMatchObject({
      tier: "free",
      status: "revoked",
    });
  });

  it("does not issue paid licenses when subscription period end is missing", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_no_period", email: "noperiod@example.com" });

    const result = await processStripeEvent(
      store,
      {
        id: "evt_no_period",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_no_period",
            customer: "cus_no_period",
            status: "active",
            metadata: { accountId: "acct_no_period", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(result).toEqual({ processed: false, reason: "missing_subscription_period" });
    expect(await store.getCurrentLicenseForAccount("acct_no_period")).toBeNull();
  });

  it("does not issue paid licenses from subscription metadata when the Stripe price is missing", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_no_price", email: "no-price@example.com" });

    const result = await processStripeEvent(
      store,
      {
        id: "evt_no_price",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_no_price",
            customer: "cus_no_price",
            status: "active",
            metadata: { accountId: "acct_no_price", tier: "team", seatCount: "99" },
            items: { data: [{ current_period_end: 1781654400 }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(result).toEqual({ processed: false, reason: "missing_subscription_fields" });
    expect(await store.getCurrentLicenseForAccount("acct_no_price")).toBeNull();
  });

  it("does not inflate Team seats from metadata when Stripe omits item quantity", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_no_quantity", email: "no-quantity@example.com" });

    await processStripeEvent(
      store,
      {
        id: "evt_no_quantity",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_no_quantity",
            customer: "cus_no_quantity",
            status: "active",
            metadata: { accountId: "acct_no_quantity", tier: "team", seatCount: "99" },
            items: {
              data: [{ current_period_end: 1781654400, price: { id: "price_team" } }],
            },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(await store.getCurrentLicenseForAccount("acct_no_quantity")).toMatchObject({
      tier: "team",
      seatCount: 1,
    });
  });

  it("does not issue paid licenses when subscription period end is already expired", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_expired_period", email: "expired-period@example.com" });

    const result = await processStripeEvent(
      store,
      {
        id: "evt_expired_period",
        type: "customer.subscription.updated",
        created: 1779062401,
        data: {
          object: {
            id: "sub_expired_period",
            customer: "cus_expired_period",
            status: "active",
            current_period_end: 1778976000,
            metadata: { accountId: "acct_expired_period", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(result).toEqual({ processed: false, reason: "missing_subscription_period" });
    expect(await store.getCurrentLicenseForAccount("acct_expired_period")).toBeNull();
  });

  it("uses processing time, not event creation time, to reject delayed expired subscription events", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_delayed_expired", email: "delayed@example.com" });

    const result = await processStripeEvent(
      store,
      {
        id: "evt_delayed_expired_period",
        type: "customer.subscription.updated",
        created: 1778970000,
        data: {
          object: {
            id: "sub_delayed_expired",
            customer: "cus_delayed_expired",
            status: "active",
            current_period_end: 1779019200,
            metadata: { accountId: "acct_delayed_expired", tier: "pro", seatCount: "1" },
            items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      },
      {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
        licensePrivateKeyPem: store.testPrivateKeyPem,
        licenseKeyVersion: "test-key",
        now: new Date("2026-05-18T00:00:00.000Z"),
      }
    );

    expect(result).toEqual({ processed: false, reason: "missing_subscription_period" });
    expect(await store.getCurrentLicenseForAccount("acct_delayed_expired")).toBeNull();
  });

  it("store-level license issuance fails closed when paid period end is absent", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_store_guard", email: "guard@example.com" });
    await store.upsertSubscription({
      accountId: "acct_store_guard",
      customerId: "cus_store_guard",
      stripeSubscriptionId: "sub_store_guard",
      tier: "pro",
      status: "active",
      seatCount: 1,
    });

    const license = await store.issueLicenseForAccount("acct_store_guard", {
      privateKeyPem: store.testPrivateKeyPem,
      keyVersion: "test-key",
    });

    expect(license).toMatchObject({
      tier: "free",
      status: "revoked",
    });
  });

  it("store-level license issuance fails closed when paid period end is expired", async () => {
    const store = createMemoryStore();
    await store.upsertAccount({ id: "acct_store_expired", email: "expired@example.com" });
    await store.upsertSubscription({
      accountId: "acct_store_expired",
      customerId: "cus_store_expired",
      stripeSubscriptionId: "sub_store_expired",
      tier: "pro",
      status: "active",
      seatCount: 1,
      currentPeriodEnd: "2026-05-17T00:00:00.000Z",
    });

    const license = await store.issueLicenseForAccount("acct_store_expired", {
      privateKeyPem: store.testPrivateKeyPem,
      keyVersion: "test-key",
      now: new Date("2026-05-18T00:00:00.000Z"),
    });

    expect(license).toMatchObject({
      tier: "free",
      status: "revoked",
    });
  });
});
