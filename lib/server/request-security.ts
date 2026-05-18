import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, isProductionRuntime } from "./env";

function configuredAllowedOrigins(request: NextRequest): Set<string> {
  if (!isProductionRuntime()) return new Set([request.nextUrl.origin, getBaseUrl()]);
  const origins = new Set([getBaseUrl()]);
  for (const origin of (process.env.ORCA_ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed.replace(/\/$/, ""));
  }
  return origins;
}

export function rejectInvalidOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    return isProductionRuntime()
      ? NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
      : null;
  }

  try {
    const allowedOrigins = configuredAllowedOrigins(request);
    if (allowedOrigins.has(new URL(origin).origin)) return null;
  } catch {
    // Fall through to the generic rejection.
  }

  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
}
