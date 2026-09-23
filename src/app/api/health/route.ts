// =============================================================================
// API/Controller Layer — GET /api/health
// Enterprise Readiness & Health Probe for Neo4j and Redis
// =============================================================================

import { NextResponse } from "next/server";
import { checkNeo4jHealth } from "../../../db/neo4jDriver";
import { checkRedisHealth } from "../../../lib/redis/cache";
import type { ApiResponse } from "../../../types";

export async function GET(): Promise<NextResponse<ApiResponse<any>>> {
  const [neo4jStatus, redisStatus] = await Promise.all([
    checkNeo4jHealth(),
    checkRedisHealth(),
  ]);

  const healthy = neo4jStatus.connected;

  return NextResponse.json(
    {
      success: true,
      data: {
        status: healthy ? "HEALTHY" : "DEGRADED_OR_MOCK",
        timestamp: new Date().toISOString(),
        services: {
          neo4j: neo4jStatus,
          redis: redisStatus,
        },
      },
    },
    { status: 200 },
  );
}
