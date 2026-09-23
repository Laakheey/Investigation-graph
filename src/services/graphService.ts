// =============================================================================
// Business Logic Layer — Graph Service
// -----------------------------------------------------------------------------
// SOLID:
// - Dependency Inversion Principle (DIP): Injects IGraphRepository & ICacheService.
// - Single Responsibility Principle (SRP): Coordinates business domain transformations.
// =============================================================================

import { IGraphRepository, Neo4jGraphRepository } from "../db/graphRepository";
import {
  ICacheService,
  RedisCacheService,
  cacheServiceSingleton,
} from "./cacheService";
import type {
  GraphNode,
  GraphEdge,
  NodeType,
  NodeStatus,
  EdgeDirectionality,
  EdgeLineStyle,
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
  };
}

export interface GraphVisualizationPayload {
  nodes: ReactFlowNodeData[];
  edges: ReactFlowEdgeData[];
  stats: {
    nodeCount: number;
    edgeCount: number;
  };
}

export class GraphService {
  constructor(
    private readonly repository: IGraphRepository = new Neo4jGraphRepository(),
    private readonly cacheService: ICacheService = cacheServiceSingleton,
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
  ): Promise<GraphNode> {
    const created = await this.repository.createNode(tenantId, userId, payload);
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
    }>,
  ): Promise<GraphNode> {
    const updated = await this.repository.updateNode(tenantId, nodeId, updates);
    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return updated;
  }

  async updateNodePosition(
    tenantId: string,
    workspaceId: string,
    nodeId: string,
    position: { x: number; y: number },
  ): Promise<void> {
    await this.repository.updateNodePosition(tenantId, nodeId, position);
    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
  }

  async deleteNode(
    tenantId: string,
    workspaceId: string,
    nodeId: string,
  ): Promise<boolean> {
    const deleted = await this.repository.deleteNode(tenantId, nodeId);
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
  ): Promise<GraphEdge> {
    const created = await this.repository.createEdge(tenantId, payload);
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
    }>,
  ): Promise<GraphEdge> {
    const updated = await this.repository.updateEdge(tenantId, relId, updates);
    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return updated;
  }

  async deleteEdge(
    tenantId: string,
    workspaceId: string,
    relId: string,
  ): Promise<boolean> {
    const deleted = await this.repository.deleteEdge(tenantId, relId);
    await this.cacheService.invalidateInvestigationGraph(tenantId, workspaceId);
    return deleted;
  }

  private mapDomainToReactFlow(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): GraphVisualizationPayload {
    const rfNodes: ReactFlowNodeData[] = nodes.map((node) => ({
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
        properties: node.properties,
        createdAt: node.createdAt,
        createdBy: node.createdBy,
      },
    }));

    const rfEdges: ReactFlowEdgeData[] = edges.map((edge) => ({
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
      },
    }));

    return {
      nodes: rfNodes,
      edges: rfEdges,
      stats: {
        nodeCount: rfNodes.length,
        edgeCount: rfEdges.length,
      },
    };
  }
}

export const graphServiceSingleton = new GraphService();
