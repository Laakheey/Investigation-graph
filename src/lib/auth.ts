// =============================================================================
// Authentication & Multi-Tenant Session Management (Server-side)
// -----------------------------------------------------------------------------
// Uses @auth0/nextjs-auth0 v4 SDK with dynamic Guest Demo Mode support.
// Respects process.env.ALLOW_GUEST_READ for read operations.
// Strict mutation guards enforce real authenticated sessions.
// =============================================================================

import { auth0 } from "./auth0";
import type { NextRequest } from "next/server";
import type { AuthContext, WorkspaceRole } from "../types/domain";

export class UnauthorizedError extends Error {
  code: string;
  constructor(
    message = "Missing or invalid authorization session",
    code = "AUTH_REQUIRED",
  ) {
    super(message);
    this.name = "UnauthorizedError";
    this.code = code;
  }
}

export class ForbiddenError extends Error {
  code: string;
  constructor(
    message = "Insufficient permissions for this action",
    code = "FORBIDDEN",
  ) {
    super(message);
    this.name = "ForbiddenError";
    this.code = code;
  }
}

// Custom Auth0 Action claim namespace
const NS = "https://ebrr.app";

/**
 * Derives AuthContext from Auth0 session or returns GuestSession if demo mode is enabled.
 */
export async function getAuthenticatedUserOrGuest(
  req?: NextRequest,
): Promise<AuthContext> {
  let session = null;
  try {
    if (req) {
      session = await auth0.getSession(req);
    } else {
      session = await auth0.getSession();
    }
    console.log("session", session);
  } catch (sessionErr: any) {
    console.error(
      "[AUTH0 SESSION EXTRACTION ERROR]:",
      sessionErr?.message || sessionErr,
    );
    // If called with req and it failed, attempt fallback to next/headers cookies
    if (req) {
      try {
        session = await auth0.getSession();
      } catch (fallbackErr: any) {
        console.error(
          "[AUTH0 getSession FALLBACK ERROR]:",
          fallbackErr?.message || fallbackErr,
        );
      }
    }
  }

  if (session?.user) {
    const u = session.user;

    const tenantId: string =
      (u[`${NS}/tenantId`] as string) ||
      (u.org_id as string) ||
      `tenant-${(u.sub ?? "").split("|")[1]?.slice(0, 8) ?? "default"}`;

    const tenantName: string =
      (u[`${NS}/tenantName`] as string) ||
      u.email?.split("@")[1]?.split(".")[0] ||
      "My Organization";

    const roles: string[] = (u[`${NS}/roles`] as string[]) || ["investigator"];

    const role: WorkspaceRole =
      roles.includes("admin") || roles.includes("OWNER")
        ? "OWNER"
        : roles.includes("EDITOR")
          ? "EDITOR"
          : "VIEWER";

    return {
      userId: u.sub ?? "unknown",
      email: u.email ?? undefined,
      name: u.name ?? u.nickname ?? u.email ?? "User",
      picture: u.picture,
      tenantId,
      tenantName,
      roles,
      role,
      isGuest: false,
      permissions: [
        "read:investigations",
        "write:investigations",
        "read:graph",
        "write:graph",
      ],
    };
  }

  // ── Mutation Request Gatekeeping ──────────────────────────────────────────
  // Mutation operations (POST, PUT, DELETE, PATCH) MUST NOT silently fall back
  // to guest mode. They must immediately reject with 401 Unauthorized.
  const isMutation = req?.method
    ? ["POST", "PUT", "DELETE", "PATCH"].includes(req.method.toUpperCase())
    : false;

  if (isMutation) {
    throw new UnauthorizedError(
      "Authentication required. Please sign in to create or edit data.",
      "AUTH_REQUIRED",
    );
  }

  // ── Guest Demo Mode Gatekeeping (Read-Only) ───────────────────────────────
  const isGuestAllowed =
    process.env.ALLOW_GUEST_READ === "true" ||
    process.env.NODE_ENV === "development";

  if (isGuestAllowed) {
    return {
      userId: "guest_user",
      name: "Guest Investigator",
      email: undefined,
      tenantId: "tenant-alpha-compliance",
      tenantName: "EBRR Public Demo Workspace",
      roles: ["GUEST_VIEWER"],
      role: "GUEST_VIEWER",
      isGuest: true,
      permissions: ["read:investigations", "read:graph"],
    };
  }

  throw new UnauthorizedError(
    "Authentication required. Please sign in.",
    "AUTH_REQUIRED",
  );
}

/**
 * Enforces that the caller is a real, authenticated user (not a guest).
 * Must be called on all mutation operations (POST/PUT/DELETE).
 */
export function requireAuthenticatedUser(auth: AuthContext): void {
  if (
    auth.isGuest ||
    auth.role === "GUEST_VIEWER" ||
    auth.userId === "guest_user"
  ) {
    throw new UnauthorizedError(
      "Sign in to create or edit data.",
      "AUTH_REQUIRED",
    );
  }
}

/**
 * RBAC Role Check for operations (OWNER, EDITOR, VIEWER)
 */
export function requireRole(auth: AuthContext, ...allowed: string[]): void {
  requireAuthenticatedUser(auth);
  if (
    !allowed.some((role) => auth.roles.includes(role) || auth.role === role)
  ) {
    throw new ForbiddenError(
      `Action requires one of roles: ${allowed.join(", ")}`,
    );
  }
}

// Backwards-compatible alias
export const getAuthContext = getAuthenticatedUserOrGuest;

// Keep legacy exports
export { SESSION_COOKIE_NAME, DEMO_ACCOUNTS } from "./authConstants";
