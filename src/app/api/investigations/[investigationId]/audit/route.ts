// =============================================================================
// API Route — GET /api/investigations/[investigationId]/audit
// Retrieves temporal audit trail for an investigation or specific entity.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserOrGuest, UnauthorizedError } from "@/lib/auth";
import { auditServiceSingleton } from "@/services/auditService";
import type { ApiResponse, AuditActionRecord } from "@/types/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { investigationId: string } },
): Promise<NextResponse<ApiResponse<AuditActionRecord[]>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    const { investigationId } = params;
    const url = new URL(req.url);
    const entityId = url.searchParams.get("entityId");

    let records: AuditActionRecord[] = [];

    if (entityId) {
      records = await auditServiceSingleton.getEntityAuditTrail(
        auth.tenantId,
        entityId,
      );
    } else {
      records = await auditServiceSingleton.getWorkspaceAuditLog(
        auth.tenantId,
        investigationId,
        100,
      );
    }

    return NextResponse.json({ success: true, data: records }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: err.code || "AUTH_REQUIRED", message: err.message } },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to retrieve audit log" } },
      { status: 500 },
    );
  }
}
