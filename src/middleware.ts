// =============================================================================
// Next.js Middleware — Auth0 v4 Route Protection & Guest Demo Gatekeeper
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Let Auth0 SDK handle its internal routes (/auth/login, /auth/callback, /auth/logout)
  if (pathname.startsWith('/auth/')) {
    return await auth0.middleware(request);
  }

  // ── 1. Mutation API Guard ───────────────────────────────────────────────────
  // All POST/PUT/DELETE/PATCH mutations on /api/* require authenticated sessions.
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  const isApiRoute = pathname.startsWith('/api/');

  // Public health check exception
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Check for Auth0 session cookie or Bearer token
  const hasSession =
    request.cookies.has('appSession') ||
    request.cookies.has('auth0.is.authenticated') ||
    request.headers.has('authorization');

  if (isApiRoute && isMutation && !hasSession) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Sign in to create or edit data.',
        },
      },
      { status: 401 }
    );
  }

  // ── 2. Read Route Gatekeeping (ALLOW_GUEST_READ) ────────────────────────────
  const allowGuestRead = process.env.ALLOW_GUEST_READ === 'true' || process.env.NODE_ENV === 'development';

  if (!allowGuestRead && !hasSession) {
    // If guest read is disabled and user has no session, redirect to login
    if (!isApiRoute && pathname !== '/login' && pathname !== '/signup' && pathname !== '/') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Delegate rolling session updates to Auth0 middleware
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
};
