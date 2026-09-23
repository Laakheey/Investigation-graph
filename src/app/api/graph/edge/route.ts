// =============================================================================
// API/Controller Layer — /api/graph/edge (Artifact 4 — Edge Management Endpoint)
// -----------------------------------------------------------------------------
// SOLID:
// - Single Responsibility Principle (SRP): Handles Auth0 session extraction,
//   Zod schema validation, and standardized HTTP response formatting.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { CreateEdgeSchema, UpdateEdgeSchema } from "@/types/api";
import { graphServiceSingleton } from "@/services/graphService";
import type { ApiResponse } from "@/types/api";
import type { GraphEdge } from "@/types/domain";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GraphEdge>>> {
  try {
    // 1. Auth0 Session & Tenant Context Verification
    const auth = await getAuthContext(req);

    // 2. Request Payload Validation with Zod
    const body = await req.json();
    const parsed = CreateEdgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid edge creation payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    if (parsed.data.sourceId === parsed.data.targetId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Source and Target nodes must be distinct",
          },
        },
        { status: 400 },
      );
    }

    // 3. Delegate to Business Service Layer
    const created = await graphServiceSingleton.createEdge(
      auth.tenantId,
      parsed.data,
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
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
    console.error("[/api/graph/edge POST] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create edge" },
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GraphEdge>>> {
  try {
    const auth = await getAuthContext(req);
    const body = await req.json();

    const relId = req.nextUrl.searchParams.get("relId") || body.relId;
    if (!relId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Missing relId parameter" },
        },
        { status: 400 },
      );
    }

    const parsed = UpdateEdgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid edge update payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const updated = await graphServiceSingleton.updateEdge(
      auth.tenantId,
      parsed.data.workspaceId,
      relId,
      parsed.data,
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
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
    console.error("[/api/graph/edge PUT] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update edge" },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const auth = await getAuthContext(req);
    const relId = req.nextUrl.searchParams.get("relId");
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!relId || !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing relId or workspaceId",
          },
        },
        { status: 400 },
      );
    }

    const deleted = await graphServiceSingleton.deleteEdge(
      auth.tenantId,
      workspaceId,
      relId,
    );
    return NextResponse.json(
      { success: true, data: { deleted } },
      { status: 200 },
    );
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
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to delete edge" },
      },
      { status: 500 },
    );
  }
}
