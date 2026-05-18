import postgres from "postgres";
import { isProductionRuntime } from "./env";
import { createMemoryStore } from "./memory-store";
import { PostgresStore } from "./postgres-store";
import type { OrcaStore } from "./store";

let store: OrcaStore | undefined;

export function getStore(): OrcaStore {
  if (store) return store;

  if (!process.env.DATABASE_URL) {
    if (isProductionRuntime()) {
      throw new Error("DATABASE_URL is required in production");
    }
    store = createMemoryStore();
    return store;
  }

  store = new PostgresStore(createSqlClient());
  return store;
}

export function setStoreForTests(nextStore: OrcaStore | undefined) {
  store = nextStore;
}

export function createSqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to create a Postgres client");
  }
  return postgres(url, {
    max: 5,
    ssl: process.env.POSTGRES_SSL === "false" ? false : "require",
  });
}
