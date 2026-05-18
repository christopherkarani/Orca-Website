import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "../_components/CodeBlock";
import { Footer } from "../_components/Footer";
import { Nav } from "../_components/Nav";

const GITHUB_URL = "https://github.com/christopherkarani/Orca";

export const metadata: Metadata = {
  title: "Docs - Orca",
  description:
    "Install, configure, and verify Orca local runtime guardrails for AI agent workflows.",
};

const navItems = [
  ["Install", "#install"],
  ["Quickstart", "#quickstart"],
  ["Policy", "#policy"],
  ["Integrations", "#integrations"],
  ["Activation", "#activation"],
  ["Security", "#security"],
  ["Troubleshooting", "#troubleshooting"],
] as const;

const facts = [
  ["Source", "christopherkarani/Orca"],
  ["Release", "v1.1.0"],
  ["Zig", "0.15.2"],
  ["Policy path", ".aegis/policy.yaml"],
] as const;

const coreCommands = `orca --help
orca version
orca doctor
orca init --preset generic-agent
orca policy check .aegis/policy.yaml
orca run -- <agent-command>
orca replay --session last --verify
orca redteam --ci`;

const pluginChecks = `orca plugin doctor codex
orca plugin doctor claude
orca plugin doctor opencode
orca plugin doctor openclaw

orca plugin manifest codex
orca plugin manifest claude
orca plugin manifest opencode
orca plugin manifest openclaw

orca plugin install codex --dry-run
orca plugin install claude --dry-run
orca plugin install opencode --dry-run
orca plugin install openclaw --dry-run`;

const integrations = [
  {
    name: "Codex",
    href: `${GITHUB_URL}/blob/main/docs/integrations/codex.md`,
    install: "codex plugin marketplace add christopherkarani/Orca",
    run: "orca run -- codex",
    note: "Repo marketplace source. Install from Codex after adding the source.",
  },
  {
    name: "Claude Code",
    href: `${GITHUB_URL}/blob/main/docs/integrations/claude-code.md`,
    install:
      "claude plugin marketplace add christopherkarani/Orca\nclaude plugin install orca@orca --scope user",
    run: "orca run -- claude",
    note: "Repo marketplace source with hooks and slash-command helpers.",
  },
  {
    name: "OpenCode",
    href: `${GITHUB_URL}/blob/main/docs/integrations/opencode.md`,
    install: `{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["orca-opencode-plugin"]
}

npm install orca-opencode-plugin`,
    run: "orca run -- opencode",
    note: "npm plugin. Keep the Orca CLI separately available on PATH.",
  },
  {
    name: "OpenClaw",
    href: `${GITHUB_URL}/blob/main/docs/integrations/openclaw.md`,
    install:
      "openclaw plugins install ./integrations/openclaw-plugin\nopenclaw plugins install npm:orca-openclaw-plugin\nopenclaw plugins install clawhub:orca-openclaw-plugin",
    run: "orca run -- openclaw",
    note: "Local path, npm, and ClawHub install paths are documented.",
  },
] as const;

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-28 grid-cols-[minmax(0,1fr)] gap-8 border-t border-neutral-100 py-14 md:py-16 lg:grid-cols-[210px_minmax(0,1fr)]"
    >
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-3">
          {eyebrow}
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          {title}
        </h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function InlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-neutral-950 underline underline-offset-4">
      {children}
    </Link>
  );
}

