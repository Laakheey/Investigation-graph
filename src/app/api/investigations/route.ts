// =============================================================================
// API/Controller Layer — /api/investigations (Investigation CRUD)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "@/lib/auth";
import { CreateInvestigationSchema } from "@/types/api";
import { investigationServiceSingleton } from "@/services/investigationService";
import type { ApiResponse } from "@/types/api";
import type { Investigation } from "@/types/domain";

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<Investigation[]>>> {
  try {
    const auth = await getAuthContext(req);
    const investigations =
      await investigationServiceSingleton.listInvestigations(auth.tenantId);
    return NextResponse.json(
      { success: true, data: investigations },
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
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch investigations",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<Investigation>>> {
  try {
    const auth = await getAuthContext(req);
    const body = await req.json();

    const parsed = CreateInvestigationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid investigation payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const created = await investigationServiceSingleton.createInvestigation(
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
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create investigation",
        },
      },
      { status: 500 },
    );
  }
}
