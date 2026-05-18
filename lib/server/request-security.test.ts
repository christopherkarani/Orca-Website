import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { rejectInvalidOrigin } from "./request-security";

describe("browser request origin guard", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("allows same-origin browser posts", () => {
    const response = rejectInvalidOrigin(
      new NextRequest("https://orca-tx.com/api/account/license/rotate", {
        method: "POST",
        headers: { origin: "https://orca-tx.com" },
      })
    );

    expect(response).toBeNull();
  });

  it("rejects cross-site browser posts", async () => {
    const response = rejectInvalidOrigin(
      new NextRequest("https://orca-tx.com/api/account/license/rotate", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      })
    );

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      error: "Invalid request origin",
    });
  });

  it("rejects missing Origin headers in production", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    const response = rejectInvalidOrigin(
      new NextRequest("https://orca-tx.com/api/account/license/rotate", {
        method: "POST",
      })
    );

    expect(response?.status).toBe(403);
  });

  it("does not trust the request host as an allowed production origin", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_SITE_URL = "https://orca-tx.com";

    const response = rejectInvalidOrigin(
      new NextRequest("https://preview.example/api/account/license/rotate", {
        method: "POST",
        headers: { origin: "https://preview.example" },
      })
    );

    expect(response?.status).toBe(403);
  });

  it("allows explicitly configured additional production origins", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    process.env.ORCA_SITE_URL = "https://orca-tx.com";
    process.env.ORCA_ALLOWED_ORIGINS = "https://admin.orca-tx.com";

    const response = rejectInvalidOrigin(
      new NextRequest("https://preview.example/api/account/license/rotate", {
        method: "POST",
        headers: { origin: "https://admin.orca-tx.com" },
      })
    );

    expect(response).toBeNull();
  });
});
