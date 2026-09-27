// =============================================================================
// Investigation Matter Workbench Loading Screen — Canvas Skeleton
// -----------------------------------------------------------------------------
// Header bar skeleton, interactive canvas grid loader, and inspector sidebar skeleton.
// =============================================================================

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import TopNavigation from "@/components/investigations/TopNavigation";

export default function InvestigationCanvasLoading() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground overflow-hidden">
      <TopNavigation />

      {/* Matter Sub-header Skeleton */}
      <div className="border-b border-border/80 bg-card/60 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Main Workbench Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Canvas Area with radial dots loader */}
        <div className="flex-1 relative flex items-center justify-center bg-background graph-canvas-container">
          {/* Centered Canvas Loader */}
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-2xl animate-fade-in">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute h-6 w-6 rounded-full bg-primary/20 animate-ping" />
            </div>
            <div className="space-y-1.5 text-center">
              <h4 className="text-xs font-semibold text-foreground">
                Reconstructing Investigation Graph
              </h4>
              <p className="text-[11px] text-muted-foreground font-mono">
                Streaming Neo4j nodes & relationships from cache...
              </p>
            </div>
          </div>

          {/* Floating Canvas Top Overlay Skeleton */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
            <Skeleton className="h-10 w-64 rounded-xl shadow-lg" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-44 rounded-xl shadow-lg" />
              <Skeleton className="h-9 w-28 rounded-xl shadow-lg" />
              <Skeleton className="h-9 w-9 rounded-xl shadow-lg" />
            </div>
          </div>
        </div>

        {/* Right Sidebar Skeleton */}
        <div className="w-80 border-l border-border/80 bg-card/90 p-5 space-y-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="space-y-3 pt-4 border-t border-border/60">
            <Skeleton className="h-4 w-36 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
