// =============================================================================
// Business Logic Layer — Native Neo4j Temporal Audit & Conflict Resolution Service
// -----------------------------------------------------------------------------
// Implements immutable temporal lineage tracking via pure Neo4j graph nodes.
// Provides visual concurrency conflict detection and 3-way merge resolution.
// =============================================================================

import { randomUUID } from "crypto";
import { withSession } from "../db/neo4jDriver";
import type {
  AuditActionType,
  AuditActionRecord,
  ConflictRecord,
  ConflictedFieldData,
} from "../types/domain";

// In-memory fallback stores for development/offline
const memoryAuditLogs = new Map<string, AuditActionRecord[]>(); // key: `${tenantId}:${workspaceId}`
const memoryConflicts = new Map<string, ConflictRecord>(); // key: `${tenantId}:${entityId}`

export class AuditService {
  /**
   * Logs an immutable temporal audit event in Neo4j.
   */
  async logAction(
    tenantId: string,
    data: {
      action: AuditActionType;
      userId: string;
      userName?: string;
      userEmail?: string;
      entityType: "Node" | "Edge" | "Workspace" | "Investigation";
      entityId: string;
      workspaceId: string;
      fieldName?: string;
      previousValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
    },
  ): Promise<AuditActionRecord> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    const record: AuditActionRecord = {
      id,
      timestamp,
      action: data.action,
      userId: data.userId,
      userName: data.userName || "Investigator",
      userEmail: data.userEmail,
      entityType: data.entityType,
      entityId: data.entityId,
      workspaceId: data.workspaceId,
      tenantId,
      fieldName: data.fieldName,
      previousValue: data.previousValue,
      newValue: data.newValue,
      metadata: data.metadata,
    };

