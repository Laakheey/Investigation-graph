// =============================================================================
// API Route — GET /api/auth/me
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, UnauthorizedError } from "../../../../lib/auth";
import type { ApiResponse, AuthContext } from "../../../../types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<AuthContext>>> {
  try {
    const auth = await getAuthContext(req);
    return NextResponse.json({ success: true, data: auth });
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
          message: "Failed to retrieve session",
        },
      },
      { status: 500 },
    );
  }
}
