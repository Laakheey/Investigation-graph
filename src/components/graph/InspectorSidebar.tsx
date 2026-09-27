"use client";

// =============================================================================
// Presentation Layer — Adaptive Graph Inspector Sidebar
// -----------------------------------------------------------------------------
// Dynamically degrades interactive form controls (<Select>, <Input>, <Textarea>)
// into static typography (<p>, <div> badges) when canEdit === false (Guest / Viewer).
// Handles both Node and Edge entities with full domain typing and RBAC scoping.
// =============================================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Sparkles,
  GitMerge,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  Link as LinkIcon,
  Tag,
  Check,
  Save,
  Layers,
  Info,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type {
  NodeType,
  NodeStatus,
  EdgeDirectionality,
  EdgeLineStyle,
  WorkspaceRole,
} from "@/types/domain";

export interface InspectorEntityNode {
  id: string;
  type?: string;
  data: {
    label: string;
    nodeType: NodeType;
    status?: NodeStatus;
    citationsCount?: number;
    subtitle?: string;
    description?: string;
    properties?: Record<string, string | number | boolean>;
    version?: number;
    hasConflict?: boolean;
    conflictedFields?: Record<string, any>;
    createdBy?: string;
    updatedBy?: string;
    [key: string]: any;
  };
}

export interface InspectorEntityEdge {
  id: string;
  relId?: string;
  source: string;
  target: string;
  sourceLabel?: string;
  targetLabel?: string;
  type?: string;
  label?: string;
  directionality?: EdgeDirectionality;
  lineStyle?: EdgeLineStyle;
  strokeColor?: string;
  weight?: number;
  properties?: Record<string, any>;
  data?: {
    relId?: string;
    type?: string;
    label?: string;
    directionality?: EdgeDirectionality;
    lineStyle?: EdgeLineStyle;
    strokeColor?: string;
    weight?: number;
    properties?: Record<string, any>;
    [key: string]: any;
  };
}

export interface ConnectedEdgeInfo {
  id: string;
  relId: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  type: string;
  label: string;
  directionality: EdgeDirectionality;
  lineStyle: EdgeLineStyle;
  strokeColor: string;
  isOutgoing: boolean;
}

export interface InspectorSidebarProps {
  entity: { kind: "node"; node: InspectorEntityNode } | { kind: "edge"; edge: InspectorEntityEdge } | null;
  userRole?: WorkspaceRole;
  canEdit?: boolean;
  onClose: () => void;
  // Node mutation callbacks
  onUpdateNode?: (nodeId: string, updates: {
    label: string;
    nodeType: NodeType;
    status: NodeStatus;
    subtitle?: string;
    description?: string;
    properties?: Record<string, any>;
  }) => Promise<void> | void;
  onDeleteNode?: (nodeId: string) => Promise<void> | void;
  onOpenConflictResolver?: (nodeId: string) => void;
  // Edge mutation callbacks
  onUpdateEdge?: (updates: {
    relId: string;
    type?: string;
    label?: string;
    directionality?: EdgeDirectionality;
    lineStyle?: EdgeLineStyle;
    strokeColor?: string;
    weight?: number;
  }) => Promise<void> | void;
  onDeleteEdge?: (relId: string) => Promise<void> | void;
  // Contextual data
  allNodes?: Array<{ id: string; label: string; nodeType: string }>;
  connectedEdges?: ConnectedEdgeInfo[];
  onAddRelationship?: (sourceId: string, targetId: string, type: string) => Promise<void> | void;
  onSelectEntity?: (kind: "node" | "edge", id: string) => void;
}

