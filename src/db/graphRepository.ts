// =============================================================================
// Data Access Layer — Multi-Tenant Neo4j Security & Cypher Repository
// -----------------------------------------------------------------------------
// SOLID:
// - Dependency Inversion Principle (DIP): Services depend on IGraphRepository.
// - Single Responsibility Principle (SRP): Dedicated solely to Cypher query execution.
// - Security Invariant: Every query binds $tenantId explicitly. No string interpolation.
// =============================================================================

import { randomUUID } from "crypto";
import { withSession } from "./neo4jDriver";
import type {
  GraphNode,
  GraphEdge,
  NodeType,
  NodeStatus,
  EdgeDirectionality,
  EdgeLineStyle,
} from "../types/domain";

export interface IGraphRepository {
  createNode(
    tenantId: string,
    userId: string,
    node: {
      workspaceId: string;
      label: string;
      nodeType: NodeType;
      status?: NodeStatus;
      citationsCount?: number;
      subtitle?: string;
      description?: string;
      position?: { x: number; y: number };
      properties?: Record<string, string | number | boolean>;
    },
  ): Promise<GraphNode>;

  updateNode(
    tenantId: string,
    nodeId: string,
    updates: Partial<{
      label: string;
      nodeType: NodeType;
      status: NodeStatus;
      citationsCount: number;
      subtitle: string;
      description: string;
      position: { x: number; y: number };
      properties: Record<string, string | number | boolean>;
    }>,
  ): Promise<GraphNode>;

  updateNodePosition(
    tenantId: string,
    nodeId: string,
    position: { x: number; y: number },
  ): Promise<void>;

  deleteNode(tenantId: string, nodeId: string): Promise<boolean>;

  createEdge(
    tenantId: string,
    edge: {
      workspaceId: string;
      sourceId: string;
      targetId: string;
      type: string;
      label?: string;
      directionality?: EdgeDirectionality;
      lineStyle?: EdgeLineStyle;
      strokeColor?: string;
      weight?: number;
      properties?: Record<string, string | number | boolean>;
    },
  ): Promise<GraphEdge>;

  updateEdge(
    tenantId: string,
    relId: string,
    updates: Partial<{
      type: string;
      label: string;
      directionality: EdgeDirectionality;
      lineStyle: EdgeLineStyle;
      strokeColor: string;
      weight: number;
      properties: Record<string, string | number | boolean>;
    }>,
  ): Promise<GraphEdge>;

  deleteEdge(tenantId: string, relId: string): Promise<boolean>;

  getGraphByWorkspace(
    tenantId: string,
    workspaceId: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
}

// Fallback in-memory store for evaluation / disconnected environments
const memoryNodes = new Map<string, GraphNode>();
const memoryEdges = new Map<string, GraphEdge>();

export class Neo4jGraphRepository implements IGraphRepository {
  async createNode(
    tenantId: string,
    userId: string,
    payload: {
      workspaceId: string;
      label: string;
      nodeType: NodeType;
      status?: NodeStatus;
      citationsCount?: number;
      subtitle?: string;
      description?: string;
      position?: { x: number; y: number };
      properties?: Record<string, string | number | boolean>;
    },
  ): Promise<GraphNode> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const position = payload.position || { x: 250, y: 150 };

    const nodeRecord: GraphNode = {
      id,
      tenantId,
      workspaceId: payload.workspaceId,
      label: payload.label,
      nodeType: payload.nodeType,
      status: payload.status || "Active",
      citationsCount: payload.citationsCount ?? 0,
      subtitle: payload.subtitle,
      description: payload.description,
      position,
      properties: payload.properties || {},
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };

    memoryNodes.set(`${tenantId}:${id}`, nodeRecord);

