"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { highlight } from "sugar-high";

const CAL_URL = "https://cal.com/chris-karani-yylvyy";

// ─── Count-up hook ───
function useCountUp(end: number, duration = 1500, decimals = 0) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((eased * end).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration, decimals]);

  return { ref, value };
}

// ─── Code Block with syntax highlighting ───
// Theme map: sugar-high outputs `color:var(--sh-*)` inline styles.
// Tailwind v4 tree-shakes CSS vars not referenced by CSS rules,
// so we replace the var() references with concrete colors in JS.
const shTheme: Record<string, string> = {
  "var(--sh-class)": "#f9a8d4",      // pink-300 — constructors
  "var(--sh-identifier)": "#ffffff",  // white — variables
  "var(--sh-sign)": "#737373",        // neutral-500 — punctuation
  "var(--sh-property)": "#7dd3fc",    // sky-300 — object keys
  "var(--sh-entity)": "#c084fc",      // purple-400 — entity names
  "var(--sh-jsxliterals)": "#c084fc", // purple-400
  "var(--sh-string)": "#4ade80",      // green-400 — string literals
  "var(--sh-keyword)": "#c084fc",     // purple-400 — import, const, new
  "var(--sh-comment)": "#525252",     // neutral-600 — comments
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  let html = highlight(code);
  for (const [token, color] of Object.entries(shTheme)) {
    html = html.replaceAll(token, color);
  }
  return (
    <div className="rounded-xl border border-[#222] hover:border-[#444] transition-colors overflow-hidden bg-[#0f0f0f]">
      <div className="px-4 py-2.5 border-b border-[#222]">
        <span className="font-mono text-xs text-neutral-500">{label}</span>
      </div>
      <pre className="p-4 font-mono text-xs md:text-sm leading-relaxed overflow-x-auto">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

// ─── Nav ───
function Nav() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b border-neutral-100">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4 md:px-8">
        <Link href="/" className="font-medium tracking-[0.2em] text-sm uppercase text-neutral-900 hover:tracking-[0.25em] transition-all">
          orca
        </Link>
        <Link
          href={CAL_URL}
          className="group text-sm font-medium text-neutral-900 hover:text-neutral-600 transition-colors"
        >
          Book a Call{" "}
          <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
        </Link>
      </div>
    </nav>
  );
}

// ─── Transaction Log (Hero right column) ───
function TransactionLog() {
  const lines = [
    { text: "> POST /api/search — $0.003", color: "text-white" },
    { text: "  x-402: USDC/stellar", color: "text-neutral-500" },
    { text: "", color: "" },
    { text: "> orca: settling...", color: "text-white" },
    { text: "  $0.003 USDC", color: "text-neutral-500" },
    { text: "  3.2s finality", color: "text-neutral-500" },
    { text: "", color: "" },
    { text: "✓ provider paid", color: "text-green-400" },
    { text: "  $0.003 USDC  txn: 4a8f...c2e1", color: "text-neutral-500" },
  ];

  return (
    <div className="rounded-xl border border-[#222] bg-[#0f0f0f] p-5 md:p-6 font-mono text-xs md:text-sm leading-relaxed">
      {lines.map((line, i) =>
        line.text === "" ? (
          <div key={i} className="h-3" />
        ) : (
          <div key={i} className={`type-line ${line.color}`}>
            {line.text}
          </div>
        )
      )}
      <span className="cursor-blink text-white ml-0.5">│</span>
    </div>
  );
}

