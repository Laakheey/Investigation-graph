"use client";

// =============================================================================
// EBRR Investigation Matter Canvas Page — /investigations/[id]
// -----------------------------------------------------------------------------
// Production-grade Investigation Workbench powered by @xyflow/react GraphCanvas,
// Neo4j multi-tenant persistence, RBAC permission evaluation, and Redis cache.
// =============================================================================

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import TopNavigation from "@/components/investigations/TopNavigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ArrowLeft,
  RefreshCw,
  FolderKanban,
  ShieldCheck,
  Share2,
  SlidersHorizontal,
  Info,
  ChevronRight,
  Eye,
  Users,
} from "lucide-react";
import type {
  ReactFlowNodeData,
  ReactFlowEdgeData,
} from "@/services/graphService";
import type { Investigation, WorkspacePermissions } from "@/types/domain";

export default function InvestigationMatterPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const { user, isGuest } = useAuth();

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [nodes, setNodes] = useState<ReactFlowNodeData[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdgeData[]>([]);
  const [permissions, setPermissions] = useState<WorkspacePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Investigation Details
      const invRes = await fetch(`/api/investigations/${id}`);
      const invJson = await invRes.json();
      if (invJson.success && invJson.data) {
        setInvestigation(invJson.data);
      } else {
        setInvestigation({
          id,
          tenantId: user?.tenantId || "tenant-alpha-compliance",
          name: "Active Investigation Matter",
          title: "Active Investigation Matter",
          description: "Evidence-Based Responsibility Reconstruction™ Case",
          status: "ACTIVE",
          leadInvestigator: "Senior Legal Counsel",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 2. Fetch Workspace Members & Permissions
      try {
        const memRes = await fetch(`/api/investigations/${id}/members`);
        const memJson = await memRes.json();
        if (memJson.success && memJson.data?.permissions) {
          setPermissions(memJson.data.permissions);
        }
      } catch {
        // Ignored in guest fallback
      }

      // 3. Fetch React Flow Visual Payload (Redis Cached + Neo4j fallback)
      const graphRes = await fetch(`/api/graph/${id}`);
      const graphJson = await graphRes.json();

      if (graphJson.success && graphJson.data) {
        setNodes(graphJson.data.nodes || []);
        setEdges(graphJson.data.edges || []);
      }
    } catch (err: any) {
      console.error("Failed to load investigation graph:", err);
      setError(err.message || "Failed to load investigation workspace");
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.tenantId]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col bg-[#0A0D14] text-foreground">
        <TopNavigation />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">
              Synchronizing matter graph with Neo4j & Redis cache...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !investigation) {
    return (
      <div className="flex h-screen w-screen flex-col bg-[#0A0D14] text-foreground">
        <TopNavigation />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center max-w-md">
            <h3 className="text-sm font-semibold text-destructive">
              Workspace Load Failure
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="mt-4 text-xs"
            >
              Return to Matters Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0A0D14] text-foreground overflow-hidden font-sans select-none">
      {/* Top Bar / Sub-Navigation */}
      <div className="h-12 border-b border-border bg-[#0E131F]/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Matters
            </Button>
          </Link>

          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate max-w-[280px]">
              {investigation?.title || "Matter Workspace"}
            </span>
            <span className="text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              {investigation?.status || "ACTIVE"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mr-2 font-mono text-[11px]">
            <span>{nodes.length} entities</span>
            <span>•</span>
            <span>{edges.length} relationships</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchGraphData}
            title="Reload graph from Neo4j"
            className="h-7 text-xs px-2.5 bg-card/60 border-border text-foreground hover:bg-card"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reload
          </Button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex-1 w-full h-[calc(100vh-48px)] relative">
        <GraphCanvas
          investigationId={id}
          initialNodes={nodes}
          initialEdges={edges}
          investigationTitle={investigation?.title}
          investigationStatus={investigation?.status}
          isGuest={isGuest}
          userRole={permissions?.role || user?.role || (isGuest ? "GUEST_VIEWER" : "OWNER")}
          userPermissions={permissions || undefined}
          onRefresh={fetchGraphData}
        />
      </div>
    </div>
  );
}
