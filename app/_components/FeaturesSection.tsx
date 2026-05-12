export function FeaturesSection() {
  const features = [
    {
      title: "Runtime Guardrails",
      desc: "Enforces policy on commands, file access, networks, and tools — before your agent acts.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      title: "Secret Redaction & Audit",
      desc: "Removes secrets before persistence. Records tamper-evident audit logs with full session replay.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      title: "Plugin Integrations",
      desc: "Native hooks and diagnostics for Codex, Claude Code, OpenCode, and OpenClaw. orca run provides the strongest protection.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      title: "Red-Team Validation",
      desc: "Built-in security tests to measure your agent's risk posture. Score, report, and iterate.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  return (
    <section className="fade-in dot-grid relative" style={{ opacity: 0.97 }}>
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-3 text-center">
          FEATURES
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-12 text-center">
          Why Orca
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-neutral-200 p-6 hover:border-neutral-300 transition-colors bg-white"
            >
              <div className="text-neutral-900 mb-4">{f.icon}</div>
              <h3 className="text-sm font-semibold mb-2 text-neutral-900">{f.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