// ─── Comparison Table ───
function ComparisonTable() {
  const processingFee = useCountUp(0.0001, 1500, 4);
  const percentageFee = useCountUp(0, 1500, 0);
  const totalCost = useCountUp(0.0201, 1500, 4);
  const minTxn = useCountUp(0.001, 1500, 3);

  const rows = [
    { label: "Processing fee", traditional: "$0.3000", orca: processingFee, prefix: "$" },
    { label: "Percentage fee", traditional: "2.9%", orca: percentageFee, suffix: "%" },
    { label: "Total cost", traditional: "$0.3258", orca: totalCost, prefix: "$" },
    { label: "Settlement", traditional: "2–3 days", orcaStatic: "3–5 seconds" },
    { label: "Min viable txn", traditional: "~$10.00", orca: minTxn, prefix: "$" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-neutral-400 border-b border-neutral-200">
            <th className="pb-3 pr-8 font-normal"></th>
            <th className="pb-3 pr-8 font-normal">Traditional</th>
            <th className="pb-3 font-normal">Orca</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-neutral-100 hover:bg-[#fafafa] transition-colors">
              <td className="py-3 pr-8 text-neutral-500 text-xs md:text-sm">{row.label}</td>
              <td className="py-3 pr-8 text-neutral-400">{row.traditional}</td>
              <td className="py-3 font-medium text-neutral-900">
                {row.orcaStatic ? (
                  row.orcaStatic
                ) : (
                  <span ref={row.orca!.ref}>
                    {row.prefix || ""}{row.orca!.value}{row.suffix || ""}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───
export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fade-in observer
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll progress
  useEffect(() => {
    const bar = scrollRef.current;
    if (!bar) return;
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Type-in for dark section "3-5s"
  const stellarRef = useRef<HTMLDivElement>(null);
  const [stellarVisible, setStellarVisible] = useState(false);
  useEffect(() => {
    const el = stellarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStellarVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const growthCount = useCountUp(4700, 2000, 0);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Scroll progress bar */}
      <div ref={scrollRef} className="scroll-progress w-full" style={{ transform: "scaleX(0)" }} />

      <Nav />

      {/* ═══ ACT 1: THE PROBLEM ═══ */}

      {/* Section 1 — Hero */}
      <section className="dot-grid relative" style={{ backgroundPositionY: "8px", opacity: 0.97 }}>
        <div className="mx-auto max-w-5xl px-4 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            {/* Left column */}
            <div className="hero-stagger">
              <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-6">
                x402 · STELLAR · USDC
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.05] mb-6">
                <span className="font-serif italic line-through decoration-neutral-300 decoration-2">$0.30</span>
                <br />
                is killing the
                <br />
                agent economy.
              </h1>
              <p className="text-base md:text-lg text-neutral-500 max-w-lg mb-8">
                The developer-facing settlement layer for x402 on Stellar.
                3–5 second finality. $0.0001 per transaction. Native USDC.
              </p>
              <Link
                href={CAL_URL}
                className="group inline-flex items-center justify-center bg-black text-white rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors w-full sm:w-auto"
              >
                Book a Call{" "}
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
              <p className="font-mono text-xs text-neutral-400 mt-6">
                Built on x402 — Coinbase · Cloudflare · Google
                <br />
                100M+ payments processed
              </p>
            </div>

            {/* Right column — Transaction Log */}
            <div className="md:mt-12">
              <TransactionLog />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — The Numbers */}
      <section className="fade-in">
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
          <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-8">
            cost per $0.02 api call
          </p>

          <div className="border border-neutral-200 rounded-xl p-6 md:p-8">
            <ComparisonTable />
          </div>

          <p className="text-xl md:text-2xl font-semibold mt-8">
            3,000× more efficient.
          </p>

          <p className="text-neutral-500 text-base leading-relaxed mt-6 max-w-2xl">
            Stripe charges $0.30 + 2.9% per transaction — a floor that makes $0.01–$0.05 agent
            microtransactions structurally unprofitable. API providers are forced into subscriptions
            and prepaid credits, neither of which works for autonomous agents that need to pay as
            they go, at machine speed, without human approval.
          </p>
        </div>
      </section>

      {/* ═══ ACT 2: THE SOLUTION ═══ */}

      {/* Section 3 — Why Stellar (dark section) */}
      <section
        ref={stellarRef}
        className="relative bg-[#0a0a0a] text-white noise-bg overflow-hidden"
      >
        <div className="relative z-10 mx-auto max-w-5xl px-4 md:px-8 py-20 md:py-32 text-center">
          <div
            className={`font-mono text-5xl md:text-7xl lg:text-8xl font-light mb-6 overflow-hidden transition-all duration-700 ${
              stellarVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <span
              className={stellarVisible ? "inline-block" : "hidden"}
              style={
                stellarVisible
                  ? {
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      animation: "typeIn 0.8s steps(4) forwards",
                    }
                  : {}
              }
            >
              3–5s
            </span>
          </div>
          <p
            className={`text-neutral-400 text-lg md:text-xl mb-8 transition-opacity duration-500 ${
              stellarVisible ? "opacity-100 delay-700" : "opacity-0"
            }`}
          >
            settlement finality on Stellar
          </p>
          <div
            className={`flex flex-wrap justify-center gap-x-4 gap-y-2 font-mono text-xs md:text-sm text-neutral-500 mb-10 transition-opacity duration-500 ${
              stellarVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: stellarVisible ? "900ms" : "0ms" }}
          >
            <span>$0.0001/tx</span>
            <span>&middot;</span>
            <span>Native USDC</span>
            <span>&middot;</span>
            <span>No gas auctions</span>
            <span>&middot;</span>
            <span>No EVM</span>
          </div>
          <p className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            Stellar&apos;s Consensus Protocol settles at $0.0001 per transaction with native USDC
            support — the optimal rail for high-frequency, low-value workloads that define agent
            traffic. Predictable, near-zero fees at any volume.
          </p>
        </div>
      </section>

      {/* Section 4 — Integration */}
      <section className="fade-in dot-grid relative" style={{ opacity: 0.97 }}>
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">
            One middleware. That&apos;s it.
          </h2>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Provider side */}
            <div>
              <CodeBlock
                label="For MCP Providers"
                code={`import { orca } from "@orca/mid";\n\napp.use("/api/*",\n  orca.gate({\n    price: "0.001",\n    asset: "USDC",\n    meter: "per-req"\n  })\n);`}
              />
              <ul className="mt-4 space-y-1.5 text-sm text-neutral-500">
                <li>&middot; Gate any endpoint</li>
                <li>&middot; Meter per token or request</li>
                <li>&middot; Settle USDC in seconds</li>
              </ul>
            </div>

            {/* Agent side */}
            <div>
              <CodeBlock
                label="For Agent Developers"
                code={`import { OrcaWallet } from "@orca/sdk";\n\nconst wallet = new OrcaWallet({\n  budget: "10",\n  perService: "2"\n});`}
              />
              <ul className="mt-4 space-y-1.5 text-sm text-neutral-500">
                <li>&middot; Set spend limits</li>
                <li>&middot; Per-service caps</li>
                <li>&middot; No keys, no subscriptions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ACT 3: THE CLOSE ═══ */}

      {/* Section 5 — Capabilities + Growth */}
      <section className="fade-in">
        <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10">
            End-to-end on Stellar
          </h2>

          <div className="border border-neutral-200 rounded-xl p-5 md:p-6 font-mono text-sm mb-16">
            <p className="text-xs text-neutral-400 mb-4 tracking-wider">CAPABILITIES</p>
            <div className="space-y-3">
              {[
                ["settlement", "Fee sponsorship — devs never hold XLM."],
                ["metering", "Real-time tamper-proof audit logs."],
                ["controls", "Per-agent limits and per-service caps."],
                ["analytics", "Payment data → usage intelligence."],
              ].map(([key, desc]) => (
                <div key={key} className="flex gap-4">
                  <span className="text-neutral-400 w-24 shrink-0">{key}</span>
                  <span className="text-neutral-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mb-12">
            <p className="font-mono text-5xl md:text-6xl lg:text-7xl font-light">
              <span ref={growthCount.ref}>{growthCount.value.toLocaleString()}%</span>
            </p>
            <p className="text-neutral-500 text-sm md:text-base mt-3 max-w-md mx-auto">
              projected growth in AI-driven payment volume by 2027 — <span className="text-neutral-400">Visa</span>
            </p>
          </div>

          <p className="text-neutral-500 text-base leading-relaxed max-w-2xl mx-auto text-center mb-10">
            The x402 standard has already won. We&apos;re building the Stellar infrastructure layer
            that every API, every MCP server, and every agent framework will need.
          </p>

          <div className="text-center">
            <Link
              href={CAL_URL}
              className="group inline-flex items-center justify-center bg-black text-white rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Book a Call{" "}
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 6 — Footer */}
      <footer className="py-10 text-center">
        <p className="text-xs text-neutral-400">&copy; 2026 Orca</p>
      </footer>
    </div>
  );
}
