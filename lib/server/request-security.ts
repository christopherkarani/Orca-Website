import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, isProductionRuntime } from "./env";

export function rejectInvalidOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    return isProductionRuntime()
      ? NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
      : null;
  }

  try {
    const allowedOrigins = new Set([request.nextUrl.origin, getBaseUrl()]);
    if (allowedOrigins.has(new URL(origin).origin)) return null;
  } catch {
    // Fall through to the generic rejection.
  }

  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
}
