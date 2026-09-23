// =============================================================================
// Caching Service Layer (Artifact 2 — Redis Caching Strategy & Invalidation)
// -----------------------------------------------------------------------------
// SOLID:
// - Dependency Inversion Principle (DIP): High-level GraphService depends on ICacheService.
// - Single Responsibility Principle (SRP): Isolates caching and TTL invalidation logic.
// =============================================================================

import Redis from "ioredis";

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidateInvestigationGraph(
    tenantId: string,
    investigationId: string,
  ): Promise<void>;
  checkHealth(): Promise<{ connected: boolean; url: string; error?: string }>;
}

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

export class RedisCacheService implements ICacheService {
  private redis: Redis | null = null;
  private isAvailable = true;
  private memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

  constructor() {
    this.initClient();
  }

  private initClient(): Redis | null {
    if (!this.isAvailable) return null;
    if (this.redis) return this.redis;

    try {
      this.redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableAutoPipelining: true,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 2) {
            this.isAvailable = false;
            return null; // Fall back to in-memory
          }
          return Math.min(times * 200, 1000);
        },
      });

      this.redis.on("error", (err) => {
        // Redis failure must not crash API requests
        console.warn(
          "[RedisCacheService] Connection warning; falling back to memory:",
          err.message,
        );
      });

      this.redis.connect().catch(() => {
        this.isAvailable = false;
      });

      return this.redis;
    } catch {
      this.isAvailable = false;
      return null;
    }
  }

  static getInvestigationGraphKey(
    tenantId: string,
    investigationId: string,
  ): string {
    return `cache:tenant:${tenantId}:investigation:${investigationId}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isAvailable && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch {
        // Fall through to memory
      }
    }

    const cached = this.memoryCache.get(key);
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return cached.data as T;
      }
      this.memoryCache.delete(key);
    }

    return null;
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    this.memoryCache.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    if (this.isAvailable && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      } catch {
        // Non-fatal
      }
    }
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.isAvailable && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // Non-fatal
      }
    }
  }

  async invalidateInvestigationGraph(
    tenantId: string,
    investigationId: string,
  ): Promise<void> {
    const key = RedisCacheService.getInvestigationGraphKey(
      tenantId,
      investigationId,
    );
    await this.del(key);
  }

  async checkHealth(): Promise<{
    connected: boolean;
    url: string;
    error?: string;
  }> {
    try {
      if (!this.redis)
        return {
          connected: false,
          url: REDIS_URL,
          error: "Redis client not initialized",
        };
      const ping = await this.redis.ping();
      return { connected: ping === "PONG", url: REDIS_URL };
    } catch (err: any) {
      return {
        connected: false,
        url: REDIS_URL,
        error: err?.message || "Ping failed",
      };
    }
  }
}

// Singleton cache instance
export const cacheServiceSingleton = new RedisCacheService();
