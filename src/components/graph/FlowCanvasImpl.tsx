"use client";

// =============================================================================
// Presentation Layer — React Flow Investigation Canvas Implementation
// -----------------------------------------------------------------------------
// Core interactive canvas component wrapping @xyflow/react (React Flow v12).
// Implements demo-mode gatekeeping, action guards, conflict resolution modal,
// adaptive InspectorSidebar (for both nodes & edges), and live mutations.
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";

import { CustomNodeCard } from "./CustomNodeCard";
import { CustomMarkerEdge } from "./CustomMarkerEdge";
import { NodeAdditionToolbar } from "./NodeAdditionToolbar";
import { InspectorSidebar, type ConnectedEdgeInfo } from "./InspectorSidebar";
import { ConflictResolverModal } from "./ConflictResolverModal";
import type {
  ReactFlowNodeData,
  ReactFlowEdgeData,
} from "@/services/graphService";
import type {
  NodeType,
  NodeStatus,
  EdgeDirectionality,
  EdgeLineStyle,
  WorkspaceRole,
  WorkspacePermissions,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Search,
  Maximize2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Lock,
  ArrowRight,
  Eye,
} from "lucide-react";

export interface FlowCanvasImplProps {
  investigationId: string;
  initialNodes: ReactFlowNodeData[];
  initialEdges: ReactFlowEdgeData[];
  investigationTitle?: string;
  investigationStatus?: string;
  isGuest?: boolean;
  userRole?: WorkspaceRole;
  userPermissions?: WorkspacePermissions;
  onRefresh?: () => void;
}

const nodeTypes = {
  customCard: CustomNodeCard,
};

const edgeTypes = {
  customMarker: CustomMarkerEdge,
};

