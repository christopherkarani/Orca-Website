import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountPage from "./page";

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div>User</div>,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null })),
  currentUser: vi.fn(async () => null),
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

    const html = renderToStaticMarkup(await AccountPage());

    expect(html).toContain("View your Orca license");
    expect(html).toContain("Sign in");
    expect(html).toContain("Create account");
    expect(html).toContain("Choose a plan");
  });
});
