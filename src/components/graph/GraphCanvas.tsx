'use client';

// =============================================================================
// Presentation Layer — Graph Canvas (SSR Safe Dynamic Wrapper)
// -----------------------------------------------------------------------------
// Dynamically imports FlowCanvasImpl with { ssr: false } to guarantee zero
// hydration mismatch and ensure WebGL/Canvas APIs run strictly client-side.
// =============================================================================

import dynamic from 'next/dynamic';
import React from 'react';
import type { FlowCanvasImplProps } from './FlowCanvasImpl';
import { Loader2, Network } from 'lucide-react';

const FlowCanvasDynamic = dynamic<FlowCanvasImplProps>(
  () => import('./FlowCanvasImpl').then((mod) => mod.FlowCanvasImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0A0D14] text-muted-foreground">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute h-16 w-16 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-2xl">
            <Network className="h-7 w-7 text-primary animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Initializing Investigation Graph Canvas...
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Loading nodes, relationships, and Neo4j spatial layouts</p>
      </div>
    ),
  }
);

export function GraphCanvas(props: FlowCanvasImplProps) {
  return <FlowCanvasDynamic {...props} />;
}
