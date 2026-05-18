import type { Metadata } from "next";
import { Footer } from "../_components/Footer";
import { Nav } from "../_components/Nav";

export const metadata: Metadata = {
  title: "Pricing - Orca",
  description:
    "Choose Orca Free, Pro, or Team. Buy a plan, receive a signed offline license, and activate the local Orca CLI.",
};

const plans = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    description: "Open-source CLI and core local guardrails.",
    features: ["CLI core", "Basic policy", "Local audit logs", "Build from source"],
    cta: "Read the docs",
    href: "/docs#install",
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$19",
    cadence: "per month",
    description: "Local dashboard, reports, and productivity workflow features.",
    features: [
      "Everything in Free",
      "Local dashboard entitlement",
      "Session reports",
      "Productivity reports",
      "Signed offline license key",
    ],
    cta: "Start Pro checkout",
  },
  {
    tier: "team",
    name: "Team",
    price: "$99",
    cadence: "per month",
    description: "CI and team policy workflows for self-managed Orca rollouts.",
    features: [
      "Everything in Pro",
      "CI gate entitlement",
      "Team policy packs",
      "Baseline and drift checks",
      "Audit bundles",
    ],
    cta: "Start Team checkout",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Nav />
      <main>
        <section className="dot-grid relative" style={{ opacity: 0.97 }}>
          <div className="mx-auto max-w-6xl px-4 md:px-8 py-16 md:py-24">
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-6">
              ORCA PRICING
            </p>
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
                Buy Orca. Keep your agent runs local.
              </h1>
              <p className="text-base md:text-lg text-neutral-500 leading-relaxed">
                Paid plans issue a signed license that the local Orca CLI can verify
                offline. Orca does not need to call this website while you run agents.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 md:px-8 py-14 md:py-20">
          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.tier} className="border border-neutral-200 bg-white p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold tracking-tight">{plan.name}</h2>
                  <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  {"cadence" in plan && (
                    <span className="text-sm text-neutral-500">{plan.cadence}</span>
                  )}
                </div>
                <ul className="mb-8 space-y-3 text-sm text-neutral-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="text-neutral-950">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.tier === "free" ? (
                  <a
                    href={plan.href}
                    className="inline-flex w-full items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-100"
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <form action="/api/checkout" method="post" className="space-y-3">
                    <input type="hidden" name="tier" value={plan.tier} />
                    <label className="block text-xs font-medium text-neutral-500">
                      Work email
                      <input
                        required
                        type="email"
                        name="email"
                        placeholder="you@company.com"
                        className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-950"
                      />
                    </label>
                    {plan.tier === "team" && (
                      <label className="block text-xs font-medium text-neutral-500">
                        Seats
                        <input
                        min={1}
                        max={250}
                        defaultValue={5}
                        type="number"
                          name="seatCount"
                          className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-950"
                        />
                      </label>
                    )}
                    <button
                      type="submit"
                      className="w-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                      {plan.cta}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-neutral-100 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 md:px-8 py-14">
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-8">
              HOW ACTIVATION WORKS
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["1", "Buy plan"],
                ["2", "Copy license"],
                ["3", "Run orca license activate <key>"],
                ["4", "Use Orca locally"],
              ].map(([step, label]) => (
                <div key={step} className="border border-neutral-200 bg-white p-5">
                  <p className="font-mono text-xs text-neutral-400 mb-4">{step}</p>
                  <p className="text-sm font-medium text-neutral-900">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
