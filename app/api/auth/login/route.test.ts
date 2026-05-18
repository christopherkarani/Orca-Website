import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/server/memory-store";
import { setStoreForTests } from "@/lib/server/db";
import { POST } from "./route";

describe("POST /api/auth/login", () => {
  const originalRuntimeEnv = process.env.ORCA_RUNTIME_ENV;

  afterEach(() => {
    process.env.ORCA_RUNTIME_ENV = originalRuntimeEnv;
    setStoreForTests(undefined);
  });

  it("allows direct email login only outside production", async () => {
    delete process.env.ORCA_RUNTIME_ENV;
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: new URLSearchParams({ email: "dev@example.com" }),
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toContain("orca_session=");
  });

  it("rejects direct email login in production", async () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    setStoreForTests(createMemoryStore());

    const response = await POST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: new URLSearchParams({ email: "buyer@example.com" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("disabled in production"),
    });
  });
});
