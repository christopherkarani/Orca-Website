import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { createAccountApiKey } from "@/lib/server/auth";
import { setStoreForTests } from "@/lib/server/db";
import { createMemoryStore } from "@/lib/server/memory-store";
import { GET } from "./route";

describe("GET /api/account/plan", () => {
  afterEach(() => {
    setStoreForTests(undefined);
  });

  it("returns plan-safe data for a scoped API key", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    const account = await store.upsertAccount({
      id: "acct_plan",
      email: "plan@example.com",
    });
    await store.upsertSubscription({
      accountId: account.id,
      customerId: "cus_plan",
      stripeSubscriptionId: "sub_plan",
      tier: "team",
      status: "active",
      seatCount: 3,
      currentPeriodEnd: "2026-06-17T00:00:00.000Z",
    });
    const { rawKey } = await createAccountApiKey(store, account.id, "CI");

    const response = await GET(
      new NextRequest("https://orca-tx.com/api/account/plan", {
        headers: { authorization: `Bearer ${rawKey}` },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan).toMatchObject({
      tier: "team",
      seatCount: 3,
      status: "active",
    });
    expect(JSON.stringify(body)).not.toContain("licenseKey");
    expect(JSON.stringify(body)).not.toContain("plan@example.com");
    expect(JSON.stringify(body)).not.toContain("cus_plan");
  });

  it("rejects API keys without plan scope", async () => {
    const store = createMemoryStore();
    setStoreForTests(store);
    const account = await store.upsertAccount({
      id: "acct_plan_scope",
      email: "plan-scope@example.com",
    });
    const { rawKey } = await createAccountApiKey(store, account.id, "Read only", [
      "license:read",
    ]);

    const response = await GET(
      new NextRequest("https://orca-tx.com/api/account/plan", {
        headers: { authorization: `Bearer ${rawKey}` },
      })
    );

    expect(response.status).toBe(401);
  });
});
