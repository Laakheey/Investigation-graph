// =============================================================================
// API/Controller Layer — /api/graph/node (POST, PUT, DELETE)
// Guarded with strict Auth0 authentication requirements.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserOrGuest, requireAuthenticatedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { CreateNodeSchema, UpdateNodeSchema } from "@/types/api";
import { graphServiceSingleton } from "@/services/graphService";
import type { ApiResponse } from "@/types/api";
import type { GraphNode } from "@/types/domain";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GraphNode>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const body = await req.json();
    const parsed = CreateNodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid node payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const created = await graphServiceSingleton.createNode(
      auth.tenantId,
      auth.userId,
      parsed.data,
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
        error: { code: "INTERNAL_ERROR", message: "Failed to create node" },
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<{ node: GraphNode; hasConflict: boolean }>>> {
  try {
    const auth = await getAuthenticatedUserOrGuest(req);
    requireAuthenticatedUser(auth);

    const body = await req.json();
    const { id, positionOnly, ...rest } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Missing required node id" },
        },
        { status: 400 },
      );
    }

    // Fast position sync path
    if (positionOnly && rest.position && rest.workspaceId) {
      await graphServiceSingleton.updateNodePosition(
        auth.tenantId,
        rest.workspaceId,
        id,
        rest.position,
        auth.userId,
      );
      return NextResponse.json(
        {
          success: true,
          data: { node: { id, position: rest.position } as GraphNode, hasConflict: false },
        },
        { status: 200 },
      );
    }

    const parsed = UpdateNodeSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid update payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await graphServiceSingleton.updateNode(
      auth.tenantId,
      parsed.data.workspaceId,
      id,
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
        error: { code: "INTERNAL_ERROR", message: "Failed to update node" },
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
    const { id, workspaceId } = body;

    if (!id || !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing node id or workspaceId",
          },
        },
        { status: 400 },
      );
    }

    const deleted = await graphServiceSingleton.deleteNode(
      auth.tenantId,
      workspaceId,
      id,
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
        error: { code: "INTERNAL_ERROR", message: "Failed to delete node" },
      },
      { status: 500 },
    );
  }
}
