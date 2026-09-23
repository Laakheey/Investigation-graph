// =============================================================================
// Step 5 — Redis Caching Strategy
// -----------------------------------------------------------------------------
// Cache key pattern: cache:tenant:{tenantId}:workspace:{workspaceId}
// SECURITY: tenantId is ALWAYS part of the key namespace. Never cache under a
// key derived only from workspaceId.
// PERFORMANCE: cache holds the already-mapped ReGraph `items` payload.
// RESILIENCE: Falls back gracefully if Redis is unavailable.
// =============================================================================

import Redis from 'ioredis';
import type { ReGraphItemsMap } from '../../types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const GRAPH_CACHE_TTL_SECONDS = 300; // 5 min TTL

let redisSingleton: Redis | null = null;
let isRedisAvailable = true;

// In-memory LRU-like cache fallback for local/test environments
const memoryCache = new Map<string, { data: ReGraphItemsMap; expiresAt: number }>();

function getRedis(): Redis | null {
  if (!isRedisAvailable) return null;
  if (redisSingleton) return redisSingleton;

  try {
    redisSingleton = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableAutoPipelining: true,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          isRedisAvailable = false;
          return null; // Stop retrying and fallback to in-memory
        }
        return Math.min(times * 200, 1000);
      },
    });

    redisSingleton.on('error', (err) => {
      console.warn('[redis] Redis connection warning; using fallback cache:', err.message);
    });

    redisSingleton.connect().catch(() => {
      isRedisAvailable = false;
    });

    return redisSingleton;
  } catch (err) {
    isRedisAvailable = false;
    return null;
  }
}

function cacheKey(tenantId: string, workspaceId: string): string {
  return `cache:tenant:${tenantId}:workspace:${workspaceId}`;
}

/**
 * Returns the cached ReGraph items map, or null on a miss / Redis outage.
 */
export async function getCachedGraph(
  tenantId: string,
  workspaceId: string
): Promise<ReGraphItemsMap | null> {
  const key = cacheKey(tenantId, workspaceId);

  // Check Redis if connected
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw) return JSON.parse(raw) as ReGraphItemsMap;
    } catch (err) {
      // Non-fatal, check memory fallback
    }
  }

  // Memory fallback
  const cached = memoryCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.data;
    }
    memoryCache.delete(key);
  }

  return null;
}

/**
 * Stores the mapped ReGraph items into Redis & local cache.
 */
export async function setCachedGraph(
  tenantId: string,
  workspaceId: string,
  items: ReGraphItemsMap
): Promise<void> {
  const key = cacheKey(tenantId, workspaceId);

  // Store in memory fallback
  memoryCache.set(key, {
    data: items,
    expiresAt: Date.now() + GRAPH_CACHE_TTL_SECONDS * 1000,
  });

  // Store in Redis if connected
  const client = getRedis();
  if (client) {
    try {
      await client.set(key, JSON.stringify(items), 'EX', GRAPH_CACHE_TTL_SECONDS);
    } catch (err) {
      // Non-fatal
    }
  }
}

/**
 * Invalidation hook — call after ANY write (createNode, createRelationship, delete, bulk import).
 */
export async function invalidateWorkspaceCache(
  tenantId: string,
  workspaceId: string
): Promise<void> {
  const key = cacheKey(tenantId, workspaceId);
  memoryCache.delete(key);

  const client = getRedis();
  if (client) {
    try {
      await client.del(key);
    } catch (err) {
      // Non-fatal
    }
  }
}

/**
 * Check Redis health status.
 */
export async function checkRedisHealth(): Promise<{ connected: boolean; url: string; error?: string }> {
  try {
    const client = getRedis();
    if (!client) return { connected: false, url: REDIS_URL, error: 'Redis client not initialized' };
    const pingRes = await client.ping();
    return { connected: pingRes === 'PONG', url: REDIS_URL };
  } catch (err: any) {
    return { connected: false, url: REDIS_URL, error: err?.message || 'Redis ping failed' };
  }
}
