import { afterEach, describe, expect, it } from "vitest";
import { getStore, setStoreForTests } from "./db";

describe("store selection", () => {
  const originalRuntimeEnv = process.env.ORCA_RUNTIME_ENV;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.ORCA_RUNTIME_ENV = originalRuntimeEnv;
    process.env.DATABASE_URL = originalDatabaseUrl;
    setStoreForTests(undefined);
  });

  it("fails closed without DATABASE_URL in production", () => {
    process.env.ORCA_RUNTIME_ENV = "production";
    delete process.env.DATABASE_URL;

    expect(() => getStore()).toThrow("DATABASE_URL is required in production");
  });
});
