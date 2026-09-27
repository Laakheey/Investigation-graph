// =============================================================================
// API Route — POST /api/investigations/[investigationId]/conflict/resolve
// Resolves concurrent visual conflicts using 3-way merge resolutions.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserOrGuest, requireAuthenticatedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { ResolveConflictSchema } from "@/types/api";
import { auditServiceSingleton } from "@/services/auditService";
import { cacheServiceSingleton } from "@/services/cacheService";
import type { ApiResponse } from "@/types/api";

export async function POST(
  req: NextRequest,
  { params }: { params: { investigationId: string } },
): Promise<NextResponse<ApiResponse<{ resolved: boolean }>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const { investigationId } = params;
    const body = await req.json();

    const parsed = ResolveConflictSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid conflict resolution payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const { entityId, entityType, resolvedFields, resolutionComment } = parsed.data;

    await auditServiceSingleton.resolveConflict(
      auth.tenantId,
      investigationId,
      entityId,
      entityType,
      resolvedFields,
      auth.userId,
      auth.name,
      resolutionComment,
    );

    await cacheServiceSingleton.invalidateInvestigationGraph(auth.tenantId, investigationId);

    return NextResponse.json({ success: true, data: { resolved: true } }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: err.code || "AUTH_REQUIRED", message: err.message } },
        { status: 401 },
      );
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, error: { code: err.code || "FORBIDDEN", message: err.message } },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to resolve conflict" } },
      { status: 500 },
    );
  }
}
