// =============================================================================
// API/Controller Layer — GET /api/investigations/:investigationId
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, UnauthorizedError } from '@/lib/auth';
import { investigationServiceSingleton } from '@/services/investigationService';
import type { ApiResponse } from '@/types/api';
import type { Investigation } from '@/types/domain';

export async function GET(
  req: NextRequest,
  { params }: { params: { investigationId: string } }
): Promise<NextResponse<ApiResponse<Investigation>>> {
  try {
    const auth = await getAuthContext(req);
    const { investigationId } = params;

    const investigation = await investigationServiceSingleton.getInvestigationById(
      auth.tenantId,
      investigationId
    );

    if (!investigation) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Investigation not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: investigation }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: err.message } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve investigation' } },
      { status: 500 }
    );
  }
}
