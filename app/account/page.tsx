import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { AccountDashboard } from "./AccountDashboard";
import { Footer } from "../_components/Footer";
import { Nav } from "../_components/Nav";
import { SESSION_COOKIE, getAccountFromSessionToken } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { getLicenseSigningConfig, isProductionRuntime } from "@/lib/server/env";

export const metadata: Metadata = {
  title: "Account - Orca",
  description: "View your Orca plan, signed license, activation command, and billing portal.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function LoginPanel({
  login,
  error,
}: {
  login?: string;
  error?: string;
}) {
  const devLoginEnabled = !isProductionRuntime();
  const message =
    login === "requested"
      ? "If that email belongs to an Orca account, a one-time access link is on the way."
      : error === "login_link"
        ? "That account link is expired or already used. Request a new one."
        : error === "login_email"
          ? "Orca could not send the account link. Try again in a minute."
          : undefined;

  return (
    <section className="mx-auto max-w-xl border border-neutral-200 bg-white p-6">
      <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
        ACCOUNT ACCESS
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">View your Orca license</h1>
      <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
        Buy Pro or Team from the pricing page. After Stripe Checkout, Orca opens this
        dashboard with a verified account session. Returning customers can request a
        one-time account link.
      </p>
      {message && (
        <p className="mt-4 border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          {message}
        </p>
      )}
      {devLoginEnabled ? (
        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <label className="block text-xs font-medium text-neutral-500">
            Development email login
            <input
              required
              type="email"
              name="email"
              placeholder="you@company.com"
              className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-950"
            />
          </label>
          <button type="submit" className="w-full bg-black px-5 py-3 text-sm font-medium text-white">
            Continue
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <form action="/api/auth/request-login" method="post" className="space-y-4">
            <label className="block text-xs font-medium text-neutral-500">
              Account email
              <input
                required
                type="email"
                name="email"
                placeholder="you@company.com"
                className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-950"
              />
            </label>
            <button type="submit" className="w-full bg-black px-5 py-3 text-sm font-medium text-white">
              Send account link
            </button>
          </form>
          <a
            href="/pricing"
            className="inline-flex w-full items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-950"
          >
            Choose a plan
          </a>
        </div>
      )}
    </section>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const params = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  let content: React.ReactNode = (
    <LoginPanel login={firstParam(params.login)} error={firstParam(params.error)} />
  );
  if (sessionToken) {
    const store = getStore();
    const account = await getAccountFromSessionToken(store, sessionToken);
    if (account) {
      let license = await store.getCurrentLicenseForAccount(account.id);
      if (!license) {
        const signing = getLicenseSigningConfig();
        license = await store.issueLicenseForAccount(account.id, {
          privateKeyPem: signing.privateKeyPem,
          keyVersion: signing.keyVersion,
        });
      }
      content = (
        <AccountDashboard
          email={account.email}
          plan={license.tier}
          seatCount={license.seatCount}
          licenseKey={license.licenseKey}
          renewsAt={license.renewsAt}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 md:px-8 py-16 md:py-20">{content}</main>
      <Footer />
    </div>
  );
}
