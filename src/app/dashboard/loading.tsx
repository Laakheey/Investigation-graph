// =============================================================================
// Dashboard Loading Screen — Suspense / App Router Skeleton
// -----------------------------------------------------------------------------
// Instantly rendered while the dashboard route resolves data.
// =============================================================================

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import TopNavigation from "@/components/investigations/TopNavigation";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <TopNavigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Header Hero Section Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </Card>
          ))}
        </div>

        {/* Search & Filter Bar Skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
          <Skeleton className="h-8 w-full sm:w-80 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>

        {/* Investigation Matters Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              className="bg-card border-border shadow-sm flex flex-col justify-between p-5 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
              <div className="pt-3 border-t border-border/50 space-y-3">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
