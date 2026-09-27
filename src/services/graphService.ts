// =============================================================================
// Business Logic Layer — Graph Service with Audit & Concurrency Conflict Tracking
// -----------------------------------------------------------------------------
// SOLID:
// - Dependency Inversion Principle (DIP): Injects IGraphRepository & ICacheService.
// - Single Responsibility Principle (SRP): Coordinates domain transformations and audits.
// =============================================================================

import { IGraphRepository, Neo4jGraphRepository } from "../db/graphRepository";
import {
  ICacheService,
  RedisCacheService,
  cacheServiceSingleton,
} from "./cacheService";
import { auditServiceSingleton, AuditService } from "./auditService";
import type {
  GraphNode,
  GraphEdge,
  NodeType,
  NodeStatus,
  EdgeDirectionality,
  EdgeLineStyle,
  ConflictedFieldData,
} from "../types/domain";

export interface ReactFlowNodeData {
  id: string;
  type: "customCard";
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: NodeType;
    status: NodeStatus;
    citationsCount: number;
    subtitle?: string;
    description?: string;
    properties: Record<string, string | number | boolean>;
    createdAt: string;
    createdBy?: string;
    updatedBy?: string;
    version: number;
    hasConflict?: boolean;
    conflictedFields?: Record<string, ConflictedFieldData>;
  };
}

export interface ReactFlowEdgeData {
  id: string;
  source: string;
  target: string;
  type: "customMarker";
  data: {
    relId: string;
    type: string;
    label: string;
    directionality: EdgeDirectionality;
    lineStyle: EdgeLineStyle;
    strokeColor: string;
    weight?: number;
    properties: Record<string, string | number | boolean>;
    version: number;
    hasConflict?: boolean;
    conflictedFields?: Record<string, ConflictedFieldData>;
  };
}

export interface GraphVisualizationPayload {
  nodes: ReactFlowNodeData[];
  edges: ReactFlowEdgeData[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    conflictCount: number;
  };
}

export class GraphService {
  constructor(
    private readonly repository: IGraphRepository = new Neo4jGraphRepository(),
    private readonly cacheService: ICacheService = cacheServiceSingleton,
    private readonly auditService: AuditService = auditServiceSingleton,
  ) {}

