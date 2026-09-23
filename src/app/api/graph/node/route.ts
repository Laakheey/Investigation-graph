// =============================================================================
// API/Controller Layer — /api/graph/node (Node CRUD)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth";
import { CreateNodeSchema, UpdateNodeSchema } from "@/types/api";
import { graphServiceSingleton } from "@/services/graphService";
import type { ApiResponse } from "@/types/api";
import type { GraphNode } from "@/types/domain";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GraphNode>>> {
  try {
    const auth = await getAuthContext(req);
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
    console.error("[/api/graph/node POST] Error:", err);
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
): Promise<NextResponse<ApiResponse<GraphNode | { success: boolean }>>> {
  try {
    const auth = await getAuthContext(req);
    const body = await req.json();

    const nodeId = req.nextUrl.searchParams.get("nodeId") || body.nodeId;
    if (!nodeId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Missing nodeId parameter" },
        },
        { status: 400 },
      );
    }

    // Check if position only update
    if (body.position && Object.keys(body).length <= 3 && body.workspaceId) {
      await graphServiceSingleton.updateNodePosition(
        auth.tenantId,
        body.workspaceId,
        nodeId,
        body.position,
      );
      return NextResponse.json(
        { success: true, data: { success: true } },
        { status: 200 },
      );
    }

    const parsed = UpdateNodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid node update payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const updated = await graphServiceSingleton.updateNode(
      auth.tenantId,
      parsed.data.workspaceId,
      nodeId,
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
    const auth = await getAuthContext(req);
    const nodeId = req.nextUrl.searchParams.get("nodeId");
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!nodeId || !workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing nodeId or workspaceId",
          },
        },
        { status: 400 },
      );
    }

    const deleted = await graphServiceSingleton.deleteNode(
      auth.tenantId,
      workspaceId,
      nodeId,
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
        error: { code: "INTERNAL_ERROR", message: "Failed to delete node" },
      },
      { status: 500 },
    );
  }
}
