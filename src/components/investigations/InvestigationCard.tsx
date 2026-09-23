'use client';

// =============================================================================
// EBRR Investigation Matter Card Component
// =============================================================================

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Layers, GitCommit, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { InvestigationRecord } from '../../types';
import { CONDUCT_TYPES } from '../../lib/ebrrConstants';

export interface InvestigationCardProps {
  investigation: InvestigationRecord;
}

export default function InvestigationCard({ investigation }: InvestigationCardProps) {
  const conductConfig =
    CONDUCT_TYPES.find((c) => c.value === investigation.conductType) || CONDUCT_TYPES[4];

  const mappedElements = investigation.mappedElements ?? 0;
  const mappedRelationships = investigation.mappedRelationships ?? 0;
  const unresolved = investigation.unresolvedCount ?? 0;

  return (
    <Link
      href={`/investigations/${investigation.id}`}
      className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all duration-200"
    >
      <div>
        {/* Header: Title & Conduct Badge */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {investigation.name}
          </h3>
          <span
            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${conductConfig.badgeClass}`}
          >
            {investigation.conductType || 'Not yet determined'}
          </span>
        </div>

        {/* Description Excerpt */}
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
          {investigation.description}
        </p>

        {/* Date Range if present */}
        {investigation.dateRange && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-mono mb-4">
            <Calendar className="h-3 w-3" />
            <span>{investigation.dateRange}</span>
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <div className="flex items-center gap-3">
          <span title="Mapped Elements">
            <strong className="text-foreground">{mappedElements}</strong> mapped elements
          </span>
          <span className="text-border">·</span>
          <span title="Mapped Relationships">
            <strong className="text-foreground">{mappedRelationships}</strong> mapped relationships
          </span>
          <span className="text-border">·</span>
          <span title="Unresolved Questions" className="text-amber-400">
            <strong>{unresolved}</strong> unresolved
          </span>
        </div>

        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
