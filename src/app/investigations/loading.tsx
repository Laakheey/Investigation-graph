// =============================================================================
// Investigation List Loading Screen — Shadcn Skeleton Grid
// -----------------------------------------------------------------------------
// Renders responsive animated skeleton cards while fetching matter records.
// =============================================================================

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import TopNavigation from "@/components/investigations/TopNavigation";

export default function InvestigationsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNavigation />

      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-card/40">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Skeleton className="h-9 w-72 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* Investigation Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5 flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
                <Skeleton className="h-6 w-5/6 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>

              {/* Card Meta Stats */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