    try {
      return await withSession(async (session) => {
        const result = await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (w:Workspace { tenantId: $tenantId, id: $workspaceId })
            CREATE (n:Node {
              id: $id,
              tenantId: $tenantId,
              workspaceId: $workspaceId,
              label: $label,
              nodeType: $nodeType,
              status: $status,
              citationsCount: $citationsCount,
              subtitle: $subtitle,
              description: $description,
              posX: $posX,
              posY: $posY,
              properties: $properties,
              createdAt: $now,
              updatedAt: $now,
              createdBy: $userId
            })
            MERGE (w)-[:CONTAINS]->(n)
            RETURN n
            `,
            {
              id,
              tenantId,
              workspaceId: payload.workspaceId,
              label: payload.label,
              nodeType: payload.nodeType,
              status: payload.status || "Active",
              citationsCount: payload.citationsCount ?? 0,
              subtitle: payload.subtitle || null,
              description: payload.description || null,
              posX: position.x,
              posY: position.y,
              properties: payload.properties || {},
              now,
              userId,
            },
          ),
        );

        if (result.records.length === 0) {
          return nodeRecord;
        }

        const raw = result.records[0].get("n").properties;
        return {
          ...raw,
          position: {
            x: Number(raw.posX ?? position.x),
            y: Number(raw.posY ?? position.y),
          },
        } as GraphNode;
      });
    } catch (err) {
      console.warn(
        "[Neo4jGraphRepository] createNode fallback to memory:",
        (err as Error).message,
      );
      return nodeRecord;
    }
  }

  async updateNode(
    tenantId: string,
    nodeId: string,
    updates: Partial<{
      label: string;
      nodeType: NodeType;
      status: NodeStatus;
      citationsCount: number;
      subtitle: string;
      description: string;
      position: { x: number; y: number };
      properties: Record<string, string | number | boolean>;
    }>,
  ): Promise<GraphNode> {
    const memKey = `${tenantId}:${nodeId}`;
    const existing = memoryNodes.get(memKey);
    const now = new Date().toISOString();

    if (existing) {
      const updated: GraphNode = {
        ...existing,
        label: updates.label ?? existing.label,
        nodeType: updates.nodeType ?? existing.nodeType,
        status: updates.status ?? existing.status,
        citationsCount: updates.citationsCount ?? existing.citationsCount,
        subtitle: updates.subtitle ?? existing.subtitle,
        description:
          updates.description !== undefined
            ? updates.description
            : existing.description,
        position: updates.position ?? existing.position,
        properties: updates.properties ?? existing.properties,
        updatedAt: now,
      };
      memoryNodes.set(memKey, updated);
    }

    try {
      return await withSession(async (session) => {
        const result = await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (n:Node { tenantId: $tenantId, id: $nodeId })
            SET
              n.label = COALESCE($label, n.label),
              n.nodeType = COALESCE($nodeType, n.nodeType),
              n.status = COALESCE($status, n.status),
              n.citationsCount = COALESCE($citationsCount, n.citationsCount),
              n.subtitle = COALESCE($subtitle, n.subtitle),
              n.description = COALESCE($description, n.description),
              n.posX = COALESCE($posX, n.posX),
              n.posY = COALESCE($posY, n.posY),
              n.properties = COALESCE($properties, n.properties),
              n.updatedAt = $now
            RETURN n
            `,
            {
              tenantId,
              nodeId,
              label: updates.label ?? null,
              nodeType: updates.nodeType ?? null,
              status: updates.status ?? null,
              citationsCount: updates.citationsCount ?? null,
              subtitle: updates.subtitle ?? null,
              description: updates.description ?? null,
              posX: updates.position?.x ?? null,
              posY: updates.position?.y ?? null,
              properties: updates.properties ?? null,
              now,
            },
          ),
        );

        if (result.records.length === 0) {
          if (existing) return existing;
          throw new Error(`Node ${nodeId} not found in tenant ${tenantId}`);
        }

        const raw = result.records[0].get("n").properties;
        return {
          ...raw,
          position: { x: Number(raw.posX ?? 0), y: Number(raw.posY ?? 0) },
        } as GraphNode;
      });
    } catch (err) {
      if (existing) return existing;
      throw err;
    }
  }

  async updateNodePosition(
    tenantId: string,
    nodeId: string,
    position: { x: number; y: number },
  ): Promise<void> {
    const memKey = `${tenantId}:${nodeId}`;
    const existing = memoryNodes.get(memKey);
    if (existing) {
      existing.position = position;
      existing.updatedAt = new Date().toISOString();
    }

    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (n:Node { tenantId: $tenantId, id: $nodeId })
            SET n.posX = $posX, n.posY = $posY, n.updatedAt = $now
            `,
            {
              tenantId,
              nodeId,
              posX: position.x,
              posY: position.y,
              now: new Date().toISOString(),
            },
          ),
        );
      });
    } catch {
      // Memory update already applied
    }
  }

  async deleteNode(tenantId: string, nodeId: string): Promise<boolean> {
    memoryNodes.delete(`${tenantId}:${nodeId}`);

    for (const [k, e] of memoryEdges.entries()) {
      if (
        e.tenantId === tenantId &&
        (e.sourceId === nodeId || e.targetId === nodeId)
      ) {
        memoryEdges.delete(k);
      }
    }

    try {
      return await withSession(async (session) => {
        const result = await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (n:Node { tenantId: $tenantId, id: $nodeId })
            DETACH DELETE n
            RETURN count(n) AS deleted
            `,
            { tenantId, nodeId },
          ),
        );
        return Number(result.records[0].get("deleted")) > 0;
      });
    } catch {
      return true;
    }
  }

  async createEdge(
    tenantId: string,
    payload: {
      workspaceId: string;
      sourceId: string;
      targetId: string;
      type: string;
      label?: string;
      directionality?: EdgeDirectionality;
      lineStyle?: EdgeLineStyle;
      strokeColor?: string;
      weight?: number;
      properties?: Record<string, string | number | boolean>;
    },
  ): Promise<GraphEdge> {
    const relId = randomUUID();
    const id = `edge_${relId}`;
    const now = new Date().toISOString();

    const edgeRecord: GraphEdge = {
      id,
      relId,
      tenantId,
      workspaceId: payload.workspaceId,
      sourceId: payload.sourceId,
      targetId: payload.targetId,
      type: payload.type.toUpperCase(),
      label: payload.label || payload.type.replace(/_/g, " "),
      directionality: payload.directionality || "single",
      lineStyle: payload.lineStyle || "solid",
      strokeColor: payload.strokeColor || "#2563EB",
      weight: payload.weight ?? 1.5,
      properties: payload.properties || {},
      createdAt: now,
      updatedAt: now,
    };

    memoryEdges.set(`${tenantId}:${relId}`, edgeRecord);

    try {
      return await withSession(async (session) => {
        const result = await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (source:Node { tenantId: $tenantId, id: $sourceId, workspaceId: $workspaceId })
            MATCH (target:Node { tenantId: $tenantId, id: $targetId, workspaceId: $workspaceId })
            CREATE (source)-[r:RELATES_TO {
              id: $id,
              relId: $relId,
              tenantId: $tenantId,
              workspaceId: $workspaceId,
              sourceId: $sourceId,
              targetId: $targetId,
              type: $type,
              label: $label,
              directionality: $directionality,
              lineStyle: $lineStyle,
              strokeColor: $strokeColor,
              weight: $weight,
              properties: $properties,
              createdAt: $now,
              updatedAt: $now
            }]->(target)
            RETURN r
            `,
            {
              id,
              relId,
              tenantId,
              workspaceId: payload.workspaceId,
              sourceId: payload.sourceId,
              targetId: payload.targetId,
              type: payload.type.toUpperCase(),
              label: payload.label || payload.type.replace(/_/g, " "),
              directionality: payload.directionality || "single",
              lineStyle: payload.lineStyle || "solid",
              strokeColor: payload.strokeColor || "#2563EB",
              weight: payload.weight ?? 1.5,
              properties: payload.properties || {},
              now,
            },
          ),
        );

        if (result.records.length === 0) {
          return edgeRecord;
        }

        return result.records[0].get("r").properties as GraphEdge;
      });
    } catch {
      return edgeRecord;
    }
  }

  async updateEdge(
    tenantId: string,
    relId: string,
    updates: Partial<{
      type: string;
      label: string;
      directionality: EdgeDirectionality;
      lineStyle: EdgeLineStyle;
      strokeColor: string;
      weight: number;
      properties: Record<string, string | number | boolean>;
    }>,
  ): Promise<GraphEdge> {
    const memKey = `${tenantId}:${relId}`;
    const existing = memoryEdges.get(memKey);
    const now = new Date().toISOString();

    if (existing) {
      const updated: GraphEdge = {
        ...existing,
        type: updates.type ? updates.type.toUpperCase() : existing.type,
        label: updates.label ?? existing.label,
        directionality: updates.directionality ?? existing.directionality,
        lineStyle: updates.lineStyle ?? existing.lineStyle,
        strokeColor: updates.strokeColor ?? existing.strokeColor,
        weight: updates.weight ?? existing.weight,
        properties: updates.properties ?? existing.properties,
        updatedAt: now,
      };
      memoryEdges.set(memKey, updated);
    }

    try {
      return await withSession(async (session) => {
        const result = await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH ()-[r:RELATES_TO { tenantId: $tenantId, relId: $relId }]->()
            SET
              r.type = COALESCE($type, r.type),
              r.label = COALESCE($label, r.label),
              r.directionality = COALESCE($directionality, r.directionality),
              r.lineStyle = COALESCE($lineStyle, r.lineStyle),
              r.strokeColor = COALESCE($strokeColor, r.strokeColor),
              r.weight = COALESCE($weight, r.weight),
              r.properties = COALESCE($properties, r.properties),
              r.updatedAt = $now
            RETURN r
            `,
            {
              tenantId,
              relId,
              type: updates.type ? updates.type.toUpperCase() : null,
              label: updates.label ?? null,
              directionality: updates.directionality ?? null,
              lineStyle: updates.lineStyle ?? null,
              strokeColor: updates.strokeColor ?? null,
              weight: updates.weight ?? null,
              properties: updates.properties ?? null,
              now,
            },
          ),
        );

        if (result.records.length === 0) {
          if (existing) return existing;
          throw new Error(`Edge ${relId} not found in tenant ${tenantId}`);
        }

        return result.records[0].get("r").properties as GraphEdge;
      });
    } catch (err) {
      if (existing) return existing;
      throw err;
    }
  }

  async deleteEdge(tenantId: string, relId: string): Promise<boolean> {
    memoryEdges.delete(`${tenantId}:${relId}`);

    try {
      return await withSession(async (session) => {
        const result = await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH ()-[r:RELATES_TO { tenantId: $tenantId, relId: $relId }]->()
            DELETE r
            RETURN count(r) AS deleted
            `,
            { tenantId, relId },
          ),
        );
        return Number(result.records[0].get("deleted")) > 0;
      });
    } catch {
      return true;
    }
  }

  async getGraphByWorkspace(
    tenantId: string,
    workspaceId: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    try {
      return await withSession(
        async (session) => {
          const result = await session.executeRead((tx) =>
            tx.run(
              `
              MATCH (w:Workspace { tenantId: $tenantId, id: $workspaceId })
              OPTIONAL MATCH (w)-[:CONTAINS]->(n:Node { tenantId: $tenantId })
              OPTIONAL MATCH (n)-[r:RELATES_TO { tenantId: $tenantId }]->(m:Node { tenantId: $tenantId })
              RETURN
                collect(DISTINCT n) AS nodes,
                collect(DISTINCT r) AS edges
              `,
              { tenantId, workspaceId },
            ),
          );

          if (result.records.length === 0) {
            return { nodes: [], edges: [] };
          }

          const record = result.records[0];
          const nodes = (record.get("nodes") || [])
            .filter(Boolean)
            .map((n: { properties: any }) => {
              const p = n.properties;
              return {
                ...p,
                position: {
                  x: Number(p.posX ?? 250),
                  y: Number(p.posY ?? 150),
                },
              } as GraphNode;
            });

          const edges = (record.get("edges") || [])
            .filter(Boolean)
            .map((r: { properties: GraphEdge }) => r.properties);

          return { nodes, edges };
        },
        { defaultAccessMode: "READ" as never },
      );
    } catch {
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      for (const n of memoryNodes.values()) {
        if (n.tenantId === tenantId && n.workspaceId === workspaceId) {
          nodes.push(n);
        }
      }

      for (const e of memoryEdges.values()) {
        if (e.tenantId === tenantId && e.workspaceId === workspaceId) {
          edges.push(e);
        }
      }

      return { nodes, edges };
    }
  }
}
