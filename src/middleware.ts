// =============================================================================
// Next.js Middleware — Auth0 v4 Route Protection
// auth0.middleware() handles:
//   GET /auth/login     → redirect to Auth0 Universal Login
//   GET /auth/callback  → exchange code for session cookie
//   GET /auth/logout    → clear session, redirect to Auth0 logout
//   All other routes    → rolling session refresh (if session exists)
// =============================================================================

import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     *
     * Note: The broad matcher is required for rolling sessions to work correctly.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
