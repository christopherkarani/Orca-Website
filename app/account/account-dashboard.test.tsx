import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountDashboard } from "./AccountDashboard";

describe("account dashboard rendering", () => {
  it("shows plan, license, activation command, and billing portal action", () => {
    const html = renderToStaticMarkup(
      <AccountDashboard
        email="buyer@example.com"
        plan="pro"
        seatCount={1}
        licenseKey="orca_payload.signature"
        renewsAt="2026-06-17T00:00:00.000Z"
        apiKeys={[]}
      />
    );

    expect(html).toContain("Orca Pro");
    expect(html).toContain("orca license activate orca_payload.signature");
    expect(html).toContain("Manage billing");
    expect(html).toContain("Policies, audit logs, and replay files stay local");
    expect(html).toContain("Treat the license key like a secret");
    expect(html).toContain("remain cryptographically valid until their embedded expiry");
  });

  it("shows Team seat count", () => {
    const html = renderToStaticMarkup(
      <AccountDashboard
        email="team@example.com"
        plan="team"
        seatCount={7}
        licenseKey="orca_payload.signature"
        apiKeys={[]}
      />
    );

    expect(html).toContain("Orca Team");
    expect(html).toContain("7 seats");
  });
});
