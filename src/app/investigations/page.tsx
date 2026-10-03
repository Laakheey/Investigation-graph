"use client";

// =============================================================================
// EBRR Investigations Hub — Matters Grid
// =============================================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw } from "lucide-react";
import TopNavigation from "@/components/investigations/TopNavigation";
import InvestigationCard from "@/components/investigations/InvestigationCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Investigation } from "@/types/domain";

export default function InvestigationsDashboardPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvestigations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/investigations");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setInvestigations(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch investigations:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInvestigations();
  }, []);

  const filteredInvestigations = investigations.filter((inv) => {
    const title = inv.title ?? inv.name ?? "";
    const desc = inv.description ?? "";
    const conduct = inv.conductType ?? "";
    const q = searchQuery.toLowerCase();
    return (
      title.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      conduct.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNavigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Active Investigations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evidence-Based Responsibility Reconstruction™ cases and
              accountability workspaces.
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matter title or conduct..."
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchInvestigations}
              className="h-8 w-8 shrink-0 text-muted-foreground"
              title="Refresh Investigations"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Link href="/investigations/new">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-[#1E3A8A] hover:bg-[#1E40AF] text-white shrink-0 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Investigation</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-5 w-2/3 rounded" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                </div>
                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Responsive Matters Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInvestigations.map((inv) => (
              <InvestigationCard key={inv.id} investigation={inv as any} />
            ))}

            {/* Action Card: "+ New investigation" */}
            <Link
              href="/investigations/new"
              className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-card/30 p-8 text-center hover:border-primary/60 hover:bg-card/60 transition-all duration-200 min-h-[220px]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200 mb-3 shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                New investigation
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Start a new matter intake and responsibility reconstruction
              </p>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
