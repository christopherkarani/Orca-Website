export function EndToEndSection() {
  const capabilities = [
    ["hosts", "Multiple host support — Codex, Claude Code, OpenCode, OpenClaw"],
    ["policy", "Per-agent policy enforcement with deny-by-default rules"],
    ["redact", "Automatic secret redaction before log persistence"],
    ["audit", "Tamper-evident local audit logs with session replay"],
    ["tests", "Red-team test fixtures to measure agent risk posture"],
  ];

  return (
    <section className="fade-in">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
          LOCAL GUARDRAILS
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">
          Supervised runs without a hosted dashboard
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

        <div className="grid gap-4 md:grid-cols-4 mb-12">
          {[
            "Runs locally",
            "Policy files live in your repo",
            "Audit logs stay on your machine",
            "CI mode supported",
          ].map((label) => (
            <div key={label} className="border border-neutral-200 p-5 text-center">
              <p className="text-sm font-medium text-neutral-900">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-neutral-500 text-base leading-relaxed max-w-2xl mx-auto text-center mb-10">
          Orca is purpose-built for local agent workflows: supported commands,
          tool calls, and file/network decisions are checked before supervised work
          reaches the runtime. No hosted monitoring, cloud sync, or telemetry upload
          is required for license verification.
        </p>
      </div>
    </section>
  );
}
