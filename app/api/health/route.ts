import { NextResponse } from "next/server";
import { isProductionRuntime } from "@/lib/server/env";
import { assessProductionReadiness } from "@/lib/server/readiness";

export async function GET() {
  const report = assessProductionReadiness();
  const production = isProductionRuntime();

  return NextResponse.json(
    production
      ? {
          status: report.ok ? "ready" : "blocked",
          production,
        }
      : {
          status: report.ok ? "ready" : "development",
          production,
          checks: report.checks.map((check) => ({
            name: check.name,
            ok: check.ok,
            message: check.message,
          })),
        },
    { status: report.ok || !production ? 200 : 503 }
  );
}
