'use client';

// =============================================================================
// Presentation Layer — Node Addition Floating Toolbar
// -----------------------------------------------------------------------------
// Floating palette with node types (Person, Organization, Location, Account, System)
// Supporting click-to-add modal and drag-to-canvas placement.
// =============================================================================

import React, { useState } from 'react';
import { User, Building2, MapPin, CreditCard, Cpu, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { NodeType, NodeStatus } from '@/types/domain';

export interface NodeAdditionToolbarProps {
  onAddNode: (payload: {
    label: string;
    nodeType: NodeType;
    status: NodeStatus;
    citationsCount?: number;
    subtitle?: string;
    description?: string;
    position?: { x: number; y: number };
  }) => void;
  isSaving?: boolean;
}

const TOOLBAR_TYPES: Array<{
  type: NodeType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
  defaultSubtitle: string;
}> = [
  {
    type: 'Person',
    label: 'Person',
    icon: User,
    color: 'text-purple-400 border-purple-500/40',
    bgLight: 'bg-purple-500/10 hover:bg-purple-500/20',
    defaultSubtitle: 'Individual Subject / Officer',
  },
  {
    type: 'Organization',
    label: 'Organization',
    icon: Building2,
    color: 'text-fuchsia-400 border-fuchsia-500/40',
    bgLight: 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20',
    defaultSubtitle: 'Corporate / Legal Entity',
  },
  {
    type: 'Location',
    label: 'Location',
    icon: MapPin,
    color: 'text-amber-400 border-amber-500/40',
    bgLight: 'bg-amber-500/10 hover:bg-amber-500/20',
    defaultSubtitle: 'Jurisdiction / Physical Site',
  },
  {
    type: 'Account',
    label: 'Account',
    icon: CreditCard,
    color: 'text-emerald-400 border-emerald-500/40',
    bgLight: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    defaultSubtitle: 'Financial / Banking Account',
  },
  {
    type: 'System',
    label: 'System',
    icon: Cpu,
    color: 'text-sky-400 border-sky-500/40',
    bgLight: 'bg-sky-500/10 hover:bg-sky-500/20',
    defaultSubtitle: 'Decision Pipeline / Algorithmic Agent',
  },
];

export function NodeAdditionToolbar({ onAddNode }: NodeAdditionToolbarProps) {
  const [activeModalType, setActiveModalType] = useState<NodeType | null>(null);
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [status, setStatus] = useState<NodeStatus>('Active');
  const [citationsCount, setCitationsCount] = useState<number>(0);
  const [description, setDescription] = useState('');

  const handleOpenModal = (t: NodeType) => {
    const config = TOOLBAR_TYPES.find((item) => item.type === t);
    setActiveModalType(t);
    setLabel('');
    setSubtitle(config?.defaultSubtitle || '');
    setStatus('Active');
    setCitationsCount(0);
    setDescription('');
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalType || !label.trim()) return;

    onAddNode({
      label: label.trim(),
      nodeType: activeModalType,
      status,
      citationsCount: Number(citationsCount) || 0,
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      position: {
        x: 250 + Math.random() * 200,
        y: 150 + Math.random() * 200,
      },
    });

    setActiveModalType(null);
  };

  return (
    <>
      {/* Floating Toolbar Sidebar */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 rounded-xl border border-border/80 bg-card/90 p-2 shadow-xl backdrop-blur-md select-none">
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Node Palette
        </span>

        {TOOLBAR_TYPES.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.type}
              type="button"
              onClick={() => handleOpenModal(tool.type)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${tool.bgLight} ${tool.color}`}
              title={`Add ${tool.label} node to canvas`}
            >
              <Icon className="h-4 w-4" />
              <span>{tool.label}</span>
              <Plus className="h-3.5 w-3.5 ml-auto opacity-70" />
            </button>
          );
        })}
      </div>

      {/* Node Creation Modal */}
      {activeModalType && (
        <Modal
          isOpen={Boolean(activeModalType)}
          onClose={() => setActiveModalType(null)}
          title={`Add ${activeModalType} Node`}
          description="Enter entity metadata and citations for investigation graph placement."
        >
          <form onSubmit={handleConfirmAdd} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">
                {activeModalType} Name / Title *
              </label>
              <Input
                value={label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
                placeholder={`e.g. ${
                  activeModalType === 'Person'
                    ? 'David Vance'
                    : activeModalType === 'Organization'
                    ? 'Apex Systems Integration LLC'
                    : activeModalType === 'Location'
                    ? 'Cayman Islands'
                    : activeModalType === 'Account'
                    ? 'Account #CH-9921-332'
                    : 'DecisionPipeline v3.4'
                }`}
                required
                autoFocus
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Subtitle / Role</label>
              <Input
                value={subtitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)}
                placeholder="e.g. Chief Risk Officer, Primary Vendor"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Investigation Status</label>
                <select
                  value={status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as NodeStatus)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Active">Active</option>
                  <option value="Flagged">Flagged</option>
                  <option value="Verified">Verified</option>
                  <option value="Archived">Archived</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Page / Evidence Citations</label>
                <Input
                  type="number"
                  min="0"
                  value={citationsCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCitationsCount(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Description / Case Notes</label>
              <textarea
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Factual findings, source citations, document excerpts..."
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-card p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveModalType(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!label.trim()} className="gap-1.5 bg-[#1E3A8A] text-white">
                <Plus className="h-3.5 w-3.5" />
                <span>Place on Canvas</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
