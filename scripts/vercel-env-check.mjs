import { execFileSync } from "node:child_process";

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

function loadEnvJson() {
  if (process.env.ORCA_VERCEL_ENV_JSON) return process.env.ORCA_VERCEL_ENV_JSON;
  return execFileSync(
    "npx",
    ["vercel", "env", "ls", "production", "--format", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
}

let payload;
try {
  payload = JSON.parse(loadEnvJson());
} catch (error) {
  console.error(
    `Failed to read Vercel production env list: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}

const envs = Array.isArray(payload) ? payload : payload.envs;
if (!Array.isArray(envs)) {
  console.error("Unexpected Vercel env JSON shape. Expected an array or { envs: [] }.");
  process.exit(1);
}

const present = new Set(
  envs
    .filter((env) => Array.isArray(env.target) && env.target.includes("production"))
    .map((env) => env.key)
);
const missing = requiredProductionEnv.filter((key) => !present.has(key));

if (missing.length > 0) {
  console.error("Missing Vercel production env names:");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

console.log("All required Vercel production env names are configured.");
