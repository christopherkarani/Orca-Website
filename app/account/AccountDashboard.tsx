import { LicenseCopyButton } from "./LicenseCopyButton";

export function AccountDashboard({
  email,
  plan,
  seatCount,
  licenseKey,
  renewsAt,
}: {
  email: string;
  plan: "free" | "pro" | "team";
  seatCount: number;
  licenseKey: string;
  renewsAt?: string;
}) {
  const planLabel = plan === "team" ? "Orca Team" : plan === "pro" ? "Orca Pro" : "Orca Free";
  const seatsLabel = plan === "team" ? `${seatCount} ${seatCount === 1 ? "seat" : "seats"}` : "1 seat";
  const activationCommand = `orca license activate ${licenseKey}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="border border-neutral-200 bg-white p-6">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
          CURRENT PLAN
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{planLabel}</h1>
        <p className="mt-3 text-sm text-neutral-500">{email}</p>
        <p className="mt-2 text-sm text-neutral-500">{seatsLabel}</p>
        {renewsAt && (
          <p className="mt-2 text-sm text-neutral-500">
            Renews {new Date(renewsAt).toLocaleDateString("en-US")}
          </p>
        )}
        <form action="/api/billing/portal" method="post" className="mt-6">
          <button
            type="submit"
            className="inline-flex bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Manage billing
          </button>
        </form>
      </section>

      <aside className="border border-neutral-200 bg-neutral-50 p-6">
        <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
          LOCAL-FIRST BOUNDARY
        </p>
        <p className="text-sm text-neutral-600 leading-relaxed">
          Policies, audit logs, and replay files stay local unless you choose to move
          them. The license is verified by the local CLI with an embedded public key.
        </p>
      </aside>

      <section className="lg:col-span-2 border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
              LICENSE
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Signed license key</h2>
            <p className="mt-3 text-sm text-neutral-500">
              Copy this key into the local Orca CLI. Orca does not call the website at
              runtime.
            </p>
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
              Treat the license key like a secret: it contains account identity and
              entitlement data inside the signed payload.
            </p>
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
              Rotation issues a fresh key for this account. Already copied offline keys
              remain cryptographically valid until their embedded expiry.
            </p>
          </div>
          <form action="/api/account/license/rotate" method="post">
            <button
              type="submit"
              className="border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              Rotate license
            </button>
          </form>
        </div>
        <pre className="mt-6 overflow-x-auto border border-neutral-200 bg-neutral-950 p-4 text-xs text-white">
          {licenseKey}
        </pre>
        <div className="mt-5">
          <p className="text-sm font-medium text-neutral-900">Activation command</p>
          <pre className="mt-2 overflow-x-auto border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-900">
            {activationCommand}
          </pre>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <LicenseCopyButton licenseKey={licenseKey} />
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify({ licenseKey }, null, 2)
            )}`}
            download="orca-license.json"
            className="border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            Download license
          </a>
          <a
            href="/docs#activation"
            className="border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            Activation docs
          </a>
        </div>
      </section>
    </div>
  );
}
