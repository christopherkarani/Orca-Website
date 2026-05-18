import { describe, expect, it } from "vitest";
import {
  getEntitlementsForTier,
  mapStripePriceToTier,
  subscriptionAllowsPaidEntitlements,
  subscriptionHasCurrentPaidEntitlements,
} from "./entitlements";

describe("subscription entitlements", () => {
  it("maps Free, Pro, and Team to explicit local-first features", () => {
    expect(getEntitlementsForTier("free", 1)).toEqual({
      tier: "free",
      seatCount: 1,
      features: ["cli_core", "basic_policy", "local_audit"],
    });
    expect(getEntitlementsForTier("pro", 1).features).toEqual([
      "cli_core",
      "basic_policy",
      "local_audit",
      "local_dashboard",
      "session_reports",
      "productivity_reports",
    ]);
    expect(getEntitlementsForTier("team", 7)).toEqual({
      tier: "team",
      seatCount: 7,
      features: [
        "cli_core",
        "basic_policy",
        "local_audit",
        "local_dashboard",
        "session_reports",
        "productivity_reports",
        "ci_gate",
        "team_policy_packs",
        "baseline_drift_checks",
        "audit_bundles",
      ],
    });
  });

  it("fails closed for unknown prices and unpaid subscriptions", () => {
    expect(
      mapStripePriceToTier("price_pro", {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
      })
    ).toBe("pro");
    expect(
      mapStripePriceToTier("price_missing", {
        proPriceId: "price_pro",
        teamPriceId: "price_team",
      })
    ).toBeNull();

    expect(subscriptionAllowsPaidEntitlements("active")).toBe(true);
    expect(subscriptionAllowsPaidEntitlements("trialing")).toBe(true);
    expect(subscriptionAllowsPaidEntitlements("past_due")).toBe(false);
    expect(subscriptionAllowsPaidEntitlements("canceled")).toBe(false);
  });

  it("requires paid subscription periods to be in the future", () => {
    const now = new Date("2026-05-18T00:00:00.000Z");

    expect(
      subscriptionHasCurrentPaidEntitlements(
        "active",
        "2026-06-17T00:00:00.000Z",
        now
      )
    ).toBe(true);
    expect(
      subscriptionHasCurrentPaidEntitlements(
        "active",
        "2026-05-17T00:00:00.000Z",
        now
      )
    ).toBe(false);
    expect(
      subscriptionHasCurrentPaidEntitlements(
        "past_due",
        "2026-06-17T00:00:00.000Z",
        now
      )
    ).toBe(false);
  });
});
