"use client";

import { useRef } from "react";
import { useCountUp } from "./useCountUp";

export function EndToEndSection() {
  const statRef = useRef<HTMLSpanElement>(null);
  const { value } = useCountUp(statRef, 4700, 2000, 0);

  const capabilities = [
    ["hosts", "Multiple host support — Codex, Claude Code, OpenCode, OpenClaw"],
    ["policy", "Per-agent policy enforcement with deny-by-default rules"],
    ["redact", "Automatic secret redaction before log persistence"],
    ["audit", "Tamper-evident audit logs with full session replay"],
    ["tests", "Red-team test fixtures to measure agent risk posture"],
  ];

  return (
    <section className="fade-in">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
          COMPLETE GUARDRAILS
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">
          End-to-end agent security
        </h2>

        <div className="border border-neutral-200 rounded-xl p-5 md:p-6 font-mono text-sm mb-16">
          <p className="text-xs text-neutral-400 mb-4 tracking-wider">CAPABILITIES</p>
          <div className="space-y-3">
            {capabilities.map(([key, desc]) => (
              <div key={key} className="flex gap-4">
                <span className="text-neutral-400 w-20 shrink-0">{key}</span>
                <span className="text-neutral-600">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-12">
          <p className="font-mono text-5xl md:text-6xl lg:text-7xl font-light">
            <span ref={statRef}>{value.toLocaleString()}+</span>
          </p>
          <p className="text-neutral-500 text-sm md:text-base mt-3 max-w-md mx-auto">
            agent sessions secured by Orca in early access
          </p>
        </div>

        <p className="text-neutral-500 text-base leading-relaxed max-w-2xl mx-auto text-center mb-10">
          Orca is purpose-built for the agent era — wrapping every command, API call, and
          file operation with policy guardrails before anything reaches the runtime.
        </p>
      </div>
    </section>
  );
}
