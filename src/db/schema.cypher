// =============================================================================
// Neo4j Cypher Schema & Constraints — Multi-Tenant EBRR Investigation Platform
// -----------------------------------------------------------------------------
// Models:
// (:Tenant {id: $tenantId})-[:HAS_INVESTIGATION]->(:Investigation { ... })
// (:Investigation)-[:CONTAINS]->(:Node {tenantId: $tenantId, workspaceId: $workspaceId})
// (:Node)-[:RELATES_TO {tenantId: $tenantId, workspaceId: $workspaceId}]->(:Node)
// =============================================================================

// 1. Uniqueness Constraints
CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS
FOR (t:Tenant)
REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT investigation_tenant_id_unique IF NOT EXISTS
FOR (i:Investigation)
REQUIRE (i.tenantId, i.id) IS UNIQUE;

CREATE CONSTRAINT node_tenant_id_unique IF NOT EXISTS
FOR (n:Node)
REQUIRE (n.tenantId, n.id) IS UNIQUE;

CREATE CONSTRAINT node_id_exists IF NOT EXISTS
FOR (n:Node) REQUIRE n.id IS NOT NULL;

CREATE CONSTRAINT node_tenant_exists IF NOT EXISTS
FOR (n:Node) REQUIRE n.tenantId IS NOT NULL;

// 2. Indexes for Fast Multi-Tenant Lookups
CREATE INDEX tenant_idx IF NOT EXISTS
FOR (t:Tenant) ON (t.id);

CREATE INDEX investigation_tenant_idx IF NOT EXISTS
FOR (i:Investigation) ON (i.tenantId);

CREATE INDEX node_tenant_idx IF NOT EXISTS
FOR (n:Node) ON (n.tenantId);

CREATE INDEX node_tenant_domain_idx IF NOT EXISTS
FOR (n:Node) ON (n.tenantId, n.domain);

CREATE INDEX node_tenant_workspace_idx IF NOT EXISTS
FOR (n:Node) ON (n.tenantId, n.workspaceId);

CREATE INDEX relationship_tenant_idx IF NOT EXISTS
FOR ()-[r:RELATES_TO]-() ON (r.tenantId);

CREATE INDEX relationship_tenant_workspace_idx IF NOT EXISTS
FOR ()-[r:RELATES_TO]-() ON (r.tenantId, r.workspaceId);

// 3. Full-Text Search Index for EBRR Elements
CREATE FULLTEXT INDEX ebrr_element_search_idx IF NOT EXISTS
FOR (n:Node) ON EACH [n.label, n.subtitle, n.description]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'standard-no-stop-words'
  }
};
