// =============================================================================
// API/Controller Layer — POST /api/graph/import
// Asynchronous Bulk Graph Processing via BullMQ
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, UnauthorizedError } from "@/lib/auth";
import { enqueueGraphImport } from "@/workers/graphImportWorker";
import type { ApiResponse } from "@/types/api";

const BulkImportSchema = z.object({
  workspaceId: z.string(),
  nodes: z
    .array(
      z.object({
        label: z.string().min(1),
        nodeType: z.string().optional(),
        status: z.any().optional(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        citationsCount: z.number().optional(),
        properties: z
          .record(z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
        position: z.object({ x: z.number(), y: z.number() }).optional(),
      }),
    )
    .default([]),
  relationships: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        targetId: z.string().min(1),
        type: z.string().optional(),
        label: z.string().optional(),
        directionality: z.any().optional(),
        lineStyle: z.any().optional(),
        strokeColor: z.string().optional(),
        weight: z.number().optional(),
        properties: z
          .record(z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
      }),
    )
    .default([]),
});

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<{ jobId: string; message: string }>>> {
  try {
    const auth = await getAuthContext(req);

    const body = await req.json();
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid payload structure",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const { workspaceId, nodes, relationships } = parsed.data;

    if (nodes.length === 0 && relationships.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message:
              "Import payload must contain at least one node or relationship",
          },
        },
        { status: 400 },
      );
    }

    // Enqueue async job in BullMQ
    const jobId = await enqueueGraphImport({
      tenantId: auth.tenantId,
      userId: auth.userId,
      workspaceId,
      nodes: nodes.map((n) => ({ ...n })),
      relationships: relationships.map((r) => ({ ...r })),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobId,
          message: `Enqueued batch import of ${nodes.length} nodes and ${relationships.length} relationships.`,
        },
      },
      { status: 202 }, // 202 Accepted
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
    console.error("[api/graph/import] unhandled error", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to enqueue import job",
        },
      },
      { status: 500 },
    );
  }
}
