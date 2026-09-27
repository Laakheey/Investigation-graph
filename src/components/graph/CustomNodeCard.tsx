"use client";

// =============================================================================
// Presentation Layer — Custom React Flow Node Card Component
// -----------------------------------------------------------------------------
// Renders rich investigation card nodes with domain-colored left borders,
// typed subtext, status badges, version lineage, and pulsating conflict alerts.
// =============================================================================

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  User,
  Building2,
  MapPin,
  CreditCard,
  Cpu,
  AlertTriangle,
  FileText,
  Clock,
  GitMerge,
} from "lucide-react";
import type { NodeType, NodeStatus, ConflictedFieldData } from "../../types/domain";

export interface CustomNodeData {
  label: string;
  nodeType: NodeType;
  status?: NodeStatus;
  citationsCount?: number;
  subtitle?: string;
  description?: string;
  properties?: Record<string, string | number | boolean>;
  version?: number;
  hasConflict?: boolean;
  conflictedFields?: Record<string, ConflictedFieldData>;
  createdBy?: string;
  updatedBy?: string;
  onOpenConflictResolver?: (nodeId: string) => void;
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
    defaultSubtitle: string;
  }
> = {
  Person: {
    icon: User,
    borderColor: "border-l-purple-500",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-400",
    defaultSubtitle: "Individual Subject / Officer",
  },
  Organization: {
    icon: Building2,
    borderColor: "border-l-fuchsia-500",
    badgeBg: "bg-fuchsia-500/15",
    badgeText: "text-fuchsia-400",
    defaultSubtitle: "Corporate / Legal Entity",
  },
  Location: {
    icon: MapPin,
    borderColor: "border-l-amber-500",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-400",
    defaultSubtitle: "Jurisdiction / Physical Site",
  },
  Account: {
    icon: CreditCard,
    borderColor: "border-l-emerald-500",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    defaultSubtitle: "Financial / Banking Account",
  },
  System: {
    icon: Cpu,
    borderColor: "border-l-sky-500",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-400",
    defaultSubtitle: "Decision Pipeline / Algorithmic Agent",
  },
};

const STATUS_BADGES: Record<string, string> = {
  Active: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  Flagged: "border-rose-500/30 text-rose-400 bg-rose-500/10",
  Verified: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  Archived: "border-slate-500/30 text-slate-400 bg-slate-500/10",
  Pending: "border-amber-500/30 text-amber-400 bg-amber-500/10",
};

function CustomNodeCardComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const config = TYPE_CONFIG[nodeData.nodeType] || TYPE_CONFIG.Person;
  const Icon = config.icon;

  const statusClass =
    STATUS_BADGES[nodeData.status || "Active"] || STATUS_BADGES.Active;

  return (
    <div
      className={`relative min-w-[210px] max-w-[260px] rounded-xl border border-border/80 bg-card p-3.5 shadow-md backdrop-blur-md transition-all select-none ${
        nodeData.hasConflict
          ? "border-amber-500 ring-2 ring-amber-500/40 shadow-amber-500/10"
          : config.borderColor
      } border-l-[5px] ${
        selected
          ? "ring-2 ring-primary shadow-lg scale-[1.02]"
          : "hover:border-border"
      }`}
    >
      {/* Target Handle (Left Edge) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3.5 !w-3.5 !-left-2 !bg-primary !border-2 !border-background !rounded-full hover:!scale-125 transition-transform cursor-crosshair"
      />

      {/* Conflict Alert Ribbon if Conflicted */}
      {nodeData.hasConflict && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (nodeData.onOpenConflictResolver) {
              nodeData.onOpenConflictResolver(id);
            }
          }}
          className="mb-2 -mt-1 -mx-1 flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold cursor-pointer hover:bg-amber-500/30 transition-colors animate-pulse"
          title="Click to resolve concurrent edit conflict"
        >
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
            <span>Conflict Detected</span>
          </div>
          <span className="flex items-center gap-0.5 text-[9px] underline">
            Resolve <GitMerge className="h-2.5 w-2.5" />
          </span>
        </div>
      )}

      {/* Header: Icon, Type & Status */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <div
            className={`p-1 rounded-md ${config.badgeBg} ${config.badgeText}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${config.badgeText}`}
          >
            {nodeData.nodeType}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {nodeData.version && (
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
              v{nodeData.version}
            </span>
          )}
          {nodeData.status && (
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${statusClass}`}
            >
              {nodeData.status}
            </span>
          )}
        </div>
      </div>

      {/* Title / Label */}
      <h4
        className="text-xs font-bold text-foreground leading-snug truncate"
        title={nodeData.label}
      >
        {nodeData.label}
      </h4>

      {/* Subtitle / Role */}
      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
        {nodeData.subtitle || config.defaultSubtitle}
      </p>

      {/* Footer: Citations badge & audit trail preview */}
      <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3 text-primary" />
          <span>{nodeData.citationsCount ?? 0} citations</span>
        </span>
        {nodeData.updatedBy && (
          <span className="text-[9px] text-muted-foreground truncate max-w-[80px]" title={`Last updated by ${nodeData.updatedBy}`}>
            ✍ {nodeData.updatedBy}
          </span>
        )}
      </div>

      {/* Source Handle (Right Edge) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3.5 !w-3.5 !-right-2 !bg-primary !border-2 !border-background !rounded-full hover:!scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
}

export const CustomNodeCard = memo(CustomNodeCardComponent);
