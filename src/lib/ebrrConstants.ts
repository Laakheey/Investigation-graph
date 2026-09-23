// =============================================================================
// EBRR (Evidence-Based Responsibility Reconstruction™) Constants & Theme
// =============================================================================

export type ConductType =
  | 'Discrete event'
  | 'Repeated conduct'
  | 'Ongoing practice'
  | 'Systemic pattern'
  | 'Not yet determined';

export const CONDUCT_TYPES: Array<{
  value: ConductType;
  label: string;
  description: string;
  badgeClass: string;
}> = [
  {
    value: 'Discrete event',
    label: 'Discrete event',
    description: 'A single identifiable action or occurrence at a defined point in time.',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  {
    value: 'Repeated conduct',
    label: 'Repeated conduct',
    description: 'The same or substantially similar action occurring across separate instances.',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  {
    value: 'Ongoing practice',
    label: 'Ongoing practice',
    description: 'A continuing process, policy, workflow, or system use over a period of time.',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  {
    value: 'Systemic pattern',
    label: 'Systemic pattern',
    description: 'A broader pattern across multiple systems, actors, workflows, or organizational decisions.',
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  },
  {
    value: 'Not yet determined',
    label: 'Not yet determined',
    description: 'Preliminary investigation; conduct type classification pending further evidence.',
    badgeClass: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  },
];

export type EbrrDomain =
  | 'Person'
  | 'Organization'
  | 'AI System'
  | 'Model'
  | 'Workflow'
  | 'Technical Resource'
  | 'Consequential Conduct'
  | 'Other Relevant Element';

export interface DomainMetadata {
  domain: EbrrDomain;
  color: string;
  hex: string;
  icon: string;
  defaultSubtitle: string;
  bgLight: string;
  borderLeft: string;
}

export const EBRR_DOMAINS: Record<EbrrDomain, DomainMetadata> = {
  Person: {
    domain: 'Person',
    color: 'purple',
    hex: '#8B5CF6',
    icon: '🟣',
    defaultSubtitle: 'Individual Actor / Officer',
    bgLight: 'bg-purple-500/15',
    borderLeft: 'border-l-purple-500',
  },
  Organization: {
    domain: 'Organization',
    color: 'purple',
    hex: '#A855F7',
    icon: '🟣',
    defaultSubtitle: 'Corporate / Legal Entity',
    bgLight: 'bg-purple-600/15',
    borderLeft: 'border-l-purple-600',
  },
  'AI System': {
    domain: 'AI System',
    color: 'cyan',
    hex: '#0EA5E9',
    icon: '🔵',
    defaultSubtitle: 'Decision System / Pipeline',
    bgLight: 'bg-sky-500/15',
    borderLeft: 'border-l-sky-500',
  },
  Model: {
    domain: 'Model',
    color: 'blue',
    hex: '#3B82F6',
    icon: '🔵',
    defaultSubtitle: 'Foundational / ML Model',
    bgLight: 'bg-blue-500/15',
    borderLeft: 'border-l-blue-500',
  },
  Workflow: {
    domain: 'Workflow',
    color: 'emerald',
    hex: '#10B981',
    icon: '🟢',
    defaultSubtitle: 'Operational Procedure / Policy',
    bgLight: 'bg-emerald-500/15',
    borderLeft: 'border-l-emerald-500',
  },
  'Technical Resource': {
    domain: 'Technical Resource',
    color: 'teal',
    hex: '#14B8A6',
    icon: '🟢',
    defaultSubtitle: 'API / Database / Compute',
    bgLight: 'bg-teal-500/15',
    borderLeft: 'border-l-teal-500',
  },
  'Consequential Conduct': {
    domain: 'Consequential Conduct',
    color: 'red',
    hex: '#EF4444',
    icon: '🔴',
    defaultSubtitle: 'Adverse Impact / Harm Event',
    bgLight: 'bg-rose-500/15',
    borderLeft: 'border-l-rose-500',
  },
  'Other Relevant Element': {
    domain: 'Other Relevant Element',
    color: 'slate',
    hex: '#64748B',
    icon: '⚪',
    defaultSubtitle: 'Contextual Element',
    bgLight: 'bg-slate-500/15',
    borderLeft: 'border-l-slate-500',
  },
};

export const COMMON_EBRR_RELATIONSHIPS = [
  'governs',
  'operated_by',
  'deployed_by',
  'generated_data_for',
  'evaluated_by',
  'authorized_by',
  'contributed_to',
  'caused',
  'monitored_by',
  'procured_from',
  'relies_on',
  'provides_input_to',
];

export function getDomainMetadata(domain: string): DomainMetadata {
  return (
    EBRR_DOMAINS[domain as EbrrDomain] || {
      domain: 'Other Relevant Element',
      color: 'slate',
      hex: '#64748B',
      icon: '⚪',
      defaultSubtitle: domain || 'Contextual Element',
      bgLight: 'bg-slate-500/15',
      borderLeft: 'border-l-slate-500',
    }
  );
}
