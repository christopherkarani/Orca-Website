import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PricingPage from "./page";

describe("pricing page rendering", () => {
  it("renders Free, Pro, Team, checkout CTAs, and activation flow", () => {
    const html = renderToStaticMarkup(<PricingPage />);

    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Team");
    expect(html).toContain("Start Pro checkout");
    expect(html).toContain("Start Team checkout");
    expect(html).toContain("orca license activate &lt;key&gt;");
    expect(html).not.toMatch(/cloud sync|hosted monitoring|telemetry upload/i);
  });
});
