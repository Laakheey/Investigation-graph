// =============================================================================
// API Route — POST /api/investigations/[investigationId]/invite
// Generates and processes workspace email invitation tokens.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserOrGuest, requireAuthenticatedUser, UnauthorizedError } from "@/lib/auth";
import { InviteMemberSchema, AcceptInviteSchema } from "@/types/api";
import { collaborationServiceSingleton } from "@/services/collaborationService";
import type { ApiResponse, WorkspaceInvite } from "@/types/api";

export async function POST(
  req: NextRequest,
  { params }: { params: { investigationId: string } },
): Promise<NextResponse<ApiResponse<WorkspaceInvite | { workspaceId: string }>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    const { investigationId } = params;
    const body = await req.json();

    // Check if accepting an invite
    if (body.token) {
      requireAuthenticatedUser(auth);
      const parsed = AcceptInviteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Invalid token" } },
          { status: 400 },
        );
      }

      const result = await collaborationServiceSingleton.acceptWorkspaceInvite(
        parsed.data.token,
        auth.userId,
        auth.name,
        auth.email,
      );

      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    // Creating an invitation
    requireAuthenticatedUser(auth);
    const parsed = InviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid invitation payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const perms = await collaborationServiceSingleton.getUserPermissions(
      auth.tenantId,
      investigationId,
      auth.userId,
    );

    if (!perms.canInvite && !perms.canAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to invite users." } },
        { status: 403 },
      );
    }

    const invite = await collaborationServiceSingleton.createWorkspaceInvite(
      auth.tenantId,
      investigationId,
      auth.userId,
      parsed.data.email,
      parsed.data.role,
    );

    return NextResponse.json({ success: true, data: invite }, { status: 201 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: err.code || "AUTH_REQUIRED", message: err.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to process invitation" } },
      { status: 500 },
    );
  }
}
