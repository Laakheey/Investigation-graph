# Enterprise Graph SaaS Platform — Architecture Reference

Multi-tenant B2B graph visualization platform: Next.js + Cambridge ReGraph +
Neo4j Enterprise, with Redis caching and BullMQ background processing.

## Layered Architecture

```
src/
├── app/api/graph/           # Controller Layer — validation, auth, HTTP shaping
│   ├── nodes/route.ts
│   ├── relationships/route.ts
│   └── workspace/[workspaceId]/route.ts
├── components/graph/        # Presentation Layer — client-only ReGraph UI
│   ├── ReGraphCanvas.tsx        (SSR-safe wrapper, next/dynamic)
│   ├── ReGraphChartImpl.tsx     (actual regraph <Chart/>, client-only)
│   └── useGraphMutations.ts     (TanStack Query + optimistic updates)
├── services/                # Service Layer — business logic, tenant-scoped DAL
│   └── graphService.ts          (createNode, createRelationship,
│                                  getGraphByWorkspace, mapNeo4jToReGraph)
├── lib/
│   ├── auth.ts                  # JWT verification → AuthContext
│   └── redis/cache.ts           # graph payload caching + invalidation
├── db/
│   ├── neo4jDriver.ts           # singleton driver, pooling, health checks
│   └── schema.cypher            # constraints + indexes (run once, idempotent)
├── workers/
│   └── graphImportWorker.ts     # BullMQ background bulk-import processor
└── types/index.ts           # shared interfaces across all layers
```

## Security Model — Multi-Tenancy

1. **JWT is the only source of `tenantId`.** `lib/auth.ts` verifies the
   token against your IdP's JWKS and reads `tenantId` from a signed claim.
   No route ever accepts `tenantId` from a request body, query param, or
   custom header.
2. **Every Cypher query parameterizes `$tenantId`.** See `services/graphService.ts`
   — there is no query path in the DAL that can execute without it, and
   nothing is ever string-interpolated into a Cypher statement.
3. **Database-level backstop.** `db/schema.cypher` adds composite
   `(tenantId, id)` uniqueness constraints and tenant-first indexes, so even
   a bug elsewhere in the stack can't silently create a cross-tenant ID
   collision.
4. **Cache keys are tenant-namespaced** (`cache:tenant:{tenantId}:workspace:{workspaceId}`)
   so a Redis key collision can never leak one tenant's graph to another.

## Setup

```bash
npm install neo4j-driver ioredis bullmq jose zod \
  @tanstack/react-query regraph next react react-dom

# .env.local
NEO4J_URI=neo4j+s://<your-instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<...>
NEO4J_DATABASE=neo4j

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

AUTH_JWKS_URL=https://<your-domain>/.well-known/jwks.json
AUTH_ISSUER=https://<your-domain>/
AUTH_AUDIENCE=<your-api-audience>
```

Run the schema script once against your Neo4j instance (via `cypher-shell`,
Neo4j Browser, or a migration tool):

```bash
cypher-shell -a $NEO4J_URI -u $NEO4J_USER -p $NEO4J_PASSWORD -f db/schema.cypher
```

Run the import worker as its own process, separate from the Next.js app:

```bash
node --loader ts-node/esm workers/graphImportWorker.ts
```

## Performance Notes for 100k+ Concurrent Users

- **Connection pooling**: `neo4jDriver.ts` caps `maxConnectionPoolSize` at 100
  per app instance — tune against your Neo4j cluster's total connection
  budget as you horizontally scale Next.js instances.
- **Cache-aside reads**: `getGraphByWorkspace` results are cached as
  pre-mapped ReGraph `items` (not raw Neo4j records) so cache hits skip both
  the DB round-trip and the transformation cost.
- **Write-invalidate, not write-through**: every mutation deletes the
  relevant cache key rather than trying to patch it in place — correctness
  first, since a stale graph rendering silently drops nodes for a user.
- **Bulk imports never touch the request thread**: `graphImportWorker.ts`
  processes CSV/JSON imports in batches of 100 with BullMQ concurrency
  limits, invalidating the cache once at the end rather than per-row.
- **Combos & organic layout** in `ReGraphChartImpl.tsx` only re-run on
  item-set shape changes (`useEffect` keyed on `items`), not on every React
  re-render, to avoid re-laying-out a large graph on unrelated UI updates.

## What's Intentionally Left as an Extension Point

- Rate limiting / WAF rules at the edge (not shown — infra-layer concern).
- Audit logging of writes (`createdBy` is captured; ship it to your SIEM).
- Multi-database Neo4j sharding-by-tenant for very large tenants (the driver
  utility already supports `NEO4J_DATABASE` per-connection if you later
  split tenants across databases).
