import type { Metadata } from "next";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { unstable_noStore as noStore } from "next/cache";
import { AccountDashboard } from "./AccountDashboard";
import { Footer } from "../_components/Footer";
import { Nav } from "../_components/Nav";
import { getAccountFromClerk, getClerkUserId } from "@/lib/server/auth";
import { getStore } from "@/lib/server/db";
import { getLicenseSigningConfig } from "@/lib/server/env";

export const metadata: Metadata = {
  title: "Account - Orca",
  description: "View your Orca plan, signed license, activation command, and billing portal.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function LoginPanel() {
  return (
    <section className="mx-auto max-w-xl border border-neutral-200 bg-white p-6">
      <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
        ACCOUNT ACCESS
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">View your Orca license</h1>
      <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
        Sign in with GitHub or email through Clerk. Orca stores billing and license
        records, but Clerk handles human account security and recovery.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <SignInButton mode="modal">
          <button className="bg-black px-5 py-3 text-sm font-medium text-white">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-950">
            Create account
          </button>
        </SignUpButton>
        <a
          href="/pricing"
          className="inline-flex items-center justify-center border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-950"
        >
          Choose a plan
        </a>
      </div>
    </section>
  );
}

export default async function AccountPage() {
  noStore();
  const clerkUserId = await getClerkUserId();

  let content: React.ReactNode = <LoginPanel />;
  if (clerkUserId) {
    const store = getStore();
    const account = await getAccountFromClerk(store);
    if (account) {
      let license = await store.getCurrentLicenseForAccount(account.id);
      if (!license) {
        const signing = getLicenseSigningConfig();
        license = await store.issueLicenseForAccount(account.id, {
          privateKeyPem: signing.privateKeyPem,
          keyVersion: signing.keyVersion,
        });
      }
      const apiKeys = await store.listApiKeys(account.id);
      content = (
        <div className="space-y-6">
          <div className="flex justify-end">
            <UserButton />
          </div>
          <AccountDashboard
            email={account.email}
            plan={license.tier}
            seatCount={license.seatCount}
            licenseKey={license.licenseKey}
            renewsAt={license.renewsAt}
            apiKeys={apiKeys}
          />
        </div>
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
