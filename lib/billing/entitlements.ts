export type OrcaTier = "free" | "pro" | "team";

export type Entitlements = {
  tier: OrcaTier;
  seatCount: number;
  features: string[];
};

export type StripePriceConfig = {
  proPriceId?: string;
  teamPriceId?: string;
};

const FREE_FEATURES = ["cli_core", "basic_policy", "local_audit"] as const;
const PRO_FEATURES = [
  ...FREE_FEATURES,
  "local_dashboard",
  "session_reports",
  "productivity_reports",
] as const;
const TEAM_FEATURES = [
  ...PRO_FEATURES,
  "ci_gate",
  "team_policy_packs",
  "baseline_drift_checks",
  "audit_bundles",
] as const;

export function getEntitlementsForTier(
  tier: OrcaTier,
  seatCount: number
): Entitlements {
  const normalizedSeats = tier === "team" ? Math.max(1, seatCount) : 1;

  if (tier === "team") {
    return {
      tier,
      seatCount: normalizedSeats,
      features: [...TEAM_FEATURES],
    };
  }

  if (tier === "pro") {
    return {
      tier,
      seatCount: 1,
      features: [...PRO_FEATURES],
    };
  }

  return {
    tier: "free",
    seatCount: 1,
    features: [...FREE_FEATURES],
  };
}

export function mapStripePriceToTier(
  priceId: string | null | undefined,
  config: StripePriceConfig
): Exclude<OrcaTier, "free"> | null {
  if (!priceId) return null;
  if (config.proPriceId && priceId === config.proPriceId) return "pro";
  if (config.teamPriceId && priceId === config.teamPriceId) return "team";
  return null;
}

export function subscriptionAllowsPaidEntitlements(status: string): boolean {
  return status === "active" || status === "trialing";
}

export function subscriptionHasCurrentPaidEntitlements(
  status: string,
  currentPeriodEnd: string | undefined,
  now = new Date()
): boolean {
  if (!subscriptionAllowsPaidEntitlements(status) || !currentPeriodEnd) {
    return false;
  }
  const expiresAt = new Date(currentPeriodEnd).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}
