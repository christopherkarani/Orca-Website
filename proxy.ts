import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

function shouldDisableCache(pathname: string): boolean {
  return pathname === "/account" || pathname.startsWith("/account/") || pathname.startsWith("/api/");
}

function cacheControlledResponse(request: NextRequest) {
  const response = NextResponse.next();
  if (shouldDisableCache(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

const hasClerkConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export default hasClerkConfig
  ? clerkMiddleware((_auth, request) => cacheControlledResponse(request))
  : function proxy(request: NextRequest) {
      return cacheControlledResponse(request);
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