  async getGraphForInvestigation(
    tenantId: string,
    investigationId: string,
  ): Promise<GraphVisualizationPayload> {
    const cacheKey = RedisCacheService.getInvestigationGraphKey(
      tenantId,
      investigationId,
    );

    // 1. Cache Read
    const cached =
      await this.cacheService.get<GraphVisualizationPayload>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Cache Miss — Read from Neo4j
    const raw = await this.repository.getGraphByWorkspace(
      tenantId,
      investigationId,
    );

    // Auto seed initial nodes if brand new investigation
    if (raw.nodes.length === 0) {
      const n1 = await this.repository.createNode(tenantId, "system", {
        workspaceId: investigationId,
        label: "David Vance",
        nodeType: "Person",
        status: "Active",
        citationsCount: 4,
        subtitle: "Managing Director / Chief Executive",
        description: "Key subject identified in compliance matter intake.",
        position: { x: 220, y: 160 },
      });

      const n2 = await this.repository.createNode(tenantId, "system", {
        workspaceId: investigationId,
        label: "Apex Systems Integration LLC",
        nodeType: "Organization",
        status: "Flagged",
        citationsCount: 8,
        subtitle: "Primary Operating Entity",
        description: "Vendor supplying automated algorithmic decision systems.",
        position: { x: 620, y: 160 },
      });

      const n3 = await this.repository.createNode(tenantId, "system", {
        workspaceId: investigationId,
        label: "DecisionPipeline v3.4",
        nodeType: "System",
        status: "Active",
        citationsCount: 12,
        subtitle: "Automated Scoring Engine",
        description: "High-concurrency batch decision pipeline.",
        position: { x: 420, y: 380 },
      });

      await this.repository.createEdge(tenantId, {
        workspaceId: investigationId,
        sourceId: n1.id,
        targetId: n2.id,
        type: "CONTROLS",
        label: "CONTROLS (70% Equity)",
        directionality: "single",
        lineStyle: "solid",
        strokeColor: "#2563EB",
      });

      await this.repository.createEdge(tenantId, {
        workspaceId: investigationId,
        sourceId: n2.id,
        targetId: n3.id,
        type: "OPERATES",
        label: "OPERATES",
        directionality: "bidirectional",
        lineStyle: "dashed",
        strokeColor: "#DC2626",
      });

      // Refetch
      const re = await this.repository.getGraphByWorkspace(
        tenantId,
        investigationId,
      );
      raw.nodes = re.nodes;
      raw.edges = re.edges;
    }

    // 3. Map to React Flow data models
    const payload = this.mapDomainToReactFlow(raw.nodes, raw.edges);

    // 4. Cache Write
    await this.cacheService.set(cacheKey, payload);

    return payload;
  }

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
    userName = "Investigator",
  ): Promise<GraphNode> {
    const created = await this.repository.createNode(tenantId, userId, payload);

    // Audit Logging
    await this.auditService.logAction(tenantId, {
      action: "CREATE_NODE",
      userId,
      userName,
      entityType: "Node",
      entityId: created.id,
      workspaceId: payload.workspaceId,
      newValue: { label: created.label, nodeType: created.nodeType },
    });

    await this.cacheService.invalidateInvestigationGraph(
      tenantId,
      payload.workspaceId,
    );
    return created;
  }

  async updateNode(
    tenantId: string,
    workspaceId: string,
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
      expectedVersion?: number;
    }>,
    userId = "system",
    userName = "Investigator",
  ): Promise<{ node: GraphNode; hasConflict: boolean }> {
    const existing = await this.repository.getNodeById(tenantId, nodeId);

    // ── Concurrency Conflict Check ───────────────────────────────────────────
    if (
      existing &&
      updates.expectedVersion !== undefined &&
      existing.version > updates.expectedVersion
    ) {
      // Detected concurrent edit collision
      const conflictedFields: Record<string, ConflictedFieldData> = {};

      if (updates.label && updates.label !== existing.label) {
        conflictedFields.label = {
          originalValue: existing.label,
          currentValue: existing.label,
          incomingValue: updates.label,
          authorA: { userId: existing.updatedBy || existing.createdBy, name: "Previous Editor", timestamp: existing.updatedAt },
          authorB: { userId, name: userName, timestamp: new Date().toISOString() },
        };
      }

      if (updates.status && updates.status !== existing.status) {
        conflictedFields.status = {
          originalValue: existing.status,
          currentValue: existing.status,
          incomingValue: updates.status,
          authorA: { userId: existing.updatedBy || existing.createdBy, name: "Previous Editor", timestamp: existing.updatedAt },
          authorB: { userId, name: userName, timestamp: new Date().toISOString() },
        };
      }

      if (updates.description && updates.description !== existing.description) {
        conflictedFields.description = {
          originalValue: existing.description,
          currentValue: existing.description,
          incomingValue: updates.description,
          authorA: { userId: existing.updatedBy || existing.createdBy, name: "Previous Editor", timestamp: existing.updatedAt },
          authorB: { userId, name: userName, timestamp: new Date().toISOString() },
        };
      }

      const conflict = await this.auditService.flagConflict(
        tenantId,
        workspaceId,
        nodeId,
        "NODE",
        conflictedFields,
        userId,
        userName,
      );

      const conflictedNode: GraphNode = {
        ...existing,
        hasConflict: true,
        conflictedFields: conflict.conflictedFields,
      };

      await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
      return { node: conflictedNode, hasConflict: true };
    }

    // Normal safe update
    const updated = await this.repository.updateNode(tenantId, nodeId, {
      ...updates,
      updatedBy: userId,
    });

    // Audit Logging
    await this.auditService.logAction(tenantId, {
      action: "UPDATE_NODE_PROPERTIES",
      userId,
      userName,
      entityType: "Node",
      entityId: nodeId,
      workspaceId,
      previousValue: existing ? { label: existing.label, status: existing.status } : undefined,
      newValue: { label: updated.label, status: updated.status },
    });

    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return { node: updated, hasConflict: false };
  }

  async updateNodePosition(
    tenantId: string,
    workspaceId: string,
    nodeId: string,
    position: { x: number; y: number },
    userId = "system",
  ): Promise<void> {
    await this.repository.updateNodePosition(tenantId, nodeId, position, userId);
    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
  }

  async deleteNode(
    tenantId: string,
    workspaceId: string,
    nodeId: string,
    userId = "system",
    userName = "Investigator",
  ): Promise<boolean> {
    const existing = await this.repository.getNodeById(tenantId, nodeId);
    const deleted = await this.repository.deleteNode(tenantId, nodeId);

    if (deleted && existing) {
      await this.auditService.logAction(tenantId, {
        action: "DELETE_NODE",
        userId,
        userName,
        entityType: "Node",
        entityId: nodeId,
        workspaceId,
        previousValue: { label: existing.label, nodeType: existing.nodeType },
      });
    }

    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return deleted;
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
    userId = "system",
    userName = "Investigator",
  ): Promise<GraphEdge> {
    const created = await this.repository.createEdge(tenantId, {
      ...payload,
      createdBy: userId,
    });

    await this.auditService.logAction(tenantId, {
      action: "CREATE_EDGE",
      userId,
      userName,
      entityType: "Edge",
      entityId: created.relId,
      workspaceId: payload.workspaceId,
      newValue: { type: created.type, sourceId: created.sourceId, targetId: created.targetId },
    });

    await this.cacheService.invalidateInvestigationGraph(
      tenantId,
      payload.workspaceId,
    );
    return created;
  }

  async updateEdge(
    tenantId: string,
    workspaceId: string,
    relId: string,
    updates: Partial<{
      type: string;
      label: string;
      directionality: EdgeDirectionality;
      lineStyle: EdgeLineStyle;
      strokeColor: string;
      weight: number;
      properties: Record<string, string | number | boolean>;
      expectedVersion?: number;
    }>,
    userId = "system",
    userName = "Investigator",
  ): Promise<{ edge: GraphEdge; hasConflict: boolean }> {
    const existing = await this.repository.getEdgeById(tenantId, relId);

    const updated = await this.repository.updateEdge(tenantId, relId, {
      ...updates,
      updatedBy: userId,
    });

    await this.auditService.logAction(tenantId, {
      action: "UPDATE_EDGE_STYLING",
      userId,
      userName,
      entityType: "Edge",
      entityId: relId,
      workspaceId,
      previousValue: existing ? { type: existing.type, lineStyle: existing.lineStyle } : undefined,
      newValue: { type: updated.type, lineStyle: updated.lineStyle },
    });

    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return { edge: updated, hasConflict: false };
  }

  async deleteEdge(
    tenantId: string,
    workspaceId: string,
    relId: string,
    userId = "system",
    userName = "Investigator",
  ): Promise<boolean> {
    const existing = await this.repository.getEdgeById(tenantId, relId);
    const deleted = await this.repository.deleteEdge(tenantId, relId);

    if (deleted && existing) {
      await this.auditService.logAction(tenantId, {
        action: "DELETE_EDGE",
        userId,
        userName,
        entityType: "Edge",
        entityId: relId,
        workspaceId,
        previousValue: { type: existing.type, sourceId: existing.sourceId, targetId: existing.targetId },
      });
    }

    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return deleted;
  }

  private mapDomainToReactFlow(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): GraphVisualizationPayload {
    let conflictCount = 0;

    const rfNodes: ReactFlowNodeData[] = nodes.map((node) => {
      if (node.hasConflict) conflictCount++;
      return {
        id: node.id,
        type: "customCard",
        position: node.position || { x: 250, y: 150 },
        data: {
          label: node.label,
          nodeType: node.nodeType,
          status: node.status || "Active",
          citationsCount: node.citationsCount || 0,
          subtitle: node.subtitle,
          description: node.description,
          properties: node.properties || {},
          createdAt: node.createdAt,
          createdBy: node.createdBy,
          updatedBy: node.updatedBy,
          version: node.version || 1,
          hasConflict: node.hasConflict || false,
          conflictedFields: node.conflictedFields,
        },
      };
    });

    const rfEdges: ReactFlowEdgeData[] = edges.map((edge) => {
      if (edge.hasConflict) conflictCount++;
      return {
        id: `edge_${edge.relId}`,
        source: edge.sourceId,
        target: edge.targetId,
        type: "customMarker",
        data: {
          relId: edge.relId,
          type: edge.type,
          label: edge.label || edge.type,
          directionality: edge.directionality || "single",
          lineStyle: edge.lineStyle || "solid",
          strokeColor: edge.strokeColor || "#2563EB",
          weight: edge.weight ?? 1.5,
          properties: edge.properties || {},
          version: edge.version || 1,
          hasConflict: edge.hasConflict || false,
          conflictedFields: edge.conflictedFields,
        },
      };
    });

    return {
      nodes: rfNodes,
      edges: rfEdges,
      stats: {
        nodeCount: rfNodes.length,
        edgeCount: rfEdges.length,
        conflictCount,
      },
    };
  }
}

export const graphServiceSingleton = new GraphService();
