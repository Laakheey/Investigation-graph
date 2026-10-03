"use client";

// =============================================================================
// Presentation Layer — Enterprise Dashboard Page (/dashboard)
// -----------------------------------------------------------------------------
// Executive investigation workspace overview with matter metrics, recent matters,
// multi-tenant tenancy scope badge, and fast creation modal.
// =============================================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNavigation from "@/components/investigations/TopNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Share2,
  Users,
  Database,
  ArrowRight,
  Clock,
  Briefcase,
  AlertTriangle,
  Building2,
} from "lucide-react";
import type { Investigation } from "@/types/domain";

export default function DashboardPage() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
    const displayName = inv.title ?? inv.name;
    const matchesSearch =
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.leadInvestigator?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <TopNavigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Header Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Investigation Matters & Graph Intelligence
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Evidence-Based Responsibility Reconstruction™ cases and
              high-concurrency entity relationship mapping.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInvestigations}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs border-border bg-card hover:bg-muted text-foreground"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Link href="/investigations/new">
              <Button
                size="sm"
                className="h-9 gap-1.5 text-xs bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-medium shadow-lg"
              >
                <Plus className="h-4 w-4" />
                New Investigation
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isLoading ? (
            <>
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
            </>
          ) : (
            <>
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Matters
                  </CardTitle>
                  <FolderKanban className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {investigations.length}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" /> Active
                    tenant investigations
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Active Inquiries
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {investigations.filter((i) => i.status === "ACTIVE").length}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Under active reconstruction
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Graph Engine
                  </CardTitle>
                  <Database className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    React Flow v12
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Neo4j + Redis Cache
                    Invalidation
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Archived / Closed
                  </CardTitle>
                  <Clock className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {
                      investigations.filter(
                        (i) => i.status === "ARCHIVED" || i.status === "CLOSED",
                      ).length
                    }
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Retained for compliance audit
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, investigator, or keyword..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs rounded-md bg-background border border-input text-foreground px-3 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="PENDING">Pending</option>
              <option value="ARCHIVED">Archived</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Investigation Matters Grid */}
        {isLoading ? (
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
        ) : filteredInvestigations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-dashed border-border rounded-xl text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              No Investigations Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {searchQuery
                ? "No investigation matters match your search criteria. Try a different query."
                : "Start an Evidence-Based Responsibility Reconstruction™ matter to map entities and relationships."}
            </p>
            <Link href="/investigations/new">
              <Button
                size="sm"
                className="mt-4 h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Investigation
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInvestigations.map((inv) => (
              <Card
                key={inv.id}
                className="bg-card border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono uppercase ${
                        inv.status === "ACTIVE"
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/30"
                          : inv.status === "PENDING"
                            ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/30"
                            : "border-border text-muted-foreground bg-muted/40"
                      }`}
                    >
                      {inv.status}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mt-2">
                    {inv.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {inv.description || "No case description provided."}
                  </p>

                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        Lead: {inv.leadInvestigator || "Unassigned"}
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/investigations/${inv.id}/graph`)}
                      className="w-full h-8 text-xs font-medium justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      <span>Open Graph Workbench</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
