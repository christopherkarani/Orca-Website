import { execFileSync } from "node:child_process";

const checks = [
  {
    name: "Git launch state",
    custom: checkGitState,
  },
  {
    name: "Vercel production env names",
    command: ["npm", ["run", "vercel:env:check"]],
  },
  {
    name: "Production preflight",
    command: ["npm", ["run", "preflight:prod"]],
  },
  {
    name: "Live ready-mode smoke",
    command: ["npm", ["run", "smoke:prod"]],
    env: { ORCA_EXPECT_READY: "true" },
  },
  {
    name: "Latest GitHub Actions run",
    custom: checkLatestGitHubRun,
  },
];

const failures = [];

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function checkGitState() {
  const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const status = execFileSync("git", ["status", "--short"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (branch !== "main") {
    throw new Error(`Launch checks must run from main, got ${branch}`);
  }
  if (status && process.env.ORCA_ALLOW_DIRTY_LAUNCH_CHECK !== "true") {
    throw new Error(
      "Launch checks require a clean worktree. Set ORCA_ALLOW_DIRTY_LAUNCH_CHECK=true only for local diagnostics."
    );
  }
  console.log(`Launch commit: ${currentHeadSha()}`);
}

function runCommand(name, command, env = {}) {
  const [binary, args] = command;
  try {
    const output = execFileSync(binary, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    console.log(`✓ ${name}`);
    if (output.trim()) console.log(output.trim());
  } catch (error) {
    const stdout = typeof error.stdout === "string" ? error.stdout.trim() : "";
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const output = [stdout, stderr].filter(Boolean).join("\n");
    failures.push({ name, output: output || error.message });
    console.error(`✗ ${name}`);
    if (output) console.error(output);
  }
}

function checkLatestGitHubRun() {
  const raw =
    process.env.ORCA_GITHUB_RUN_JSON ??
    execFileSync(
      "gh",
      [
        "run",
        "list",
        "--limit",
        "1",
        "--json",
        "databaseId,headSha,status,conclusion,name,url",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  const runs = JSON.parse(raw);
  const run = runs[0];
  if (!run) throw new Error("No GitHub Actions runs found");
  const headSha = currentHeadSha();
  if (run.headSha !== headSha) {
    throw new Error(
      `${run.name} ${run.databaseId} ran for ${run.headSha}, expected current HEAD ${headSha}: ${run.url}`
    );
  }
  if (run.status !== "completed" || run.conclusion !== "success") {
    throw new Error(
      `${run.name} ${run.databaseId} is ${run.status}/${run.conclusion || "none"}: ${run.url}`
    );
  }
  console.log(`Latest GitHub Actions run passed: ${run.url}`);
}

for (const check of checks) {
  if (check.custom) {
    try {
      check.custom();
      console.log(`✓ ${check.name}`);
    } catch (error) {
      failures.push({
        name: check.name,
        output: error instanceof Error ? error.message : String(error),
      });
      console.error(`✗ ${check.name}`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  } else {
    runCommand(check.name, check.command, check.env);
  }
}

if (failures.length > 0) {
  console.error("\nOrca production launch check failed:");
  for (const failure of failures) {
    console.error(`\n[${failure.name}]`);
    console.error(failure.output);
  }
  process.exit(1);
}

console.log("Orca production launch check passed.");
