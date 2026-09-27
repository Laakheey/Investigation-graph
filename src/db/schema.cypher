// =============================================================================
// Neo4j Enterprise Cypher Schema & Constraints — Multi-Tenant Investigation Platform
// -----------------------------------------------------------------------------
// Models:
// (:Tenant {id: $tenantId})
//   -[:HAS_INVESTIGATION]->(:Investigation {id: $workspaceId, tenantId: $tenantId, ...})
//   -[:CONTAINS]->(:Node {id: $nodeId, tenantId: $tenantId, workspaceId: $workspaceId, version: $v, ...})
//   -[:RELATES_TO {relId: $relId, tenantId: $tenantId, workspaceId: $workspaceId, ...}]->(:Node)
//
// Collaboration & RBAC:
// (:User {id: $userId, name: $name, email: $email})
//   -[:MEMBER_OF {role: 'OWNER'|'EDITOR'|'VIEWER', joinedAt: datetime()}]->(:Investigation)
// (:WorkspaceInvite {id: $inviteId, token: $token, role: $role, expiresAt: datetime()})
//   -[:FOR_WORKSPACE]->(:Investigation)
//
// Temporal Audit Lineage:
// (:User {id: $userId})
//   -[:PERFORMED]->(a:EditAction {id: $actionId, timestamp: datetime(), action: $action, previousValue: $prev, newValue: $next})
//   -[:ON_ENTITY]->(:Node / :Edge)
// =============================================================================

// ── 1. Uniqueness Constraints ────────────────────────────────────────────────
CREATE CONSTRAINT tenant_id_unique IF NOT EXISTS
FOR (t:Tenant)
REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User)
REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT investigation_tenant_id_unique IF NOT EXISTS
FOR (i:Investigation)
REQUIRE (i.tenantId, i.id) IS UNIQUE;

CREATE CONSTRAINT node_tenant_id_unique IF NOT EXISTS
FOR (n:Node)
REQUIRE (n.tenantId, n.id) IS UNIQUE;

CREATE CONSTRAINT audit_action_id_unique IF NOT EXISTS
FOR (a:EditAction)
REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT workspace_invite_token_unique IF NOT EXISTS
FOR (inv:WorkspaceInvite)
REQUIRE inv.token IS UNIQUE;

CREATE CONSTRAINT workspace_invite_id_unique IF NOT EXISTS
FOR (inv:WorkspaceInvite)
REQUIRE inv.id IS UNIQUE;

// ── 2. Existence Constraints ─────────────────────────────────────────────────
CREATE CONSTRAINT node_id_exists IF NOT EXISTS
FOR (n:Node) REQUIRE n.id IS NOT NULL;

CREATE CONSTRAINT node_tenant_exists IF NOT EXISTS
FOR (n:Node) REQUIRE n.tenantId IS NOT NULL;

// ── 3. Multi-Tenant Performance Indexes ──────────────────────────────────────
CREATE INDEX tenant_idx IF NOT EXISTS
FOR (t:Tenant) ON (t.id);

CREATE INDEX user_idx IF NOT EXISTS
FOR (u:User) ON (u.id);

CREATE INDEX investigation_tenant_idx IF NOT EXISTS
FOR (i:Investigation) ON (i.tenantId);

CREATE INDEX node_tenant_idx IF NOT EXISTS
FOR (n:Node) ON (n.tenantId);

CREATE INDEX node_tenant_workspace_idx IF NOT EXISTS
FOR (n:Node) ON (n.tenantId, n.workspaceId);

CREATE INDEX node_conflict_idx IF NOT EXISTS
FOR (n:Node) ON (n.tenantId, n.hasConflict);

CREATE INDEX relationship_tenant_workspace_idx IF NOT EXISTS
FOR ()-[r:RELATES_TO]-() ON (r.tenantId, r.workspaceId);

// ── 4. Temporal Audit Query Indexes ──────────────────────────────────────────
CREATE INDEX audit_action_tenant_time_idx IF NOT EXISTS
FOR (a:EditAction) ON (a.tenantId, a.timestamp);

CREATE INDEX audit_action_workspace_idx IF NOT EXISTS
FOR (a:EditAction) ON (a.workspaceId);

CREATE INDEX audit_action_entity_idx IF NOT EXISTS
FOR (a:EditAction) ON (a.entityId);

CREATE INDEX audit_action_user_idx IF NOT EXISTS
FOR (a:EditAction) ON (a.userId);

// ── 5. Full-Text Search Index for Investigation Elements ─────────────────────
CREATE FULLTEXT INDEX ebrr_element_search_idx IF NOT EXISTS
FOR (n:Node) ON EACH [n.label, n.subtitle, n.description]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'standard-no-stop-words'
  }
};
