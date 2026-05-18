const baseUrl = (process.env.ORCA_SITE_URL ?? "https://orca-tx.com").replace(/\/$/, "");
const expectReady = process.env.ORCA_EXPECT_READY === "true";
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireText(label, text, expected) {
  if (!text.includes(expected)) fail(`${label} is missing expected text: ${expected}`);
}

function rejectText(label, text, pattern) {
  if (pattern.test(text)) fail(`${label} contains forbidden text matching ${pattern}`);
}

async function fetchResponse(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: "text/html,application/json" },
    redirect: "manual",
  });
  const text = await response.text();
  return { response, text };
}

async function checkHtmlPage(path, label, expectedText) {
  const { response, text } = await fetchResponse(path);
  if (response.status !== 200) {
    fail(`${label} returned ${response.status}, expected 200`);
    return text;
  }
  for (const expected of expectedText) requireText(label, text, expected);
  return text;
}

if (!baseUrl.startsWith("https://")) {
  fail("ORCA_SITE_URL must be an https URL for production smoke checks");
}

const pricing = await checkHtmlPage("/pricing", "pricing page", [
  "Free",
  "Pro",
  "Team",
  "Start Pro checkout",
  "Start Team checkout",
  "orca license activate",
]);
rejectText("pricing page", pricing, /Work email/i);
rejectText("pricing page", pricing, /cloud sync|hosted monitoring|telemetry upload/i);

await checkHtmlPage("/account", "account page", [
  "View your Orca license",
  "Sign in with GitHub",
]);
const accountResponse = await fetch(`${baseUrl}/account`, { redirect: "manual" });
const accountCache = accountResponse.headers.get("cache-control") ?? "";
if (!accountCache.toLowerCase().includes("no-store")) {
  fail("account page must set Cache-Control: no-store");
}

await checkHtmlPage("/docs", "docs page", [
  "Activate a paid license",
  "orca license activate",
]);

const { response: healthResponse, text: healthText } = await fetchResponse("/api/health");
let health;
try {
  health = JSON.parse(healthText);
} catch {
  fail("/api/health did not return JSON");
}

if (health && "checks" in health) {
  fail("/api/health must not expose detailed readiness checks in production");
}

if (expectReady) {
  if (healthResponse.status !== 200) {
    fail(`/api/health returned ${healthResponse.status}, expected 200 with ORCA_EXPECT_READY=true`);
  }
  if (health?.status !== "ready" || health?.production !== true) {
    fail('/api/health must return {"status":"ready","production":true} before launch');
  }
} else if (healthResponse.status === 503 && health?.status === "blocked") {
  console.log("/api/health is fail-closed: production is not fully provisioned yet.");
} else if (healthResponse.status !== 200 || health?.status !== "ready") {
  fail(`/api/health returned unexpected status ${healthResponse.status}: ${healthText}`);
}

if (failures.length > 0) {
  console.error("Orca production smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Orca production smoke passed for ${baseUrl}`);
