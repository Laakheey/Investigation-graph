"use client";

// =============================================================================
// Presentation Layer — Custom Bidirectional / Styled SVG Marker Edge
// -----------------------------------------------------------------------------
// Uses EdgeStyleFactory to dynamically compute SVG styles and bidirectional markers.
// =============================================================================

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { EdgeStyleFactory } from "../../services/edgeStyleFactory";
import type { EdgeDirectionality, EdgeLineStyle } from "../../types/domain";

export interface CustomEdgeData {
  relId: string;
  type: string;
  label?: string;
  directionality: EdgeDirectionality;
  lineStyle: EdgeLineStyle;
  strokeColor: string;
  weight?: number;
  properties?: Record<string, string | number | boolean>;
}

function CustomMarkerEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data || {}) as unknown as CustomEdgeData;

  const directionality = edgeData.directionality || "single";
  const lineStyle = edgeData.lineStyle || "solid";
  const strokeColor = edgeData.strokeColor || "#2563EB";
  const weight = edgeData.weight ?? 1.5;

  // Compute styles via EdgeStyleFactory (Open/Closed Principle)
  const computedStyle = EdgeStyleFactory.createStyle({
    directionality,
    lineStyle,
    strokeColor,
    weight,
    isSelected: Boolean(selected),
  });

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const displayLabel = edgeData.label || edgeData.type || "RELATES_TO";
  const colorId = encodeURIComponent(computedStyle.stroke);

  return (
    <>
      {/* SVG Marker Definitions for this Edge's Color */}
      <defs>
        {/* Target Arrowhead Marker */}
        <marker
          id={`marker-arrow-end-${colorId}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill={computedStyle.stroke} />
        </marker>

        {/* Source Arrowhead Marker (for Bidirectional edges) */}
        <marker
          id={`marker-arrow-start-${colorId}`}
          viewBox="0 0 10 10"
          refX="2"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 10 1 L 0 5 L 10 9 z" fill={computedStyle.stroke} />
        </marker>
      </defs>

      {/* Main SVG Edge Path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: computedStyle.stroke,
          strokeWidth: computedStyle.strokeWidth,
          strokeDasharray: computedStyle.strokeDasharray,
        }}
        markerStart={computedStyle.markerStart}
        markerEnd={computedStyle.markerEnd}
      />

      {/* Centered Pill Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border shadow-sm transition-all cursor-pointer ${
              selected
                ? "bg-[#1E293B] text-amber-400 border-amber-500 shadow-md scale-105 ring-1 ring-amber-400"
                : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:border-primary/60"
            }`}
            style={{
              borderColor: selected ? "#F59E0B" : `${computedStyle.stroke}60`,
            }}
          >
            {displayLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CustomMarkerEdge = memo(CustomMarkerEdgeComponent);
