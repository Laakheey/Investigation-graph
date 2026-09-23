"use client";

// =============================================================================
// Presentation Layer — Bi-directional Edge Inspector Panel
// -----------------------------------------------------------------------------
// Offers Directionality (Single, Bidirectional, Non-directional), Line Style
// (solid, dotted, dashed), Stroke Color Picker, and Relationship Label/Type.
// =============================================================================

import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Sparkles,
  Palette,
  Layers,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EdgeDirectionality, EdgeLineStyle } from "@/types/domain";

export interface EdgeInspectorPanelProps {
  edge: {
    id: string;
    relId: string;
    source: string;
    target: string;
    sourceLabel?: string;
    targetLabel?: string;
    type: string;
    label?: string;
    directionality: EdgeDirectionality;
    lineStyle: EdgeLineStyle;
    strokeColor: string;
  } | null;
  onClose: () => void;
  onUpdateEdge: (updates: {
    type?: string;
    label?: string;
    directionality?: EdgeDirectionality;
    lineStyle?: EdgeLineStyle;
    strokeColor?: string;
  }) => void;
  onDeleteEdge: (relId: string) => void;
}

const COLOR_PRESETS = [
  { name: "Red Alert", hex: "#DC2626", bg: "bg-red-600" },
  { name: "Blue Primary", hex: "#2563EB", bg: "bg-blue-600" },
  { name: "Green Verified", hex: "#16A34A", bg: "bg-emerald-600" },
  { name: "Amber Suspect", hex: "#D97706", bg: "bg-amber-600" },
  { name: "Purple Legal", hex: "#9333EA", bg: "bg-purple-600" },
  { name: "Cyan Tech", hex: "#0EA5E9", bg: "bg-cyan-600" },
];

const PRESET_RELATIONSHIP_TYPES = [
  "FUNDED_BY",
  "EMPLOYED_BY",
  "SUSPECTED_ALIAS",
  "CONTROLS",
  "OPERATED_BY",
  "TRANSACTED_WITH",
  "COMMUNICATED_WITH",
  "GOVERNED_BY",
  "LOCATED_AT",
];

export function EdgeInspectorPanel({
  edge,
  onClose,
  onUpdateEdge,
  onDeleteEdge,
}: EdgeInspectorPanelProps) {
  if (!edge) return null;

  const [type, setType] = useState(edge.type);
  const [label, setLabel] = useState(edge.label || edge.type);
  const [directionality, setDirectionality] = useState<EdgeDirectionality>(
    edge.directionality || "single",
  );
  const [lineStyle, setLineStyle] = useState<EdgeLineStyle>(
    edge.lineStyle || "solid",
  );
  const [strokeColor, setStrokeColor] = useState(edge.strokeColor || "#2563EB");

  // Sync state when active edge changes
  useEffect(() => {
    setType(edge.type);
    setLabel(edge.label || edge.type);
    setDirectionality(edge.directionality || "single");
    setLineStyle(edge.lineStyle || "solid");
    setStrokeColor(edge.strokeColor || "#2563EB");
  }, [edge]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEdge({
      type: type.toUpperCase(),
      label: label.trim() || type.toUpperCase(),
      directionality,
      lineStyle,
      strokeColor,
    });
  };

  const handleDirectionChange = (d: EdgeDirectionality) => {
    setDirectionality(d);
    onUpdateEdge({ directionality: d });
  };

  const handleLineStyleChange = (s: EdgeLineStyle) => {
    setLineStyle(s);
    onUpdateEdge({ lineStyle: s });
  };

  const handleColorChange = (c: string) => {
    setStrokeColor(c);
    onUpdateEdge({ strokeColor: c });
  };

  return (
    <aside className="absolute top-4 right-4 z-20 w-84 rounded-xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md flex flex-col space-y-4 text-xs select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div>
          <h3 className="font-bold text-sm text-foreground">Edge Inspector</h3>
          <p className="text-[10px] text-muted-foreground font-mono">
            ID: {edge.relId.slice(0, 8)}...
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleApply} className="space-y-4">
        {/* Connection Endpoints */}
        <div className="p-2.5 rounded-lg border border-border/70 bg-background/50 flex items-center justify-between text-[11px] font-mono">
          <span className="font-semibold text-foreground truncate max-w-[90px]">
            {edge.sourceLabel || edge.source}
          </span>
          <div className="flex items-center px-1 text-primary">
            {directionality === "bidirectional" ? (
              <ArrowLeftRight className="h-3.5 w-3.5" />
            ) : directionality === "single" ? (
              <ArrowRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="font-semibold text-foreground truncate max-w-[90px]">
            {edge.targetLabel || edge.target}
          </span>
        </div>

        {/* 1. Directionality Selector */}
        <div>
          <label className="font-semibold text-foreground block mb-1.5">
            Directionality
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-background/60 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => handleDirectionChange("single")}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition-all cursor-pointer ${
                directionality === "single"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="text-[10px]">Single</span>
            </button>

            <button
              type="button"
              onClick={() => handleDirectionChange("bidirectional")}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition-all cursor-pointer ${
                directionality === "bidirectional"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="text-[10px]">Bidirectional</span>
            </button>

            <button
              type="button"
              onClick={() => handleDirectionChange("nondirectional")}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition-all cursor-pointer ${
                directionality === "nondirectional"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Minus className="h-3.5 w-3.5" />
              <span className="text-[10px]">Non-direct</span>
            </button>
          </div>
        </div>

        {/* 2. Line Style Selector */}
        <div>
          <label className="font-semibold text-foreground block mb-1.5">
            Line Style
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["solid", "dotted", "dashed"] as const).map((styleOpt) => (
              <button
                key={styleOpt}
                type="button"
                onClick={() => handleLineStyleChange(styleOpt)}
                className={`py-1.5 rounded-md border text-center capitalize transition-all cursor-pointer ${
                  lineStyle === styleOpt
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {styleOpt}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Stroke Color Picker */}
        <div>
          <label className="font-semibold text-foreground flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <span>Stroke Color</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {strokeColor}
            </span>
          </label>

          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handleColorChange(preset.hex)}
                className={`h-6 w-6 rounded-full ${preset.bg} border-2 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                  strokeColor.toLowerCase() === preset.hex.toLowerCase()
                    ? "border-white scale-110 shadow-md ring-2 ring-primary/40"
                    : "border-transparent"
                }`}
                title={preset.name}
              >
                {strokeColor.toLowerCase() === preset.hex.toLowerCase() && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Relationship Type & Custom Label */}
        <div>
          <label className="font-semibold text-foreground block mb-1">
            Relationship Type
          </label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setLabel(e.target.value);
            }}
            className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PRESET_RELATIONSHIP_TYPES.map((presetType) => (
              <option key={presetType} value={presetType}>
                {presetType}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-foreground block mb-1">
            Display Label
          </label>
          <Input
            value={label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLabel(e.target.value)
            }
            placeholder="e.g. CONTROLS (70% Equity)"
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border/70">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDeleteEdge(edge.relId)}
            className="h-8 text-xs gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>

          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs bg-[#1E3A8A] text-white"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </aside>
  );
}
