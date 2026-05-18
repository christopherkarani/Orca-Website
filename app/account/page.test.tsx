import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
  })),
}));

describe("account page rendering", () => {
  const originalRuntime = process.env.ORCA_RUNTIME_ENV;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.ORCA_RUNTIME_ENV = originalRuntime;
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("renders the unauthenticated account access panel without requiring the database", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    delete process.env.DATABASE_URL;

    const html = renderToStaticMarkup(
      await AccountPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("View your Orca license");
    expect(html).toContain("Send account link");
    expect(html).toContain("Choose a plan");
  });
});
