"use client";

import { useEffect, useRef, useState } from "react";
import { CodeBlock } from "./CodeBlock";

export function DarkSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative bg-[#0a0a0a] text-white noise-bg overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-4 md:px-8 py-20 md:py-32">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-500 mb-4 text-center">
          HOW IT WORKS
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 text-center">
          One local CLI. Multiple agent hosts.
        </h2>

        <div
          className={`transition-opacity duration-700 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-2xl mx-auto mb-16">
            <p className="text-sm text-neutral-400 mb-4">
              1. Build and install the Orca CLI:
            </p>
            <CodeBlock
              label="Build & Install"
              code={`zig build -Doptimize=ReleaseSafe
zig build install`}
            />
          </div>

          <div className="max-w-2xl mx-auto mb-16">
            <p className="text-sm text-neutral-400 mb-4">
              2. Wrap any agent command with <code className="text-neutral-300">orca run</code>:
            </p>
            <CodeBlock
              label="Wrap your agent"
              code={`orca run --agent claude -- claude

# Orca intercepts the process:
#   policy  →  redact  →  audit  →  execute`}
            />
          </div>

          <div className="max-w-3xl mx-auto mb-16">
            <p className="text-sm text-neutral-400 mb-6 text-center">
              3. Every operation passes through three guardrails:
            </p>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="flex-1 rounded-xl border border-[#222] bg-[#111] p-5 text-center">
                <div className="text-2xl mb-2 text-neutral-300">01</div>
                <p className="text-sm font-medium text-white mb-1">Policy Engine</p>
                <p className="text-xs text-neutral-500">
                  Commands, file access, network, and tools checked against deny-by-default rules
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center text-neutral-600 text-2xl shrink-0">
                &rarr;
              </div>
              <div className="flex-1 rounded-xl border border-[#222] bg-[#111] p-5 text-center">
                <div className="text-2xl mb-2 text-neutral-300">02</div>
                <p className="text-sm font-medium text-white mb-1">Secret Redaction</p>
                <p className="text-xs text-neutral-500">
                  Secrets, keys, and tokens stripped before anything reaches disk or network
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center text-neutral-600 text-2xl shrink-0">
                &rarr;
              </div>
              <div className="flex-1 rounded-xl border border-[#222] bg-[#111] p-5 text-center">
                <div className="text-2xl mb-2 text-neutral-300">03</div>
                <p className="text-sm font-medium text-white mb-1">Audit &amp; Replay</p>
                <p className="text-xs text-neutral-500">
                  Tamper-evident local logs with replay for Orca-managed agent runs
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-neutral-400 mb-4">
              Example session with <code className="text-neutral-300">orca run</code>:
            </p>
            <div className="rounded-xl border border-[#222] bg-[#0f0f0f] p-5 font-mono text-xs md:text-sm leading-relaxed">
              <div className="text-green-400">$ orca run --agent search-bot -- python search.py</div>
              <div className="text-neutral-500 mt-1">[policy]  command=python allowed</div>
              <div className="text-neutral-500">[policy]  network=api.example.com allowed</div>
              <div className="text-neutral-500">[redact]  api_key=sk-*** intercepted</div>
              <div className="text-neutral-500">[audit]   session=a1b2c3 recorded</div>
              <div className="text-white mt-2">✓ agent completed in 3.2s</div>
              <div className="text-neutral-500">  replay: orca replay a1b2c3</div>
              <span className="cursor-blink text-white ml-0.5" aria-hidden>│</span>
            </div>
          </div>

          <p className="text-sm text-neutral-500 text-center mt-10 max-w-lg mx-auto">
            <strong className="text-neutral-400">Plugin not required.</strong>{" "}
            <code className="text-neutral-400">orca run</code> works with any tool —
            the plugins just add deeper integration for diagnostics and lifecycle hooks.
          </p>
        </div>
      </div>
    </section>
  );
}
