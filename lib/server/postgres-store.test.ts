import { describe, expect, it, vi } from "vitest";
import { PostgresStore } from "./postgres-store";

function createSqlStub(results: unknown[][]) {
  const calls: string[] = [];
  const sql = vi.fn((strings: TemplateStringsArray) => {
    calls.push(strings.join("?"));
    return Promise.resolve(results.shift() ?? []);
  }) as unknown as ReturnType<typeof vi.fn> & { calls: string[]; json: (value: unknown) => unknown };
  sql.calls = calls;
  sql.json = (value: unknown) => value;
  return sql;
}

describe("PostgresStore", () => {
  it("links a first-time Clerk login to an existing account with the same email", async () => {
    const now = new Date("2026-05-18T00:00:00.000Z");
    const sql = createSqlStub([
      [],
      [
        {
          id: "acct_existing",
          clerk_user_id: "user_github",
          email: "buyer@example.com",
          created_at: now,
          updated_at: now,
        },
      ],
    ]);
    const store = new PostgresStore(sql as never);

    const account = await store.upsertAccount({
      clerkUserId: "user_github",
      email: "Buyer@Example.com",
    });

    expect(account).toMatchObject({
      id: "acct_existing",
      clerkUserId: "user_github",
      email: "buyer@example.com",
    });
    expect(sql.calls[0]).toContain("SELECT * FROM accounts WHERE clerk_user_id");
    expect(sql.calls[1]).toContain("ON CONFLICT (email) DO UPDATE SET");
    expect(sql.calls[1]).toContain("clerk_user_id = EXCLUDED.clerk_user_id");
  });
});
