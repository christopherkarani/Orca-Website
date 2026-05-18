import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("redacts detailed readiness checks in production", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      status: "blocked",
      production: true,
    });
  });
});