    // Store in memory fallback
    const key = `${tenantId}:${data.workspaceId}`;
    const list = memoryAuditLogs.get(key) || [];
    list.unshift(record);
    memoryAuditLogs.set(key, list);

    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MERGE (u:User { id: $userId })
            ON CREATE SET u.name = $userName, u.email = $userEmail, u.createdAt = $timestamp
            CREATE (a:EditAction {
              id: $id,
              action: $action,
              timestamp: $timestamp,
              entityType: $entityType,
              entityId: $entityId,
              workspaceId: $workspaceId,
              tenantId: $tenantId,
              fieldName: $fieldName,
              previousValue: $previousValueJson,
              newValue: $newValueJson,
              metadata: $metadataJson
            })
            CREATE (u)-[:PERFORMED]->(a)
            WITH a
            OPTIONAL MATCH (n:Node { tenantId: $tenantId, id: $entityId })
            FOREACH (_ IN CASE WHEN n IS NOT NULL THEN [1] ELSE [] END |
              CREATE (a)-[:ON_ENTITY]->(n)
            )
            `,
            {
              id,
              userId: data.userId,
              userName: data.userName || "Investigator",
              userEmail: data.userEmail || null,
              action: data.action,
              timestamp,
              entityType: data.entityType,
              entityId: data.entityId,
              workspaceId: data.workspaceId,
              tenantId,
              fieldName: data.fieldName || null,
              previousValueJson: data.previousValue !== undefined ? JSON.stringify(data.previousValue) : null,
              newValueJson: data.newValue !== undefined ? JSON.stringify(data.newValue) : null,
              metadataJson: data.metadata ? JSON.stringify(data.metadata) : null,
            },
          ),
        );
      });
    } catch (err) {
      console.warn("[auditService] Neo4j audit write fallback to memory:", err);
    }

    return record;
  }

  /**
   * Retrieves granular audit trail for a single node/edge entity.
   */
  async getEntityAuditTrail(
    tenantId: string,
    entityId: string,
  ): Promise<AuditActionRecord[]> {
    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (u:User)-[:PERFORMED]->(a:EditAction { tenantId: $tenantId, entityId: $entityId })
            RETURN a, u.name AS userName, u.email AS userEmail
            ORDER BY a.timestamp DESC
            LIMIT 100
            `,
            { tenantId, entityId },
          ),
        );

        return result.records.map((rec) => {
          const props = rec.get("a").properties;
          return {
            ...props,
            userName: rec.get("userName") || props.userName || "Investigator",
            userEmail: rec.get("userEmail") || undefined,
            previousValue: props.previousValue ? JSON.parse(props.previousValue) : undefined,
            newValue: props.newValue ? JSON.parse(props.newValue) : undefined,
            metadata: props.metadata ? JSON.parse(props.metadata) : undefined,
          };
        });
      });
    } catch {
      // Memory scan
      const all: AuditActionRecord[] = [];
      for (const logs of memoryAuditLogs.values()) {
        for (const log of logs) {
          if (log.tenantId === tenantId && log.entityId === entityId) {
            all.push(log);
          }
        }
      }
      return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
  }

  /**
   * Retrieves complete timeline of edits in a workspace.
   */
  async getWorkspaceAuditLog(
    tenantId: string,
    workspaceId: string,
    limit = 50,
  ): Promise<AuditActionRecord[]> {
    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (u:User)-[:PERFORMED]->(a:EditAction { tenantId: $tenantId, workspaceId: $workspaceId })
            RETURN a, u.name AS userName, u.email AS userEmail
            ORDER BY a.timestamp DESC
            LIMIT $limit
            `,
            { tenantId, workspaceId, limit: Math.min(limit, 200) },
          ),
        );

        return result.records.map((rec) => {
          const props = rec.get("a").properties;
          return {
            ...props,
            userName: rec.get("userName") || props.userName || "Investigator",
            userEmail: rec.get("userEmail") || undefined,
            previousValue: props.previousValue ? JSON.parse(props.previousValue) : undefined,
            newValue: props.newValue ? JSON.parse(props.newValue) : undefined,
            metadata: props.metadata ? JSON.parse(props.metadata) : undefined,
          };
        });
      });
    } catch {
      const key = `${tenantId}:${workspaceId}`;
      const list = memoryAuditLogs.get(key) || [];
      return list.slice(0, limit);
    }
  }

  /**
   * Flags a visual conflict on a node or edge when concurrent edits collide.
   */
  async flagConflict(
    tenantId: string,
    workspaceId: string,
    entityId: string,
    entityType: "NODE" | "EDGE",
    conflictedFields: Record<string, ConflictedFieldData>,
    userId: string,
    userName = "Collaborator",
  ): Promise<ConflictRecord> {
    const detectedAt = new Date().toISOString();
    const conflictRecord: ConflictRecord = {
      entityId,
      entityType,
      workspaceId,
      tenantId,
      hasConflict: true,
      conflictedFields,
      detectedAt,
    };

    const conflictKey = `${tenantId}:${entityId}`;
    memoryConflicts.set(conflictKey, conflictRecord);

    try {
      await withSession(async (session) => {
        if (entityType === "NODE") {
          await session.executeWrite((tx) =>
            tx.run(
              `
              MATCH (n:Node { tenantId: $tenantId, id: $entityId })
              SET n.hasConflict = true,
                  n.conflictedFields = $conflictedFieldsJson
              `,
              {
                tenantId,
                entityId,
                conflictedFieldsJson: JSON.stringify(conflictedFields),
              },
            ),
          );
        } else {
          await session.executeWrite((tx) =>
            tx.run(
              `
              MATCH ()-[r:RELATES_TO { tenantId: $tenantId, relId: $entityId }]->()
              SET r.hasConflict = true,
                  r.conflictedFields = $conflictedFieldsJson
              `,
              {
                tenantId,
                entityId,
                conflictedFieldsJson: JSON.stringify(conflictedFields),
              },
            ),
          );
        }
      });
    } catch (err) {
      console.warn("[auditService] flagConflict fallback to memory:", err);
    }

    // Log the conflict event in audit lineage
    await this.logAction(tenantId, {
      action: "FLAG_CONFLICT",
      userId,
      userName,
      entityType: entityType === "NODE" ? "Node" : "Edge",
      entityId,
      workspaceId,
      metadata: { conflictedFields: Object.keys(conflictedFields) },
    });

    return conflictRecord;
  }

  /**
   * Resolves a conflict, applying chosen merged properties and clearing the flag.
   */
  async resolveConflict(
    tenantId: string,
    workspaceId: string,
    entityId: string,
    entityType: "NODE" | "EDGE",
    resolvedFields: Record<string, any>,
    userId: string,
    userName = "Investigator",
    resolutionComment?: string,
  ): Promise<void> {
    const resolvedAt = new Date().toISOString();
    const conflictKey = `${tenantId}:${entityId}`;
    memoryConflicts.delete(conflictKey);

    try {
      await withSession(async (session) => {
        if (entityType === "NODE") {
          await session.executeWrite((tx) =>
            tx.run(
              `
              MATCH (n:Node { tenantId: $tenantId, id: $entityId })
              SET n.hasConflict = false,
                  n.conflictedFields = null,
                  n.updatedAt = $resolvedAt,
                  n.updatedBy = $userId,
                  n.version = coalesce(n.version, 1) + 1
              SET n += $resolvedFields
              `,
              {
                tenantId,
                entityId,
                resolvedAt,
                userId,
                resolvedFields,
              },
            ),
          );
        } else {
          await session.executeWrite((tx) =>
            tx.run(
              `
              MATCH ()-[r:RELATES_TO { tenantId: $tenantId, relId: $entityId }]->()
              SET r.hasConflict = false,
                  r.conflictedFields = null,
                  r.updatedAt = $resolvedAt,
                  r.updatedBy = $userId,
                  r.version = coalesce(r.version, 1) + 1
              SET r += $resolvedFields
              `,
              {
                tenantId,
                entityId,
                resolvedAt,
                userId,
                resolvedFields,
              },
            ),
          );
        }
      });
    } catch (err) {
      console.warn("[auditService] resolveConflict fallback to memory:", err);
    }

    // Log resolution in audit lineage
    await this.logAction(tenantId, {
      action: "RESOLVE_CONFLICT",
      userId,
      userName,
      entityType: entityType === "NODE" ? "Node" : "Edge",
      entityId,
      workspaceId,
      metadata: {
        resolvedFields,
        resolutionComment: resolutionComment || "Manual 3-way merge resolution",
        resolvedAt,
      },
    });
  }

  /**
   * Retrieves active conflict record for an entity.
   */
  async getEntityConflict(
    tenantId: string,
    entityId: string,
  ): Promise<ConflictRecord | null> {
    const conflictKey = `${tenantId}:${entityId}`;
    if (memoryConflicts.has(conflictKey)) {
      return memoryConflicts.get(conflictKey) || null;
    }

    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (n:Node { tenantId: $tenantId, id: $entityId, hasConflict: true })
            RETURN n.conflictedFields AS conflictedFields, n.workspaceId AS workspaceId
            `,
            { tenantId, entityId },
          ),
        );

        if (result.records.length > 0) {
          const rec = result.records[0];
          const raw = rec.get("conflictedFields");
          return {
            entityId,
            entityType: "NODE",
            workspaceId: rec.get("workspaceId"),
            tenantId,
            hasConflict: true,
            conflictedFields: raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {},
            detectedAt: new Date().toISOString(),
          };
        }
        return null;
      });
    } catch {
      return null;
    }
  }
}

export const auditServiceSingleton = new AuditService();
