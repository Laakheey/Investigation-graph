// =============================================================================
// Authentication & Multi-Tenant Session Management (Server-side)
// -----------------------------------------------------------------------------
// Uses @auth0/nextjs-auth0 v4 SDK (Auth0Client pattern).
// getAuthContext() is the single entry point for all API routes — same signature
// as before so no API route code needs to be modified.
//
// ── Multi-tenancy via Auth0 Action ───────────────────────────────────────────
// To attach a tenantId to every ID token, create an Auth0 Action:
//   Dashboard → Actions → Library → Create Action (Login / Post Login)
//
//   exports.onExecutePostLogin = async (event, api) => {
//     const ns = 'https://ebrr.app';
//     const tenantId = event.user.app_metadata?.tenantId
//       || `tenant-${event.user.user_id.split('|')[1]?.slice(0, 8)}`;
//     api.idToken.setCustomClaim(`${ns}/tenantId`, tenantId);
//     api.idToken.setCustomClaim(`${ns}/tenantName`, event.user.app_metadata?.tenantName || event.user.email);
//     api.idToken.setCustomClaim(`${ns}/roles`, event.authorization?.roles || ['investigator']);
//   };
//
// Then assign tenants to users via Auth0 Management API:
//   PATCH https://dev-zx3iyg52ic8j5d6a.us.auth0.com/api/v2/users/{id}
//   body: { "app_metadata": { "tenantId": "tenant-alpha-compliance", "tenantName": "Alpha Corp" } }
// =============================================================================

import { auth0 } from './auth0';
import type { NextRequest } from 'next/server';
import type { AuthContext } from '../types';

export class UnauthorizedError extends Error {
  constructor(message = 'Missing or invalid authorization session') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Custom Auth0 Action claim namespace
const NS = 'https://ebrr.app';

/**
 * Derives AuthContext from the Auth0 session attached to the current request.
 * Signature is identical to the old implementation — zero changes needed in API routes.
 */
export async function getAuthContext(_req?: NextRequest): Promise<AuthContext> {
  try {
    // auth0.getSession() reads the encrypted session cookie
    const session = await auth0.getSession();

    if (session?.user) {
      const u = session.user;

      const tenantId: string =
        (u[`${NS}/tenantId`] as string) ||
        (u.org_id as string) ||
        `tenant-${(u.sub ?? '').split('|')[1]?.slice(0, 8) ?? 'default'}`;

      const tenantName: string =
        (u[`${NS}/tenantName`] as string) ||
        u.email?.split('@')[1]?.split('.')[0] ||
        'My Organization';

      const roles: string[] =
        (u[`${NS}/roles`] as string[]) ||
        ['investigator'];

      return {
        userId: u.sub ?? 'unknown',
        email: u.email ?? undefined,
        name: u.name ?? u.nickname ?? u.email ?? 'User',
        tenantId,
        tenantName,
        roles,
        permissions: ['read:investigations', 'write:investigations'],
      };
    }
  } catch {
    // getSession() may throw outside a Next.js request context
  }

  // Development fallback — unauthenticated requests still work locally
  if (process.env.NODE_ENV === 'development') {
    return {
      userId: 'dev-user-001',
      email: 'dev@ebrr.local',
      name: 'Dev User',
      tenantId: 'tenant-dev',
      tenantName: 'Development Tenant',
      roles: ['investigator', 'admin'],
      permissions: ['read:investigations', 'write:investigations'],
    };
  }

  throw new UnauthorizedError('No active session. Please log in at /auth/login.');
}

export function requireRole(auth: AuthContext, ...allowed: string[]): void {
  if (!allowed.some((role) => auth.roles.includes(role))) {
    throw new ForbiddenError(`Requires one of roles: ${allowed.join(', ')}`);
  }
}

// Keep legacy exports so existing imports don't break
export { SESSION_COOKIE_NAME, DEMO_ACCOUNTS } from './authConstants';
