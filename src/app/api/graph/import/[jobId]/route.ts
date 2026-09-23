// =============================================================================
// API/Controller Layer — GET /api/graph/import/:jobId
// Status & Progress Polling for Asynchronous Bulk Imports
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, UnauthorizedError } from '@/lib/auth';
import { getImportJobStatus } from '@/workers/graphImportWorker';
import type { ApiResponse } from '@/types/api';
import type { BulkImportJobStatus } from '@/workers/graphImportWorker';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
): Promise<NextResponse<ApiResponse<BulkImportJobStatus>>> {
  try {
    const auth = await getAuthContext(req);
    const { jobId } = params;

    const status = await getImportJobStatus(jobId);
    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: `Import job ${jobId} not found` },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: status }, { status: 200 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: err.message } },
        { status: 401 }
      );
    }
    console.error('[api/graph/import/:jobId] unhandled error', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to query job status' } },
      { status: 500 }
    );
  }
}
