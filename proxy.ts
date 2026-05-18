import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function shouldDisableCache(pathname: string): boolean {
  return pathname === "/account" || pathname.startsWith("/account/") || pathname.startsWith("/api/");
}

export default clerkMiddleware((_auth, request) => {
  const response = NextResponse.next();
  if (shouldDisableCache(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
