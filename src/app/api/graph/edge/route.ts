// =============================================================================
// API/Controller Layer — /api/graph/edge (POST, PUT, DELETE)
// Guarded with strict Auth0 authentication requirements.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserOrGuest, requireAuthenticatedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { CreateEdgeSchema, UpdateEdgeSchema } from "@/types/api";
import { graphServiceSingleton } from "@/services/graphService";
import type { ApiResponse } from "@/types/api";
import type { GraphEdge } from "@/types/domain";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GraphEdge>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const body = await req.json();
    const parsed = CreateEdgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid edge payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const created = await graphServiceSingleton.createEdge(
      auth.tenantId,
      parsed.data,
      auth.userId,
      auth.name,
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
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
): Promise<NextResponse<ApiResponse<{ edge: GraphEdge; hasConflict: boolean }>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const body = await req.json();
    const { relId, ...rest } = body;

    if (!relId || typeof relId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing required relationship relId",
          },
        },
        { status: 400 },
      );
    }

    const parsed = UpdateEdgeSchema.safeParse(rest);
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

    const result = await graphServiceSingleton.updateEdge(
      auth.tenantId,
      parsed.data.workspaceId,
      relId,
      parsed.data,
      auth.userId,
      auth.name,
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
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
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const body = await req.json();
    const { relId, workspaceId } = body;

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
      auth.userId,
      auth.name,
    );

    return NextResponse.json({ success: true, data: { deleted } }, { status: 200 });
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
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to delete edge" },
      },
      { status: 500 },
    );
  }
}
