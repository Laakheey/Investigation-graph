"use client";

// =============================================================================
// Presentation Layer — React Flow Investigation Canvas Implementation
// -----------------------------------------------------------------------------
// Core interactive canvas component wrapping @xyflow/react (React Flow v12).
// Implements custom node cards, bidirectional dynamic SVG edges, edge inspector,
// node addition toolbar, and live mutations against backend API routes.
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

// import "@xyflow/react/dist/style.css";

import { CustomNodeCard } from "./CustomNodeCard";
import { CustomMarkerEdge } from "./CustomMarkerEdge";
import { NodeAdditionToolbar } from "./NodeAdditionToolbar";
import { EdgeInspectorPanel } from "./EdgeInspectorPanel";
import type {
  ReactFlowNodeData,
  ReactFlowEdgeData,
} from "@/services/graphService";
import type {
  NodeType,
  NodeStatus,
  EdgeDirectionality,
  EdgeLineStyle,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Maximize2,
  RefreshCw,
  Download,
  Share2,
  Filter,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface FlowCanvasImplProps {
  investigationId: string;
  initialNodes: ReactFlowNodeData[];
  initialEdges: ReactFlowEdgeData[];
  investigationTitle?: string;
  investigationStatus?: string;
  onRefresh?: () => void;
}

// Fixed mapping to prevent re-creation on render
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
  onRefresh,
}: FlowCanvasImplProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    initialNodes as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges as Edge[],
  );

  const [selectedEdgeData, setSelectedEdgeData] = useState<any | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Sync state if initial props change
  useEffect(() => {
    setNodes(initialNodes as Node[]);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges as Edge[]);
  }, [initialEdges, setEdges]);

  // Show transient toast
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Node Drag Stop -> Persist coordinate to backend
  const onNodeDragStop = useCallback(
    async (_event: MouseEvent | TouchEvent, node: Node) => {
      try {
        await fetch("/api/graph/node", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeId: node.id,
            investigationId,
            position: {
              x: Math.round(node.position.x),
              y: Math.round(node.position.y),
            },
          }),
        });
      } catch (err) {
        console.error("Failed to persist node position:", err);
      }
    },
    [investigationId],
  );

  // Edge Connection -> Create Relationship via API
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;
      if (params.source === params.target) {
        showToast(
          "Self-referencing relationships are restricted in this investigation.",
          "error",
        );
        return;
      }

      setIsSaving(true);
      try {
        const res = await fetch("/api/graph/edge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            investigationId,
            sourceNodeId: params.source,
            targetNodeId: params.target,
            type: "ASSOCIATED_WITH",
            label: "ASSOCIATED_WITH",
            directionality: "single",
            lineStyle: "solid",
            strokeColor: "#64748B",
          }),
        });

        const json = await res.json();
        if (!json.success) {
          showToast(
            json.error?.message || "Failed to create connection",
            "error",
          );
          return;
        }

        const newEdge: ReactFlowEdgeData = {
          id: `e-${params.source}-${params.target}-${Date.now()}`,
          source: params.source,
          target: params.target,
          type: "customMarker",
          data: {
            relId: json.data?.id || `rel-${Date.now()}`,
            type: "ASSOCIATED_WITH",
            label: "ASSOCIATED_WITH",
            directionality: "single",
            lineStyle: "solid",
            strokeColor: "#64748B",
            properties: {},
          },
        };

        setEdges((eds) => addEdge(newEdge as Edge, eds));
        showToast("Relationship connected successfully.");
      } catch (err: any) {
        showToast(err.message || "Error creating relationship", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [investigationId, setEdges],
  );

  // Edge Selection
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const edgeData = edge.data as any;
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      setSelectedEdgeData({
        id: edge.id,
        relId: edgeData?.relId || edge.id,
        source: edge.source,
        target: edge.target,
        sourceLabel: (sourceNode?.data as any)?.label || edge.source,
        targetLabel: (targetNode?.data as any)?.label || edge.target,
        type: edgeData?.type || "ASSOCIATED_WITH",
        label: edgeData?.label || "",
        directionality: (edgeData?.directionality ||
          "single") as EdgeDirectionality,
        lineStyle: (edgeData?.lineStyle || "solid") as EdgeLineStyle,
        strokeColor: edgeData?.strokeColor || "#64748B",
      });
      setSelectedNodeData(null);
    },
    [nodes],
  );

  // Node Selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node);
    setSelectedEdgeData(null);
  }, []);

  // Canvas Click -> Deselect
  const onPaneClick = useCallback(() => {
    setSelectedEdgeData(null);
    setSelectedNodeData(null);
  }, []);

  // Update Edge Attributes via Inspector Panel
  // EdgeInspectorPanel calls onUpdateEdge(updates) without relId, so we
  // retrieve relId from the currently selected edge in local state.
  const handleUpdateEdge = useCallback(
    async (updates: {
      type?: string;
      label?: string;
      directionality?: EdgeDirectionality;
      lineStyle?: EdgeLineStyle;
      strokeColor?: string;
    }) => {
      if (!selectedEdgeData) return;
      const relId: string = selectedEdgeData.relId;

      setIsSaving(true);
      try {
        const res = await fetch("/api/graph/edge", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relId,
            investigationId,
            ...updates,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          showToast(
            json.error?.message || "Failed to update edge attributes",
            "error",
          );
          return;
        }

        // Update in React Flow local state
        setEdges((eds) =>
          eds.map((e) => {
            const d = e.data as any;
            if (d?.relId === relId || e.id === selectedEdgeData?.id) {
              return {
                ...e,
                data: { ...d, ...updates },
              };
            }
            return e;
          }),
        );

        // Keep panel open so user can make further adjustments
        setSelectedEdgeData((prev: any) =>
          prev ? { ...prev, ...updates } : null,
        );
        showToast("Relationship styling updated.");
      } catch (err: any) {
        showToast(err.message || "Error updating edge", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [investigationId, selectedEdgeData, setEdges],
  );

  // Delete Edge
  const handleDeleteEdge = useCallback(
    async (relId: string) => {
      setIsSaving(true);
      try {
        const res = await fetch(
          `/api/graph/edge?investigationId=${encodeURIComponent(
            investigationId,
          )}&relId=${encodeURIComponent(relId)}`,
          { method: "DELETE" },
        );

        const json = await res.json();
        if (!json.success) {
          showToast(
            json.error?.message || "Failed to delete relationship",
            "error",
          );
          return;
        }

        setEdges((eds) =>
          eds.filter(
            (e) =>
              (e.data as any)?.relId !== relId && e.id !== selectedEdgeData?.id,
          ),
        );
        setSelectedEdgeData(null);
        showToast("Relationship removed.");
      } catch (err: any) {
        showToast(err.message || "Error deleting relationship", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [investigationId, selectedEdgeData, setEdges],
  );

  // Add Node from Palette Toolbar
  const handleAddNode = useCallback(
    async (payload: {
      label: string;
      nodeType: NodeType;
      status: NodeStatus;
      citationsCount: number;
      subtitle?: string;
      description?: string;
      position?: { x: number; y: number };
    }) => {
      setIsSaving(true);
      try {
        const res = await fetch("/api/graph/node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            investigationId,
            label: payload.label,
            nodeType: payload.nodeType,
            status: payload.status,
            citationsCount: payload.citationsCount,
            subtitle: payload.subtitle,
            description: payload.description,
            position: payload.position || {
              x: Math.round(150 + Math.random() * 300),
              y: Math.round(150 + Math.random() * 200),
            },
          }),
        });

        const json = await res.json();
        if (!json.success) {
          showToast(
            json.error?.message || "Failed to create entity node",
            "error",
          );
          return;
        }

        const newNode: ReactFlowNodeData = {
          id: json.data?.id || `node-${Date.now()}`,
          type: "customCard",
          position: json.data?.position || { x: 200, y: 200 },
          data: {
            label: json.data?.label || payload.label,
            nodeType: json.data?.nodeType || payload.nodeType,
            status: json.data?.status || payload.status,
            citationsCount: json.data?.citationsCount ?? payload.citationsCount,
            subtitle: json.data?.subtitle || payload.subtitle,
            description: json.data?.description || payload.description,
            properties: json.data?.properties || {},
            createdAt: json.data?.createdAt || new Date().toISOString(),
          },
        };

        setNodes((nds) => [...nds, newNode as Node]);
        showToast(`Created entity: ${payload.label}`);
      } catch (err: any) {
        showToast(err.message || "Error adding node", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [investigationId, setNodes],
  );

  // Filter and Search Nodes
  const filteredNodes = useMemo(() => {
    return nodes.map((node) => {
      const data = node.data as any;
      const matchesSearch =
        !searchQuery ||
        data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data?.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data?.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "ALL" || data?.nodeType === typeFilter;
      const isVisible = matchesSearch && matchesType;

      return {
        ...node,
        style: {
          ...node.style,
          opacity: isVisible ? 1 : 0.2,
          transition: "opacity 0.2s ease-in-out",
        },
      };
    });
  }, [nodes, searchQuery, typeFilter]);

  // Export Graph as JSON
  const handleExportJSON = () => {
    const data = {
      investigationId,
      exportedAt: new Date().toISOString(),
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, ...n.data })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...e.data,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investigation-${investigationId}-graph.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Graph schema exported to JSON.");
  };

  return (
    <div className="relative w-full h-full bg-[#0A0D14] overflow-hidden select-none">
      {/* Live Notification Banner */}
      {notification && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-xl text-xs font-medium border flex items-center gap-2 backdrop-blur-md transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          {notification.message}
        </div>
      )}

      {/* Top Header Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-lg border border-border shadow-xl">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Search entities, roles, tags..."
              className="h-8 pl-8 pr-3 w-56 text-xs bg-card/60 border-input font-sans text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setTypeFilter(e.target.value)
            }
            className="h-8 text-xs rounded-md bg-card/60 border border-input text-foreground px-2 focus:outline-none"
          >
            <option value="ALL">All Types ({nodes.length})</option>
            <option value="Person">Persons</option>
            <option value="Organization">Organizations</option>
            <option value="Location">Locations</option>
            <option value="Account">Accounts</option>
            <option value="System">Systems</option>
          </select>
        </div>

        {/* Center: Investigation Matter Status */}
        {investigationTitle && (
          <div className="pointer-events-auto flex items-center gap-2.5 bg-[#111827]/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-border shadow-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-foreground tracking-wide">
              {investigationTitle}
            </span>
            {investigationStatus && (
              <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary-foreground px-1.5 py-0.5 rounded border border-primary/30">
                {investigationStatus}
              </span>
            )}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-lg border border-border shadow-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fitView({ duration: 400, padding: 0.2 })}
            title="Fit to Canvas"
            className="h-8 px-2.5 text-xs text-foreground hover:bg-muted"
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1" />
            Fit View
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            title="Refresh from Neo4j & Redis"
            className="h-8 px-2.5 text-xs text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Sync
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportJSON}
            title="Export Graph JSON"
            className="h-8 px-2.5 text-xs text-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Floating Node Palette Toolbar */}
      <NodeAdditionToolbar onAddNode={handleAddNode} />

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: "customMarker",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
          className="opacity-40"
        />
        <Controls
          position="bottom-left"
          className="bg-card/90 border border-border shadow-xl rounded-lg overflow-hidden fill-foreground text-foreground"
        />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={2}
          nodeColor={(node: any) => {
            const type = node.data?.nodeType;
            if (type === "Person") return "#3B82F6";
            if (type === "Organization") return "#10B981";
            if (type === "Location") return "#F59E0B";
            if (type === "Account") return "#8B5CF6";
            if (type === "System") return "#EC4899";
            return "#64748B";
          }}
          maskColor="rgba(10, 13, 20, 0.75)"
          className="bg-card/90 border border-border rounded-lg shadow-xl !bottom-4 !right-4"
        />
      </ReactFlow>

      {/* Edge Inspector Panel Drawer */}
      <EdgeInspectorPanel
        edge={selectedEdgeData}
        onClose={() => setSelectedEdgeData(null)}
        onUpdateEdge={handleUpdateEdge}
        onDeleteEdge={handleDeleteEdge}
      />
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