function Note({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l border-neutral-300 pl-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="text-sm text-neutral-500 leading-relaxed">{children}</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Nav />
      <main>
        <section className="dot-grid relative" style={{ opacity: 0.97 }}>
          <div className="mx-auto max-w-6xl px-4 md:px-8 pt-16 md:pt-24 pb-14 md:pb-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-6">
                  ORCA DOCS
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] mb-6 max-w-3xl">
                  Local runtime guardrails for AI agents.
                </h1>
                <p className="text-base md:text-lg text-neutral-500 max-w-2xl leading-relaxed">
                  Build Orca from source, initialize policy, run agents through the
                  supervised CLI, and add host plugins for Codex, Claude Code, OpenCode,
                  and OpenClaw. The CLI is the source of truth for policy decisions.
                </p>
              </div>
              <div className="border border-neutral-200 bg-white/80 p-5">
                <p className="font-mono text-xs tracking-[0.18em] text-neutral-400 mb-4">
                  VERIFIED AGAINST
                </p>
                <dl className="grid gap-3">
                  {facts.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-xs text-neutral-400">{label}</dt>
                      <dd className="text-sm font-medium text-neutral-900 text-right">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 md:px-8 lg:grid-cols-[180px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav
              aria-label="Docs sections"
              className="sticky top-24 py-14 text-sm text-neutral-500"
            >
              <p className="font-mono text-xs tracking-[0.18em] text-neutral-400 mb-4">
                CONTENTS
              </p>
              <div className="grid gap-2">
                {navItems.map(([label, href]) => (
                  <Link key={href} href={href} className="hover:text-neutral-950">
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </aside>

          <div className="min-w-0">
            <Section id="install" eyebrow="INSTALL" title="Build from source">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-5">
                  <p className="text-neutral-500 leading-relaxed">
                    Orca is a Zig CLI. The current repository pins Zig{" "}
                    <code className="font-mono text-neutral-900">0.15.2</code>.
                    Build from the public repository, install into a local prefix, then
                    put the binary on your{" "}
                    <code className="font-mono text-neutral-900">PATH</code>.
                  </p>
                  <CodeBlock
                    label="Source install"
                    code={`git clone https://github.com/christopherkarani/Orca.git
cd Orca

zig version
zig build -Doptimize=ReleaseSafe
zig build -Doptimize=ReleaseSafe --prefix ~/.local

export PATH="$HOME/.local/bin:$PATH"
orca --help
orca doctor`}
                  />
                </div>
                <Note title="Use release docs for packaging">
                  Verify artifact checksums and platform notes in{" "}
                  <InlineLink href={`${GITHUB_URL}/blob/main/docs/install.md`}>
                    install.md
                  </InlineLink>{" "}
                  before moving a binary to another machine.
                </Note>
              </div>
            </Section>

            <Section id="quickstart" eyebrow="QUICKSTART" title="Start protected work">
              <div className="space-y-8">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
                  <div className="min-w-0 space-y-5">
                    <p className="text-neutral-500 leading-relaxed">
                      Run <code className="font-mono text-neutral-900">doctor</code>{" "}
                      first. It reports which protections are active, limited,
                      wrapper-only, observe-only, or unavailable on your platform.
                    </p>
                    <CodeBlock
                      label="Setup"
                      code={`orca doctor
orca init --preset generic-agent
orca policy check .aegis/policy.yaml`}
                    />
                  </div>
                  <div className="min-w-0 space-y-5">
                    <p className="text-neutral-500 leading-relaxed">
                      The strongest local protection is launching the agent as an
                      Orca-managed child process. Plugins add host hooks, but they do not
                      replace the runtime wrapper.
                    </p>
                    <CodeBlock
                      label="Run"
                      code={`orca run -- codex
orca run -- claude
orca run -- opencode
orca run -- openclaw`}
                    />
                  </div>
                </div>
                <CodeBlock label="CLI overview" code={coreCommands} />
              </div>
            </Section>

            <Section id="policy" eyebrow="POLICY" title="Deny by default">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-5">
                  <p className="text-neutral-500 leading-relaxed">
                    Policies are YAML with{" "}
                    <code className="font-mono text-neutral-900">version: 1</code>.
                    Explicit denies beat allows. CI mode never prompts; ask decisions
                    become deny unless an explicit allow rule applies.
                  </p>
                  <CodeBlock
                    label="Policy example"
                    code={`version: 1
mode: strict
workspace:
  root: "."
  write_mode: staged
env:
  inherit: false
  allow:
    - PATH
    - HOME
commands:
  default: deny
  allow:
    - "git status"
    - "zig build *"
  deny:
    - "rm -rf *"
    - "curl * | sh"
network:
  mode: allowlist
  default: deny
audit:
  level: full
  redact_secrets: true
  tamper_evident: true`}
                  />
                </div>
                <div className="min-w-0 space-y-5">
                  <Note title="Explain a denial">
                    Use policy explain commands when a file, command, network request,
                    or MCP tool is denied.
                  </Note>
                  <CodeBlock
                    label="Explain"
                    code={`orca policy explain command git status
orca policy explain file.read ./.env
orca policy explain network https://example.invalid/path`}
                  />
                </div>
              </div>
            </Section>

            <Section id="integrations" eyebrow="INTEGRATIONS" title="Add host plugins">
              <div className="space-y-8">
                <p className="text-neutral-500 leading-relaxed max-w-3xl">
                  Plugins call the Orca CLI for decisions, diagnostics, red-team checks,
                  and replay. Keep{" "}
                  <code className="font-mono text-neutral-900">orca</code> on your{" "}
                  <code className="font-mono text-neutral-900">PATH</code>; plugins do
                  not bundle the CLI.
                </p>
                <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                  {integrations.map((integration) => (
                    <article
                      key={integration.name}
                      className="grid min-w-0 gap-5 py-6 lg:grid-cols-[170px_minmax(0,1fr)]"
                    >
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight">
                          {integration.name}
                        </h3>
                        <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                          {integration.note}
                        </p>
                        <Link
                          href={integration.href}
                          className="mt-3 inline-block text-xs text-neutral-500 hover:text-neutral-950 underline underline-offset-4"
                        >
                          Integration docs
                        </Link>
                      </div>
                      <div className="grid min-w-0 gap-4 md:grid-cols-2">
                        <CodeBlock label="Install" code={integration.install} />
                        <CodeBlock label="Strongest protection" code={integration.run} />
                      </div>
                    </article>
                  ))}
                </div>
                <CodeBlock label="Plugin diagnostics" code={pluginChecks} />
              </div>
            </Section>

            <Section id="activation" eyebrow="LICENSE" title="Activate a paid license">
              <div className="space-y-8">
                <p className="text-neutral-500 leading-relaxed max-w-3xl">
                  Pro and Team purchases create an account on this website and issue a
                  signed Orca license key. The local CLI verifies the signature with the
                  matching public key embedded in the Orca repo. Orca does not need to
                  call this website while your agents run.
                </p>
                <p className="text-neutral-500 leading-relaxed max-w-3xl">
                  If your browser session is gone later, sign back in with Clerk using
                  GitHub or email to view the same account and license.
                </p>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ["1", "Buy Pro or Team"],
                    ["2", "Copy the license from Account"],
                    ["3", "Run the activation command"],
                    ["4", "Use Orca locally"],
                  ].map(([step, label]) => (
                    <div key={step} className="border border-neutral-200 bg-white p-5">
                      <p className="font-mono text-xs text-neutral-400 mb-4">{step}</p>
                      <p className="text-sm font-medium text-neutral-900">{label}</p>
                    </div>
                  ))}
                </div>
                <CodeBlock
                  label="Activate"
                  code={`orca license activate <key>
orca license status`}
                />
              </div>
            </Section>

            <Section id="security" eyebrow="SECURITY" title="Know the boundary">
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-3">
                  <Note title="Local first">
                    Local policy decisions, redaction before persistence, auditability,
                    replay, and no telemetry by default.
                  </Note>
                  <Note title="Wrapper strongest">
                    Host hooks are additive. Use{" "}
                    <code className="font-mono text-neutral-900">orca run</code> for
                    supervised execution.
                  </Note>
                  <Note title="No magic sandbox">
                    No universal transparent filesystem or network enforcement, kernel
                    isolation, or protection outside Orca.
                  </Note>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
                  <CodeBlock
                    label="Replay"
                    code={`orca replay --session last
orca replay --session last --json
orca replay --session last --only denied
orca replay --session last --verify`}
                  />
                  <CodeBlock
                    label="Red-team"
                    code={`orca redteam --ci
orca redteam --json --ci > redteam.json`}
                  />
                </div>
              </div>
            </Section>

            <Section id="troubleshooting" eyebrow="TROUBLESHOOTING" title="Debug a setup">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-5">
                  <p className="text-neutral-500 leading-relaxed">
                    Start with the binary, policy, and latest replay. If a capability is
                    reported as limited, wrapper-only, observe-only, or unavailable,
                    treat it as weaker protection until the platform backend says
                    otherwise.
                  </p>
                  <CodeBlock
                    label="Troubleshoot"
                    code={`zig version
zig build -Doptimize=ReleaseSafe

orca doctor
orca policy check .aegis/policy.yaml
orca replay --session last --only denied
orca redteam fixtures --fixture prompt-injection/readme-env-read --ci`}
                  />
                </div>
                <div className="border-l border-neutral-300 pl-4">
                  <p className="font-mono text-xs tracking-[0.18em] text-neutral-400 mb-4">
                    UPSTREAM DOCS
                  </p>
                  <div className="grid gap-3 text-sm">
                    <InlineLink href={`${GITHUB_URL}/blob/main/docs/quickstart.md`}>
                      Quickstart
                    </InlineLink>
                    <InlineLink href={`${GITHUB_URL}/blob/main/docs/policy.md`}>
                      Policy
                    </InlineLink>
                    <InlineLink href={`${GITHUB_URL}/blob/main/docs/redteam.md`}>
                      Red-team
                    </InlineLink>
                    <InlineLink href={`${GITHUB_URL}/blob/main/docs/replay.md`}>
                      Replay
                    </InlineLink>
                    <InlineLink href={`${GITHUB_URL}/blob/main/docs/troubleshooting.md`}>
                      Troubleshooting
                    </InlineLink>
                    <InlineLink href={`${GITHUB_URL}/blob/main/docs/integrations/plugin-security-model.md`}>
                      Plugin security model
                    </InlineLink>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
