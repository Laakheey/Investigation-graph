// =============================================================================
// API Route — GET / POST /api/investigations/[investigationId]/members
// Workspace membership and RBAC role assignments.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserOrGuest, requireAuthenticatedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { collaborationServiceSingleton } from "@/services/collaborationService";
import type { ApiResponse, WorkspaceMember, WorkspacePermissions } from "@/types/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { investigationId: string } },
): Promise<NextResponse<ApiResponse<{ members: WorkspaceMember[]; permissions: WorkspacePermissions }>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    const { investigationId } = params;

    const [members, permissions] = await Promise.all([
      collaborationServiceSingleton.listWorkspaceMembers(auth.tenantId, investigationId),
      collaborationServiceSingleton.getUserPermissions(auth.tenantId, investigationId, auth.userId, auth.isGuest),
    ]);

    return NextResponse.json({ success: true, data: { members, permissions } }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: err.code || "AUTH_REQUIRED", message: err.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list workspace members" } },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { investigationId: string } },
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const { investigationId } = params;
    const body = await req.json();
    const { userId, role, name, email } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing userId or role" } },
        { status: 400 },
      );
    }

    const perms = await collaborationServiceSingleton.getUserPermissions(
      auth.tenantId,
      investigationId,
      auth.userId,
    );

    if (!perms.canAdmin && !perms.canInvite) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to manage members" } },
        { status: 403 },
      );
    }

    await collaborationServiceSingleton.addMemberToWorkspace(
      auth.tenantId,
      investigationId,
      userId,
      role,
      name || "Collaborator",
      email,
    );

    return NextResponse.json({ success: true, data: { success: true } }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: err.code || "AUTH_REQUIRED", message: err.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update member" } },
      { status: 500 },
    );
  }
}
