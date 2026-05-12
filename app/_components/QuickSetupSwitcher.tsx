"use client";

import { useState } from "react";
import { CodeBlock } from "./CodeBlock";

type Host = "claude" | "codex" | "opencode" | "openclaw";

const hostConfig: Record<Host, { label: string; code: string; lang?: string }> = {
  claude: {
    label: "Claude",
    code: `claude plugin marketplace add chriskarani/orca
claude plugin install orca@orca --scope user`,
  },
  codex: {
    label: "Codex",
    code: `codex plugin marketplace add chriskarani/orca`,
  },
  opencode: {
    label: "OpenCode",
    code: `{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@orca/opencode-plugin"]
}`,
  },
  openclaw: {
    label: "OpenClaw",
    code: `openclaw plugins install clawhub:orca`,
  },
};

const hosts: Host[] = ["claude", "codex", "opencode", "openclaw"];

export function QuickSetupSwitcher() {
  const [active, setActive] = useState<Host>("claude");

  return (
    <section>
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-3 text-center">
          INSTALL ORCA PLUGIN IN SECONDS
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-8 text-center">
          Plug into any agent host
        </h2>

        <div className="flex flex-wrap justify-center gap-1 mb-8" role="tablist" aria-label="Agent host selection">
          {hosts.map((host) => (
            <button
              key={host}
              role="tab"
              aria-selected={active === host}
              aria-controls={`panel-${host}`}
              id={`tab-${host}`}
              onClick={() => setActive(host)}
              className={`px-5 py-2.5 text-sm font-medium rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-500 ${
                active === host
                  ? "bg-black text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {hostConfig[host].label}
            </button>
          ))}
        </div>

        {hosts.map((host) => (
          <div
            key={host}
            role="tabpanel"
            id={`panel-${host}`}
            aria-labelledby={`tab-${host}`}
            hidden={active !== host}
          >
            {active === host && (
              <div className="max-w-2xl mx-auto">
                <CodeBlock
                  label={hostConfig[host].label}
                  code={hostConfig[host].code}
                />
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-neutral-400 mt-6 text-center max-w-lg mx-auto">
          The <code className="text-neutral-600">orca</code> CLI must be installed
          separately via <code className="text-neutral-600">zig build</code>. Plugin
          installation assumes the CLI is already on your <code className="text-neutral-600">$PATH</code>.
        </p>
      </div>
    </section>
  );
}