const CATEGORY_OPTIONS: Array<{ label: string; value: string; color: string; bg: string }> = [
  { label: "Person", value: "Person", color: "text-purple-400", bg: "bg-purple-500/15" },
  { label: "Organization", value: "Organization", color: "text-fuchsia-400", bg: "bg-fuchsia-500/15" },
  { label: "AI System", value: "AI System", color: "text-sky-400", bg: "bg-sky-500/15" },
  { label: "Model", value: "Model", color: "text-indigo-400", bg: "bg-indigo-500/15" },
  { label: "Workflow", value: "Workflow", color: "text-cyan-400", bg: "bg-cyan-500/15" },
  { label: "Technical Resource", value: "Technical Resource", color: "text-teal-400", bg: "bg-teal-500/15" },
  { label: "Consequential Conduct", value: "Consequential Conduct", color: "text-rose-400", bg: "bg-rose-500/15" },
  { label: "Other Relevant Element", value: "Other Relevant Element", color: "text-slate-400", bg: "bg-slate-500/15" },
  { label: "Location", value: "Location", color: "text-amber-400", bg: "bg-amber-500/15" },
  { label: "Account", value: "Account", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { label: "System", value: "System", color: "text-blue-400", bg: "bg-blue-500/15" },
];

const STATUS_OPTIONS: Array<{ label: string; value: NodeStatus; badgeClass: string }> = [
  { label: "Active", value: "Active", badgeClass: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  { label: "Verified", value: "Verified", badgeClass: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  { label: "Flagged", value: "Flagged", badgeClass: "border-rose-500/30 text-rose-400 bg-rose-500/10" },
  { label: "Pending", value: "Pending", badgeClass: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  { label: "Archived", value: "Archived", badgeClass: "border-slate-500/30 text-slate-400 bg-slate-500/10" },
];

const COLOR_PRESETS = [
  { name: "Blue Primary", hex: "#2563EB", bg: "bg-blue-600" },
  { name: "Red Alert", hex: "#DC2626", bg: "bg-red-600" },
  { name: "Green Verified", hex: "#16A34A", bg: "bg-emerald-600" },
  { name: "Amber Suspect", hex: "#D97706", bg: "bg-amber-600" },
  { name: "Purple Legal", hex: "#9333EA", bg: "bg-purple-600" },
  { name: "Cyan Tech", hex: "#0EA5E9", bg: "bg-cyan-600" },
];

const PRESET_RELATIONSHIPS = [
  "RELATES_TO",
  "OPERATED_BY",
  "CONTROLS",
  "PROVIDES_INPUT_TO",
  "RELIES_ON",
  "EMPLOYED_BY",
  "FUNDED_BY",
  "TRANSACTED_WITH",
  "GOVERNED_BY",
  "LOCATED_AT",
  "CAUSED_IMPACT",
];

export function InspectorSidebar({
  entity,
  userRole = "OWNER",
  canEdit = true,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onOpenConflictResolver,
  onUpdateEdge,
  onDeleteEdge,
  allNodes = [],
  connectedEdges = [],
  onAddRelationship,
  onSelectEntity,
}: InspectorSidebarProps) {
  if (!entity) return null;

  const isNode = entity.kind === "node";
  const node = isNode ? entity.node : null;
  const edge = !isNode ? entity.edge : null;

  // ── Node Form State ────────────────────────────────────────────────────────
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeType, setNodeType] = useState<NodeType>("Person");
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>("Active");
  const [nodeSubtitle, setNodeSubtitle] = useState("");
  const [nodeDescription, setNodeDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Relationship Inline State (when editing a node)
  const [isAddingRel, setIsAddingRel] = useState(false);
  const [newRelTargetId, setNewRelTargetId] = useState("");
  const [newRelType, setNewRelType] = useState("RELATES_TO");

  // ── Edge Form State ────────────────────────────────────────────────────────
  const edgeData = edge?.data || edge || {};
  const relId = edgeData.relId || edge?.relId || edge?.id || "";
  const [edgeType, setEdgeType] = useState(edgeData.type || "RELATES_TO");
  const [edgeLabel, setEdgeLabel] = useState(edgeData.label || edgeData.type || "RELATES_TO");
  const [edgeDirectionality, setEdgeDirectionality] = useState<EdgeDirectionality>(
    edgeData.directionality || "single"
  );
  const [edgeLineStyle, setEdgeLineStyle] = useState<EdgeLineStyle>(
    edgeData.lineStyle || "solid"
  );
  const [edgeStrokeColor, setEdgeStrokeColor] = useState(
    edgeData.strokeColor || "#2563EB"
  );

  // Sync Node state
  useEffect(() => {
    if (node) {
      setNodeLabel(node.data.label || "");
      setNodeType(node.data.nodeType || "Person");
      setNodeStatus(node.data.status || "Active");
      setNodeSubtitle(node.data.subtitle || "");
      setNodeDescription(node.data.description || "");
      setIsAddingRel(false);
      setSaveSuccess(false);
    }
  }, [node]);

  // Sync Edge state
  useEffect(() => {
    if (edge) {
      const d = edge.data || edge;
      setEdgeType(d.type || "RELATES_TO");
      setEdgeLabel(d.label || d.type || "RELATES_TO");
      setEdgeDirectionality(d.directionality || "single");
      setEdgeLineStyle(d.lineStyle || "solid");
      setEdgeStrokeColor(d.strokeColor || "#2563EB");
      setSaveSuccess(false);
    }
  }, [edge]);

  // Handle Node Save
  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!node || !canEdit || !onUpdateNode) return;
    setIsSubmitting(true);
    try {
      await onUpdateNode(node.id, {
        label: nodeLabel.trim(),
        nodeType,
        status: nodeStatus,
        subtitle: nodeSubtitle.trim(),
        description: nodeDescription.trim(),
        properties: node.data.properties,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edge Save
  const handleSaveEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relId || !canEdit || !onUpdateEdge) return;
    setIsSubmitting(true);
    try {
      await onUpdateEdge({
        relId,
        type: edgeType.toUpperCase(),
        label: edgeLabel.trim() || edgeType.toUpperCase(),
        directionality: edgeDirectionality,
        lineStyle: edgeLineStyle,
        strokeColor: edgeStrokeColor,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Relationship from Node
  const handleCreateRelationship = async () => {
    if (!node || !newRelTargetId || !onAddRelationship) return;
    setIsSubmitting(true);
    try {
      await onAddRelationship(node.id, newRelTargetId, newRelType);
      setIsAddingRel(false);
      setNewRelTargetId("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category Configuration Match
  const categoryConfig =
    CATEGORY_OPTIONS.find((c) => c.value === (isNode ? (canEdit ? nodeType : node?.data.nodeType) : "System")) ||
    CATEGORY_OPTIONS[0];

  const statusConfig =
    STATUS_OPTIONS.find((s) => s.value === (isNode ? (canEdit ? nodeStatus : node?.data.status) : "Active")) ||
    STATUS_OPTIONS[0];

  return (
    <aside
      className="absolute top-4 right-4 bottom-4 z-30 w-84 sm:w-96 rounded-2xl border border-border/80 bg-card/95 p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden text-xs select-none animate-in slide-in-from-right-4 duration-200"
      aria-label="Investigation Inspector"
    >
      {/* ── 1. Header & Role Pill ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              {isNode ? "Element Inspector" : "Relationship Inspector"}
            </h3>
          </div>
          {/* RBAC Role Indicator */}
          <Badge
            variant="outline"
            className={`text-[9px] px-2 py-0.5 font-semibold ${
              canEdit
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                : "border-slate-500/30 text-muted-foreground bg-muted/40"
            }`}
          >
            {canEdit ? (
              <span className="flex items-center gap-1">
                <span>{userRole}</span>
                <span>(Editable)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                <span>Read-Only</span>
              </span>
            )}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80"
          title="Close inspector"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── 2. Scrollable Body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-5 custom-scrollbar">
        {/* ────────────────── NODE INSPECTION VIEW ────────────────────────── */}
        {isNode && node && (
          <>
            {/* Conflict Alert Banner if active */}
            {node.data.hasConflict && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-amber-300">
                    Concurrency Conflict Detected
                  </p>
                  <p className="text-[10px] text-amber-400/90 leading-relaxed">
                    This element has concurrent edits. Resolve conflicts before next commit.
                  </p>
                  {onOpenConflictResolver && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenConflictResolver(node.id)}
                      className="h-6 text-[10px] mt-1 gap-1 border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                    >
                      <GitMerge className="h-3 w-3" />
                      <span>Resolve 3-Way Merge</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ADAPTIVE FORM: Interactive for Editors vs Static Typography for Guests */}
            <form onSubmit={handleSaveNode} className="space-y-4">
              {/* Classification / Category Dropdown or Static Typography */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Category / Classification
                </label>
                {canEdit ? (
                  <select
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value as NodeType)}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${categoryConfig.bg} ${categoryConfig.color}`}
                    >
                      {node.data.nodeType}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Selector or Static Badge */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Verification Status
                </label>
                {canEdit ? (
                  <select
                    value={nodeStatus}
                    onChange={(e) => setNodeStatus(e.target.value as NodeStatus)}
                    className="w-full h-9 rounded-lg border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className={`text-xs px-2.5 py-0.5 font-medium ${statusConfig.badgeClass}`}
                    >
                      {node.data.status || "Active"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Title / Label Input or Static Typography */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Element Label / Name
                </label>
                {canEdit ? (
                  <Input
                    value={nodeLabel}
                    onChange={(e) => setNodeLabel(e.target.value)}
                    placeholder="Enter element name..."
                    className="h-9 text-xs bg-background/80 border-border/80"
                    required
                  />
                ) : (
                  <p className="text-sm font-bold text-foreground leading-snug">
                    {node.data.label}
                  </p>
                )}
              </div>

              {/* Subtitle / Role Tag */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Subtitle / Role Description
                </label>
                {canEdit ? (
                  <Input
                    value={nodeSubtitle}
                    onChange={(e) => setNodeSubtitle(e.target.value)}
                    placeholder="e.g., Primary Model / Decision Engine"
                    className="h-9 text-xs bg-background/80 border-border/80"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground font-medium">
                    {node.data.subtitle || "—"}
                  </p>
                )}
              </div>

              {/* Description / Evidence Findings */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Investigation Findings & Evidence
                </label>
                {canEdit ? (
                  <textarea
                    value={nodeDescription}
                    onChange={(e) => setNodeDescription(e.target.value)}
                    placeholder="Detailed evidence description, audit log findings, and legal context..."
                    rows={4}
                    className="w-full rounded-lg border border-border/80 bg-background/80 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm resize-none"
                  />
                ) : (
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {node.data.description || "No specific evidence recorded for this entity."}
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata Stats & Version Lineage */}
              <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Version Lineage</span>
                  </span>
                  <span className="font-semibold text-foreground">
                    v{node.data.version || 1}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>Citations & Exhibits</span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {node.data.citationsCount || 0} citations
                  </span>
                </div>
                {node.data.updatedBy && (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>Last Modified By</span>
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[120px]">
                      {node.data.updatedBy}
                    </span>
                  </div>
                )}
              </div>

              {/* Save Button for Editors */}
              {canEdit && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="sm"
                    className="flex-1 h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Changes Saved</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>{isSubmitting ? "Saving..." : "Save Properties"}</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>

            {/* ── RELATIONSHIPS SECTION ("Relationships From This Element") ───── */}
            <div className="pt-4 border-t border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-primary" />
                  <h4 className="text-xs font-bold text-foreground">
                    Relationships ({connectedEdges.length})
                  </h4>
                </div>
                {/* + Add Relationship trigger for editors */}
                {canEdit && !isAddingRel && onAddRelationship && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingRel(true)}
                    className="h-6 text-[10px] font-semibold gap-1 text-primary hover:bg-primary/10 px-2"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Relationship</span>
                  </Button>
                )}
              </div>

              {/* Inline Relationship Creator (Editors Only) */}
              {canEdit && isAddingRel && (
                <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-2.5 animate-in fade-in-0 duration-150">
                  <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                    <span>Connect To Another Element</span>
                    <button
                      onClick={() => setIsAddingRel(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-muted-foreground uppercase">
                      Target Element
                    </label>
                    <select
                      value={newRelTargetId}
                      onChange={(e) => setNewRelTargetId(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select target node...</option>
                      {allNodes
                        .filter((n) => n.id !== node.id)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label} ({n.nodeType})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-muted-foreground uppercase">
                      Relationship Type
                    </label>
                    <select
                      value={newRelType}
                      onChange={(e) => setNewRelType(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    >
                      {PRESET_RELATIONSHIPS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingRel(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!newRelTargetId || isSubmitting}
                      onClick={handleCreateRelationship}
                      className="h-7 text-xs font-semibold bg-primary text-primary-foreground"
                    >
                      Create
                    </Button>
                  </div>
                </div>
              )}

              {/* Connected Relationships List */}
              {connectedEdges.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-1">
                  No relationships connected to this element yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {connectedEdges.map((rel) => (
                    <div
                      key={rel.id || rel.relId}
                      className="p-2.5 rounded-xl border border-border/70 bg-background/50 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
                    >
                      <div
                        className="flex-1 cursor-pointer overflow-hidden"
                        onClick={() => onSelectEntity && onSelectEntity("edge", rel.id)}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: rel.strokeColor || "#2563EB" }}
                          />
                          <span className="font-bold text-primary truncate">
                            {rel.label || rel.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground truncate mt-0.5">
                          <span>{rel.isOutgoing ? "→" : "←"}</span>
                          <span className="truncate">
                            {rel.isOutgoing ? rel.targetLabel : rel.sourceLabel}
                          </span>
                        </div>
                      </div>

                      {/* Delete button only visible when canEdit === true */}
                      {canEdit && onDeleteEdge && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeleteEdge(rel.relId)}
                          className="h-6 w-6 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                          title="Delete relationship"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ────────────────── EDGE INSPECTION VIEW ────────────────────────── */}
        {!isNode && edge && (
          <form onSubmit={handleSaveEdge} className="space-y-4">
            {/* Endpoints Overview */}
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Source</span>
                <span className="font-bold text-foreground truncate max-w-[140px]">
                  {edge.sourceLabel || edge.source}
                </span>
              </div>
              <div className="flex items-center justify-center text-primary">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Target</span>
                <span className="font-bold text-foreground truncate max-w-[140px]">
                  {edge.targetLabel || edge.target}
                </span>
              </div>
            </div>

            {/* Relationship Type Dropdown or Static Typography */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Relationship Type
              </label>
              {canEdit ? (
                <select
                  value={edgeType}
                  onChange={(e) => {
                    setEdgeType(e.target.value);
                    if (!edgeLabel || edgeLabel === edgeType) {
                      setEdgeLabel(e.target.value);
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-sm"
                >
                  {PRESET_RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center">
                  <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-mono font-semibold text-primary">
                    {edgeData.type || "RELATES_TO"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Display Label Input or Static Typography */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Display Label
              </label>
              {canEdit ? (
                <Input
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="Label shown on canvas edge..."
                  className="h-9 text-xs bg-background/80 border-border/80 font-mono"
                />
              ) : (
                <p className="text-xs font-semibold text-foreground font-mono">
                  {edgeData.label || edgeData.type || "RELATES_TO"}
                </p>
              )}
            </div>

            {/* Directionality Selector or Static Info */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Directionality
              </label>
              {canEdit ? (
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEdgeDirectionality("single")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      edgeDirectionality === "single"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/80 bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ArrowRight className="h-3 w-3" />
                    <span>Single</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdgeDirectionality("bidirectional")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      edgeDirectionality === "bidirectional"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/80 bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    <span>Both</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdgeDirectionality("nondirectional")}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      edgeDirectionality === "nondirectional"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/80 bg-background/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Minus className="h-3 w-3" />
                    <span>None</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground capitalize font-medium">
                  {edgeData.directionality || "single"} direction
                </p>
              )}
            </div>

            {/* Line Style (Solid, Dotted, Dashed) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Line Style
              </label>
              {canEdit ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {(["solid", "dashed", "dotted"] as EdgeLineStyle[]).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setEdgeLineStyle(style)}
                      className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-all ${
                        edgeLineStyle === style
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border/80 bg-background/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground capitalize font-medium">
                  {edgeData.lineStyle || "solid"} line
                </p>
              )}
            </div>

            {/* Stroke Color Picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Stroke Accent Color
              </label>
              {canEdit ? (
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setEdgeStrokeColor(color.hex)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform ${
                        color.bg
                      } ${
                        edgeStrokeColor.toLowerCase() === color.hex.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      title={color.name}
                    >
                      {edgeStrokeColor.toLowerCase() === color.hex.toLowerCase() && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: edgeData.strokeColor || "#2563EB" }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {edgeData.strokeColor || "#2563EB"}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons for Edge */}
            {canEdit && (
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="w-full h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Edge Styling Updated</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>{isSubmitting ? "Updating..." : "Apply Edge Updates"}</span>
                    </>
                  )}
                </Button>

                {onDeleteEdge && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteEdge(relId)}
                    className="w-full h-8 text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span>Delete Relationship</span>
                  </Button>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── 3. Footer Delete Node (Only when canEdit === true) ───────────── */}
      {isNode && node && canEdit && onDeleteNode && (
        <div className="border-t border-border/70 pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDeleteNode(node.id)}
            className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 px-2"
          >
            <Trash2 className="h-3 w-3" />
            <span>Remove Element</span>
          </Button>

          <span className="text-[10px] text-muted-foreground font-mono">
            ID: {node.id.slice(0, 10)}...
          </span>
        </div>
      )}
    </aside>
  );
}
