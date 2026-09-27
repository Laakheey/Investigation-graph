"use client";

// =============================================================================
// Presentation Layer — Visual 3-Way Conflict Resolver Modal
// -----------------------------------------------------------------------------
// Renders side-by-side visual diffs (Base Value vs Author A vs Author B)
// and allows granular field-by-field merge resolution for OWNER and EDITOR roles.
// =============================================================================

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  ArrowRight,
  Clock,
  User,
  ShieldCheck,
} from "lucide-react";
import type { ConflictedFieldData } from "@/types/domain";

export interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  investigationId: string;
  node: {
    id: string;
    label: string;
    nodeType: string;
    status?: string;
    description?: string;
    version?: number;
    conflictedFields?: Record<string, ConflictedFieldData>;
  } | null;
  onResolved: () => void;
}

export function ConflictResolverModal({
  isOpen,
  onClose,
  investigationId,
  node,
  onResolved,
}: ConflictResolverModalProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, any>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [resolutionComment, setResolutionComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conflictedFields = node?.conflictedFields || {};
  const fieldKeys = Object.keys(conflictedFields);

  // Initialize selected values with Author B (latest) by default
  useEffect(() => {
    if (node && node.conflictedFields) {
      const initial: Record<string, any> = {};
      for (const [key, diff] of Object.entries(node.conflictedFields)) {
        initial[key] = diff.incomingValue !== undefined ? diff.incomingValue : diff.currentValue;
      }
      setSelectedValues(initial);
    }
  }, [node]);

  if (!node) return null;

  const handleFieldChoice = (fieldName: string, value: any) => {
    setSelectedValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        entityId: node.id,
        entityType: "NODE" as const,
        resolvedFields: selectedValues,
        resolutionComment: resolutionComment.trim() || undefined,
      };

      const res = await fetch(
        `/api/investigations/${investigationId}/conflict/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to resolve conflict");
      }

      onResolved();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred during conflict merge");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Visual Conflict Resolution Workbench"
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-5">
        {/* Header Alert Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">
              Concurrent Mutation Conflict Detected
            </h4>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Multiple investigators modified <strong>{node.label}</strong> concurrently. The canvas is currently displaying the base state. Review the 3-way differences below and select the authoritative values to commit.
            </p>
          </div>
        </div>

        {/* Node Summary Pill */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{node.label}</span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              {node.nodeType}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Node ID: {node.id.slice(0, 8)}... | v{node.version || 1}
          </span>
        </div>

        {/* 3-Way Diff Table for Each Conflicted Field */}
        <div className="space-y-4">
          {fieldKeys.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No field diffs recorded. Click below to clear the conflict flag.
            </div>
          ) : (
            fieldKeys.map((fieldName) => {
              const diff = conflictedFields[fieldName];
              const chosen = selectedValues[fieldName];

              return (
                <div
                  key={fieldName}
                  className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Field: {fieldName}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Authoritative Choice: {String(chosen ?? "None")}
                    </Badge>
                  </div>

                  {/* 3 Columns: Base vs Author A vs Author B */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. Base / Original Value */}
                    <div
                      onClick={() => handleFieldChoice(fieldName, diff.originalValue)}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition-all ${
                        chosen === diff.originalValue
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Original Base
                        </span>
                        {chosen === diff.originalValue && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <p className="font-mono text-xs text-foreground break-words">
                        {String(diff.originalValue ?? "—")}
                      </p>
                    </div>

                    {/* 2. Author A (Current Value) */}
                    <div
                      onClick={() => handleFieldChoice(fieldName, diff.currentValue)}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition-all ${
                        chosen === diff.currentValue
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-400 uppercase">
                          {diff.authorA?.name || "Author A"} (Saved)
                        </span>
                        {chosen === diff.currentValue && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <p className="font-mono text-xs text-foreground break-words">
                        {String(diff.currentValue ?? "—")}
                      </p>
                      {diff.authorA?.timestamp && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(diff.authorA.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    {/* 3. Author B (Incoming Collision) */}
                    <div
                      onClick={() => handleFieldChoice(fieldName, diff.incomingValue)}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 cursor-pointer transition-all ${
                        chosen === diff.incomingValue
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-rose-400 uppercase">
                          {diff.authorB?.name || "Author B"} (Incoming)
                        </span>
                        {chosen === diff.incomingValue && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <p className="font-mono text-xs text-foreground break-words">
                        {String(diff.incomingValue ?? "—")}
                      </p>
                      {diff.authorB?.timestamp && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(diff.authorB.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resolution Comment */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">
            Resolution Rationale / Note (Audit Logged)
          </label>
          <Input
            value={resolutionComment}
            onChange={(e) => setResolutionComment(e.target.value)}
            placeholder="e.g. Merged verified subject title per regulatory filing..."
            className="text-xs bg-background/50"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleResolve}
            disabled={isSubmitting}
            className="text-xs font-semibold gap-1.5 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-sm"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>{isSubmitting ? "Committing Merge..." : "Commit Authoritative Merge"}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
