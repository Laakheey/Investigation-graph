// =============================================================================
// Domain Models — Single Source of Truth (Interface Segregation Principle)
// presentation, Service, and DAL layers import these decoupled contracts.
// =============================================================================

export type NodeType =
  | "Person"
  | "Organization"
  | "Location"
  | "Account"
  | "System"
  | "Consequential Conduct"
  | string;

export type NodeStatus =
  | "Active"
  | "Flagged"
  | "Verified"
  | "Archived"
  | "Pending";

export interface GraphNode {
  id: string;
  tenantId: string;
  workspaceId: string;
  label: string;
  nodeType: NodeType;
  status?: NodeStatus;
  citationsCount?: number;
  subtitle?: string;
  description?: string;
  position: { x: number; y: number };
  properties: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type EdgeDirectionality = "single" | "bidirectional" | "nondirectional";
export type EdgeLineStyle = "solid" | "dotted" | "dashed";

export interface GraphEdge {
  id: string;
  relId: string;
  tenantId: string;
  workspaceId: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string;
  directionality: EdgeDirectionality;
  lineStyle: EdgeLineStyle;
  strokeColor: string;
  weight?: number;
  properties: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface Investigation {
  id: string;
  tenantId: string;
  name: string;
  title?: string;
  description: string;
  conductType?: string;
  status?: string;
  leadInvestigator?: string;
  dateRange?: string;
  consequentialConduct?: string;
  knownPeopleOrgs?: string;
  knownAiSystems?: string;
  createdAt: string;
  updatedAt: string;
  mappedElements?: number;
  mappedRelationships?: number;
  unresolvedCount?: number;
}