function FlowCanvasInner({
  investigationId,
  initialNodes,
  initialEdges,
  investigationTitle,
  investigationStatus,
  isGuest = false,
  userRole = "OWNER",
  userPermissions,
  onRefresh,
}: FlowCanvasImplProps) {
  const { fitView } = useReactFlow();

  // Selected Entity State (Node or Edge for Adaptive Inspector)
  const [selectedEntity, setSelectedEntity] = useState<
    | { kind: "node"; node: any }
    | { kind: "edge"; edge: any }
    | null
  >(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Conflict Resolver State
  const [conflictedNodeToResolve, setConflictedNodeToResolve] = useState<any | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Guest Guard Dialog State
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guestGuardMessage, setGuestGuardMessage] = useState("Sign in to edit this node or connect edges.");

  const canEdit = !isGuest && (userPermissions?.canEdit ?? (userRole === "OWNER" || userRole === "EDITOR"));

  const handleOpenConflictResolver = useCallback((nodeId: string) => {
    const target = initialNodes.find((n) => n.id === nodeId);
    if (target) {
      setConflictedNodeToResolve({
        id: target.id,
        label: target.data.label,
        nodeType: target.data.nodeType,
        status: target.data.status,
        description: target.data.description,
        version: target.data.version,
        conflictedFields: target.data.conflictedFields,
      });
      setIsConflictModalOpen(true);
    }
  }, [initialNodes]);

  // Augment nodes with conflict callback
  const augmentedInitialNodes = useMemo(() => {
    return initialNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onOpenConflictResolver: handleOpenConflictResolver,
      },
    }));
  }, [initialNodes, handleOpenConflictResolver]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    augmentedInitialNodes as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges as Edge[],
  );

  // Keep nodes & edges synchronized with prop updates
  useEffect(() => {
    setNodes(augmentedInitialNodes as Node[]);
  }, [augmentedInitialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges as Edge[]);
  }, [initialEdges, setEdges]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const triggerGuestGuard = (msg = "Sign in to edit this node or connect edges.") => {
    setGuestGuardMessage(msg);
    setIsGuestGuardOpen(true);
  };

  // Node Map for rapid lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // All nodes formatted for inspector selection
  const allNodesFormatted = useMemo(() => {
    return nodes.map((n) => ({
      id: n.id,
      label: (n.data as any)?.label || n.id,
      nodeType: (n.data as any)?.nodeType || "System",
    }));
  }, [nodes]);

  // Connected edges computed for currently selected node
  const connectedEdgesForSelectedNode: ConnectedEdgeInfo[] = useMemo(() => {
    if (!selectedEntity || selectedEntity.kind !== "node") return [];
    const nodeId = selectedEntity.node.id;

    return edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => {
        const edgeData = (e.data as any) || {};
        const isOutgoing = e.source === nodeId;
        const otherId = isOutgoing ? e.target : e.source;
        const otherNode = nodeMap.get(otherId);
        const otherLabel = (otherNode?.data as any)?.label || otherId;

        const sourceNode = nodeMap.get(e.source);
        const targetNode = nodeMap.get(e.target);

        return {
          id: e.id,
          relId: edgeData.relId || e.id,
          sourceId: e.source,
          targetId: e.target,
          sourceLabel: (sourceNode?.data as any)?.label || e.source,
          targetLabel: (targetNode?.data as any)?.label || e.target,
          type: edgeData.type || "RELATES_TO",
          label: edgeData.label || edgeData.type || "RELATES_TO",
          directionality: edgeData.directionality || "single",
          lineStyle: edgeData.lineStyle || "solid",
          strokeColor: edgeData.strokeColor || "#2563EB",
          isOutgoing,
        };
      });
  }, [selectedEntity, edges, nodeMap]);

  // ── 1. Create Node ──────────────────────────────────────────────────────────
  const handleAddNode = useCallback(
    async (payload: {
      label: string;
      nodeType: NodeType;
      status: NodeStatus;
      subtitle?: string;
      description?: string;
    }) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to add new evidence and entity nodes to the graph.");
        return;
      }

      setIsSaving(true);
      try {
        const posX = 300 + Math.random() * 200;
        const posY = 200 + Math.random() * 150;

        const res = await fetch("/api/graph/node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: investigationId,
            label: payload.label,
            nodeType: payload.nodeType,
            status: payload.status,
            subtitle: payload.subtitle,
            description: payload.description,
            position: { x: posX, y: posY },
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Creation failed");

        const newNode: Node = {
          id: json.data.id,
          type: "customCard",
          position: { x: posX, y: posY },
          data: {
            ...json.data,
            onOpenConflictResolver: handleOpenConflictResolver,
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setSelectedEntity({ kind: "node", node: newNode });
        showStatus(`Created node: ${payload.label}`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Error: ${err.message}`);
      } finally {
        setIsSaving(false);
      }
    },
    [investigationId, setNodes, canEdit, handleOpenConflictResolver, onRefresh],
  );

  // ── 2. Update Node ──────────────────────────────────────────────────────────
  const handleUpdateNode = useCallback(
    async (nodeId: string, updates: {
      label: string;
      nodeType: NodeType;
      status: NodeStatus;
      subtitle?: string;
      description?: string;
      properties?: Record<string, any>;
    }) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to modify entity properties and evidence.");
        return;
      }

      try {
        const res = await fetch("/api/graph/node", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: nodeId,
            workspaceId: investigationId,
            ...updates,
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Update failed");

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === nodeId) {
              const updatedData = { ...n.data, ...updates };
              return { ...n, data: updatedData };
            }
            return n;
          })
        );

        setSelectedEntity((prev) => {
          if (prev && prev.kind === "node" && prev.node.id === nodeId) {
            return {
              kind: "node",
              node: {
                ...prev.node,
                data: { ...prev.node.data, ...updates },
              },
            };
          }
          return prev;
        });

        showStatus(`Updated ${updates.label}`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Update error: ${err.message}`);
      }
    },
    [investigationId, setNodes, canEdit, onRefresh],
  );

  // ── 3. Delete Node ──────────────────────────────────────────────────────────
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to remove elements from the investigation graph.");
        return;
      }

      try {
        const res = await fetch("/api/graph/node", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: nodeId,
            workspaceId: investigationId,
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Delete failed");

        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedEntity(null);
        showStatus("Element removed from investigation.");
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Delete error: ${err.message}`);
      }
    },
    [investigationId, setNodes, setEdges, canEdit, onRefresh],
  );

  // ── 4. Create Connection (Edge) ─────────────────────────────────────────────
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to draw relationships and connect entities on the canvas.");
        return;
      }

      if (!connection.source || !connection.target) return;

      setIsSaving(true);
      try {
        const res = await fetch("/api/graph/edge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: investigationId,
            sourceId: connection.source,
            targetId: connection.target,
            type: "RELATES_TO",
            label: "RELATES TO",
            directionality: "single",
            lineStyle: "solid",
            strokeColor: "#2563EB",
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Failed to create edge");

        const sourceNode = nodeMap.get(connection.source);
        const targetNode = nodeMap.get(connection.target);

        const newEdge: Edge = {
          id: `edge_${json.data.relId}`,
          source: connection.source,
          target: connection.target,
          type: "customMarker",
          data: {
            relId: json.data.relId,
            type: "RELATES_TO",
            label: "RELATES TO",
            directionality: "single",
            lineStyle: "solid",
            strokeColor: "#2563EB",
            weight: 1.5,
            properties: {},
          },
        };

        setEdges((eds) => addEdge(newEdge, eds));
        setSelectedEntity({
          kind: "edge",
          edge: {
            ...newEdge,
            sourceLabel: (sourceNode?.data as any)?.label || connection.source,
            targetLabel: (targetNode?.data as any)?.label || connection.target,
          },
        });
        showStatus("Connection established.");
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Connection error: ${err.message}`);
      } finally {
        setIsSaving(false);
      }
    },
    [investigationId, setEdges, canEdit, nodeMap, onRefresh],
  );

  // ── 5. Add Relationship from Inspector ─────────────────────────────────────
  const handleAddRelationshipFromInspector = useCallback(
    async (sourceId: string, targetId: string, relType: string) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to connect elements.");
        return;
      }

      try {
        const res = await fetch("/api/graph/edge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: investigationId,
            sourceId,
            targetId,
            type: relType,
            label: relType,
            directionality: "single",
            lineStyle: "solid",
            strokeColor: "#2563EB",
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Failed to create edge");

        const newEdge: Edge = {
          id: `edge_${json.data.relId}`,
          source: sourceId,
          target: targetId,
          type: "customMarker",
          data: {
            relId: json.data.relId,
            type: relType,
            label: relType,
            directionality: "single",
            lineStyle: "solid",
            strokeColor: "#2563EB",
            weight: 1.5,
            properties: {},
          },
        };

        setEdges((eds) => addEdge(newEdge, eds));
        showStatus(`Created relationship: ${relType}`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Error: ${err.message}`);
      }
    },
    [investigationId, setEdges, canEdit, onRefresh],
  );

  // ── 6. Node Drag Stop (Position Sync) ───────────────────────────────────────
  const onNodeDragStop = useCallback(
    async (_event: any, node: Node) => {
      if (!canEdit) return; // In demo mode, drag is visual-only

      try {
        await fetch("/api/graph/node", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: node.id,
            workspaceId: investigationId,
            position: node.position,
            positionOnly: true,
          }),
        });
      } catch (err) {
        console.warn("Failed to persist node position:", err);
      }
    },
    [investigationId, canEdit],
  );

  // ── 7. Node Click & Edge Click Handler ──────────────────────────────────────
  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    setSelectedEntity({
      kind: "node",
      node,
    });
  }, []);

  const onEdgeClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    setSelectedEntity({
      kind: "edge",
      edge: {
        ...edge,
        sourceLabel: (sourceNode?.data as any)?.label || edge.source,
        targetLabel: (targetNode?.data as any)?.label || edge.target,
      },
    });
  }, [nodeMap]);

  const onPaneClick = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  // ── 8. Update / Delete Edge ────────────────────────────────────────────────
  const handleUpdateEdge = useCallback(
    async (updates: {
      relId: string;
      type?: string;
      label?: string;
      directionality?: EdgeDirectionality;
      lineStyle?: EdgeLineStyle;
      strokeColor?: string;
      weight?: number;
    }) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to customize edge properties and connection styles.");
        return;
      }

      try {
        const res = await fetch("/api/graph/edge", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: investigationId,
            ...updates,
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Failed to update edge");

        setEdges((eds) =>
          eds.map((e) => {
            if ((e.data as any)?.relId === updates.relId) {
              return {
                ...e,
                data: {
                  ...e.data,
                  ...updates,
                },
              };
            }
            return e;
          }),
        );

        setSelectedEntity((prev) => {
          if (prev && prev.kind === "edge") {
            return {
              kind: "edge",
              edge: {
                ...prev.edge,
                data: {
                  ...prev.edge.data,
                  ...updates,
                },
              },
            };
          }
          return prev;
        });

        showStatus("Edge styling updated.");
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Edge update error: ${err.message}`);
      }
    },
    [investigationId, setEdges, canEdit, onRefresh],
  );

  const handleDeleteEdge = useCallback(
    async (relId: string) => {
      if (!canEdit) {
        triggerGuestGuard("Sign in to remove relationships from the graph.");
        return;
      }

      try {
        const res = await fetch("/api/graph/edge", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: investigationId,
            relId,
          }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Delete failed");

        setEdges((eds) => eds.filter((e) => (e.data as any)?.relId !== relId));
        setSelectedEntity(null);
        showStatus("Relationship deleted.");
        if (onRefresh) onRefresh();
      } catch (err: any) {
        showStatus(`Delete error: ${err.message}`);
      }
    },
    [investigationId, setEdges, canEdit, onRefresh],
  );

  // ── 9. Switch entity selection from inspector ──────────────────────────────
  const handleSelectEntity = useCallback(
    (kind: "node" | "edge", id: string) => {
      if (kind === "node") {
        const target = nodes.find((n) => n.id === id);
        if (target) setSelectedEntity({ kind: "node", node: target });
      } else {
        const target = edges.find((e) => e.id === id || (e.data as any)?.relId === id);
        if (target) {
          const sourceNode = nodeMap.get(target.source);
          const targetNode = nodeMap.get(target.target);
          setSelectedEntity({
            kind: "edge",
            edge: {
              ...target,
              sourceLabel: (sourceNode?.data as any)?.label || target.source,
              targetLabel: (targetNode?.data as any)?.label || target.target,
            },
          });
        }
      }
    },
    [nodes, edges, nodeMap],
  );

  // ── 10. Filtering & Search Logic ───────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    return nodes.map((node) => {
      const data = node.data as any;
      const matchesSearch =
        !searchQuery ||
        data.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "ALL" || data.nodeType === typeFilter;
      const isVisible = matchesSearch && matchesType;

      return {
        ...node,
        hidden: !isVisible,
      };
    });
  }, [nodes, searchQuery, typeFilter]);

  const conflictsCount = useMemo(() => {
    return nodes.filter((n) => (n.data as any)?.hasConflict).length;
  }, [nodes]);

  return (
    <div className="relative h-full w-full bg-background overflow-hidden select-none">
      {/* ── Demo Mode Banner ────────────────────────────────────────────────── */}
      {isGuest && (
        <div className="bg-gradient-to-r from-amber-600/90 via-indigo-600/90 to-blue-700/90 px-4 py-2 text-white text-xs flex items-center justify-between shadow-md z-30 relative">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="h-4 w-4 text-amber-200" />
            <span>
              <strong>Demo Mode (Read Only)</strong> — You are exploring this investigation as a guest viewer.
            </span>
          </div>
          <a href="/auth/login">
            <Button
              size="sm"
              variant="secondary"
              className="h-6 text-[11px] font-semibold gap-1 bg-white text-slate-900 hover:bg-white/90"
            >
              <Lock className="h-3 w-3" />
              <span>Sign in to Edit</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </a>
        </div>
      )}

      {/* ── Top Canvas Header Overlay ─────────────────────────────────────── */}
      <div className="absolute top-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Matter Header */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/85 px-4 py-2 shadow-lg backdrop-blur-md">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground">
                {investigationTitle || "Reconstruction Canvas"}
              </h3>
              {conflictsCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0 flex items-center gap-1 animate-pulse"
                >
                  <AlertCircle className="h-2.5 w-2.5" />
                  <span>{conflictsCount} Conflict{conflictsCount > 1 ? "s" : ""}</span>
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {investigationId.slice(0, 18)}... | {nodes.length} nodes · {edges.length} edges
            </p>
          </div>
        </div>

        {/* Right Search, Filter & View Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search elements..."
              className="h-8 w-44 pl-8 text-xs bg-card/85 backdrop-blur-md border-border/80"
            />
          </div>

          {/* Type Filter Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-card/85 px-2 text-xs text-foreground backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Types</option>
            <option value="Person">Person</option>
            <option value="Organization">Organization</option>
            <option value="AI System">AI System</option>
            <option value="Model">Model</option>
            <option value="Workflow">Workflow</option>
            <option value="Technical Resource">Technical Resource</option>
            <option value="Location">Location</option>
            <option value="Account">Account</option>
            <option value="System">System</option>
          </select>

          {/* Refresh Action */}
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8 bg-card/85 backdrop-blur-md border-border/80"
            title="Reload graph payload"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>

          {/* Fit View Action */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            className="h-8 w-8 bg-card/85 backdrop-blur-md border-border/80"
            title="Reset Canvas View"
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* ── Status Message Toast ──────────────────────────────────────────── */}
      {statusMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full border border-primary/40 bg-card/95 px-4 py-1.5 text-xs text-primary shadow-xl backdrop-blur-md animate-fade-in flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── React Flow Canvas Core ────────────────────────────────────────── */}
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="currentColor"
          className="text-muted-foreground/30 opacity-40"
        />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            switch ((node.data as any)?.nodeType) {
              case "Person":
                return "#A855F7";
              case "Organization":
                return "#D946EF";
              case "Location":
                return "#F59E0B";
              case "Account":
                return "#10B981";
              case "System":
              case "AI System":
                return "#0EA5E9";
              default:
                return "#3B82F6";
            }
          }}
          className="!rounded-xl !border !border-border/80 !bg-card/80 !backdrop-blur-md !shadow-lg overflow-hidden"
        />

        {/* Top Node Addition Toolbar: Rendered only when canEdit === true */}
        {canEdit && (
          <Panel position="top-center" className="!top-16">
            <NodeAdditionToolbar onAddNode={handleAddNode} isSaving={isSaving} />
          </Panel>
        )}
      </ReactFlow>

      {/* ── Adaptive Inspector Sidebar (Nodes & Edges) ───────────────────── */}
      <InspectorSidebar
        entity={selectedEntity}
        userRole={userRole}
        canEdit={canEdit}
        onClose={() => setSelectedEntity(null)}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onOpenConflictResolver={handleOpenConflictResolver}
        onUpdateEdge={handleUpdateEdge}
        onDeleteEdge={handleDeleteEdge}
        allNodes={allNodesFormatted}
        connectedEdges={connectedEdgesForSelectedNode}
        onAddRelationship={handleAddRelationshipFromInspector}
        onSelectEntity={handleSelectEntity}
      />

      {/* ── Visual Conflict Resolution Modal ──────────────────────────────── */}
      <ConflictResolverModal
        isOpen={isConflictModalOpen}
        onClose={() => {
          setIsConflictModalOpen(false);
          setConflictedNodeToResolve(null);
        }}
        investigationId={investigationId}
        node={conflictedNodeToResolve}
        onResolved={() => {
          showStatus("Conflict resolved and committed.");
          if (onRefresh) onRefresh();
        }}
      />

      {/* ── Guest Action Guard Dialog ─────────────────────────────────────── */}
      <Modal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        title="Authentication Required"
        className="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Read-Only Guest Mode
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {guestGuardMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGuestGuardOpen(false)}
              className="text-xs"
            >
              Continue Viewing
            </Button>
            <a href="/auth/login">
              <Button
                size="sm"
                className="text-xs font-semibold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign in with Auth0</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function FlowCanvasImpl(props: FlowCanvasImplProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
