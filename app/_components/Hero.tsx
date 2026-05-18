import Link from "next/link";

function TerminalWindow() {
  const lines = [
    { text: "$ orca run --agent my-agent", color: "text-neutral-500" },
    { text: "  ✓ policy guard active", color: "text-green-400" },
    { text: "  ✓ secret redaction enabled", color: "text-green-400" },
    { text: "  ✓ audit log: session_9f3a...b1e2", color: "text-neutral-500" },
    { text: "", color: "" },
    { text: "  [INFO]  orchestrating agent...", color: "text-white" },
    { text: "  [INFO]  command: search_api allowed", color: "text-white" },
    { text: "  [BLOCK] file_write: /etc/passwd denied by policy", color: "text-red-400" },
    { text: "  [INFO]  session recorded: 4.2s", color: "text-neutral-500" },
  ];

  return (
    <div
      className="rounded-xl border border-[#222] bg-[#0f0f0f] p-5 md:p-6 font-mono text-xs md:text-sm leading-relaxed"
      role="img"
      aria-label="Orca terminal session showing runtime guardrails in action: policy enforcement, secret redaction, and audit logging"
    >
      {lines.map((line, i) =>
        line.text === "" ? (
          <div key={i} className="h-3" />
        ) : (
          <div key={i} className={`type-line ${line.color}`}>
            {line.text}
          </div>
        )
      )}
      <span className="cursor-blink text-white ml-0.5" aria-hidden>│</span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="dot-grid relative" style={{ backgroundPositionY: "8px", opacity: 0.97 }}>
      <div className="mx-auto max-w-5xl px-4 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <div className="hero-stagger">
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-6">
              LOCAL-FIRST · ZIG · RUNTIME GUARDRAILS
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-6">
              Orca&nbsp;&mdash; local runtime
              <br />
              guardrails for
              <br />
              AI agents.
            </h1>
            <p className="text-base md:text-lg text-neutral-500 max-w-lg mb-8">
              Run AI agents through a local CLI that enforces policy, redacts secrets before
              persistence, writes tamper-evident local audit logs, and replays sessions without
              sending traces to Orca.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="group inline-flex items-center justify-center bg-black text-white rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                View pricing{" "}
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
              <Link
                href="/docs"
                className="group inline-flex items-center justify-center border border-neutral-300 text-neutral-900 rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-100 transition-colors"
              >
                Read docs{" "}
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
            <p className="font-mono text-xs text-neutral-400 mt-6">
              ~/orca $ zig build -Doptimize=ReleaseSafe
              <br />
              ~/orca $ zig build install
            </p>
          </div>

          <div className="md:mt-12">
            <TerminalWindow />
          </div>
        </div>
      </div>
    </section>
  );
}
