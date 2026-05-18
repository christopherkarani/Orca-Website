import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const requiredProductionEnv = [
  "ORCA_SITE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_TEAM_PRICE_ID",
  "ORCA_LICENSE_PRIVATE_KEY_PEM",
  "ORCA_LICENSE_PUBLIC_KEY_PEM",
  "ORCA_LICENSE_KEY_VERSION",
];

function runWithEnvJson(envJson: unknown) {
  return spawnSync("node", ["scripts/vercel-env-check.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ORCA_VERCEL_ENV_JSON: JSON.stringify(envJson),
    },
    encoding: "utf8",
  });
}

describe("vercel production environment checker", () => {
  it("passes when every required production environment name exists", () => {
    const result = runWithEnvJson({
      envs: requiredProductionEnv.map((key) => ({
        key,
        target: ["production"],
      })),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "All required Vercel production env names are configured"
    );
  });

  it("fails without printing secret values when production names are missing", () => {
    const result = runWithEnvJson({
      envs: [
        { key: "ORCA_SITE_URL", target: ["production"] },
        { key: "STRIPE_SECRET_KEY", target: ["preview"] },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing Vercel production env names");
    expect(result.stderr).toContain("CLERK_SECRET_KEY");
    expect(result.stderr).toContain("STRIPE_SECRET_KEY");
    expect(result.stderr).not.toContain("sk_live_");
  });

  it("accepts the array-shaped JSON emitted by older Vercel CLI versions", () => {
    const result = runWithEnvJson(
      requiredProductionEnv.map((key) => ({
        key,
        target: "production",
      }))
    );

    expect(result.status).toBe(0);
  });

  it("is wired to npm run vercel:env:check", () => {
    const output = execFileSync("npm", ["run", "vercel:env:check"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ORCA_VERCEL_ENV_JSON: JSON.stringify({
          envs: requiredProductionEnv.map((key) => ({ key, target: ["production"] })),
        }),
      },
      encoding: "utf8",
    });

    expect(output).toContain("vercel:env:check");
  });
});
