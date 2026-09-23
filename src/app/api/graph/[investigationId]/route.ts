// =============================================================================
// API/Controller Layer — GET /api/graph/:investigationId (Redis-Cached Graph Fetch)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth";
import { graphServiceSingleton } from "@/services/graphService";
import type { ApiResponse } from "@/types/api";
import type { GraphVisualizationPayload } from "@/services/graphService";

export async function GET(
  req: NextRequest,
  { params }: { params: { investigationId: string } },
): Promise<NextResponse<ApiResponse<GraphVisualizationPayload>>> {
  try {
    const auth = await getAuthContext(req);
    const { investigationId } = params;

    const payload = await graphServiceSingleton.getGraphForInvestigation(
      auth.tenantId,
      investigationId,
    );

    return NextResponse.json({ success: true, data: payload }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: err.message },
        },
        { status: 401 },
      );
    }
    console.error("[/api/graph/:id GET] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch graph data",
        },
      },
      { status: 500 },
    );
  }
}
