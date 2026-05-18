import { afterEach, describe, expect, it } from "vitest";
import { getBaseUrl, requireStripeSecret } from "./env";

describe("server environment guards", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects test-mode Stripe secrets in production", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_test_not_for_launch";

    expect(() => requireStripeSecret()).toThrow(
      "STRIPE_SECRET_KEY must be a live-mode key in production"
    );
  });

  it("requires an https base URL in production", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_SITE_URL = "http://localhost:3000";

    expect(() => getBaseUrl()).toThrow("ORCA_SITE_URL must be an https URL in production");
  });
});
