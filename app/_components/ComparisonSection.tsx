export function ComparisonSection() {
  const rows = [
    { label: "Policy enforcement", unprotected: "✗", orca: "✓" },
    { label: "Secret redaction", unprotected: "✗", orca: "✓" },
    { label: "Audit / replay", unprotected: "✗", orca: "✓" },
    { label: "Plugin support", unprotected: "✗", orca: "✓" },
  ];

  return (
    <section className="fade-in">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-8">
          UNWRAPPED COMMAND vs ORCA-MANAGED RUN
        </p>

        <div className="border border-neutral-200 rounded-xl p-6 md:p-8">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-neutral-400 border-b border-neutral-200">
                <th className="pb-3 pr-8 font-normal"></th>
                <th className="pb-3 pr-8 font-normal">Unwrapped command</th>
                <th className="pb-3 font-normal">Orca-managed run</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-neutral-100 hover:bg-[#fafafa] transition-colors"
                >
                  <td className="py-3 pr-8 text-neutral-500 text-xs md:text-sm">
                    {row.label}
                  </td>
                  <td className="py-3 pr-8 text-neutral-400 font-mono">{row.unprotected}</td>
                  <td className="py-3 font-medium text-neutral-900 font-mono">{row.orca}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10">
          <p className="text-xl md:text-2xl font-semibold mb-4">
            Guardrails before the agent acts.
          </p>
          <p className="text-neutral-500 text-base leading-relaxed max-w-2xl">
            Orca routes supported agent commands, tool calls, and file/network
            decisions through policy checks, secret redaction, and tamper-evident
            local audit before supervised work reaches the runtime.
          </p>
        </div>
      </div>
    </section>
  );
}
