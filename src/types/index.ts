// =============================================================================
// Shared domain types — Single source of truth for EBRR Investigation SaaS
// =============================================================================

import type { ConductType, EbrrDomain } from "../lib/ebrrConstants";

/** Raw shape stored on a Neo4j :Node label. Every property is tenant-scoped. */
export interface Neo4jNodeRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  label: string;
  domain: EbrrDomain | string;
  subtitle?: string;
  description?: string;
  properties: Record<string, string | number | boolean>;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  createdBy: string; // userId
}

/** Raw shape stored on a :RELATES_TO relationship. */
export interface Neo4jRelationshipRecord {
  relId: string;
  tenantId: string;
  workspaceId: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
  properties: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

/** EBRR Matter / Investigation Record */
export interface InvestigationRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  conductType: ConductType;
  dateRange?: string;
  consequentialConduct?: string;
  knownPeopleOrgs?: string;
  knownAiSystems?: string;
  createdAt: string;
  updatedAt: string;
  mappedElements?: number;
  mappedRelationships?: number;
  unresolvedCount?: number;
  evidenceRecordsCount?: number;
}

// Backward compatibility alias
export type WorkspaceRecord = InvestigationRecord;

// -----------------------------------------------------------------------------
// ReGraph item shapes
// -----------------------------------------------------------------------------

export interface ReGraphNodeItem {
  id: string;
  type: "node";
  label?: string;
  combo?: string; // parent combo id, for domain-grouping
  style?: {
    color?: string;
    stroke?: string;
    icon?: { text?: string; color?: string };
    size?: number;
    font?: { size?: number; color?: string };
  };
  data?: {
    domain?: string;
    subtitle?: string;
    description?: string;
    createdAt?: string;
    createdBy?: string;
    [key: string]: unknown;
  };
}

export interface ReGraphComboItem {
  id: string;
  type: "combo";
  label?: string;
  style?: {
    color?: string;
    stroke?: string;
    lineWidth?: number;
  };
}

export interface ReGraphLinkItem {
  id: string;
  type: "link";
  id1: string; // source node id
  id2: string; // target node id
  label?: string;
  style?: {
    color?: string;
    width?: number;
    lineDash?: number[];
    arrow?: "forward" | "backward" | "both" | "none";
  };
  data?: Record<string, unknown>;
}

export type ReGraphItem = ReGraphNodeItem | ReGraphComboItem | ReGraphLinkItem;
export type ReGraphItemsMap = Record<string, ReGraphItem>;

// -----------------------------------------------------------------------------
// API payload contracts
// -----------------------------------------------------------------------------

export interface CreateNodePayload {
  workspaceId: string;
  label: string;
  domain: string;
  subtitle?: string;
  description?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface UpdateNodePayload {
  label?: string;
  domain?: string;
  subtitle?: string;
  description?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface CreateRelationshipPayload {
  workspaceId: string;
  sourceId?: string;
  targetId?: string;
  type: string;
  weight?: number;
  properties?: Record<string, string | number | boolean>;
}

export interface CreateInvestigationPayload {
  name: string;
  description: string;
  conductType?: ConductType;
  dateRange?: string;
  consequentialConduct?: string;
  knownPeopleOrgs?: string;
  knownAiSystems?: string;
}

export type CreateWorkspacePayload = CreateInvestigationPayload;

/** Standardized API envelope */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code:
      | "BAD_REQUEST"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
}

/** Decoded, verified session context */
export interface AuthContext {
  userId: string;
  email?: string;
  name?: string;
  tenantId: string;
  tenantName?: string;
  roles: string[];
  permissions?: string[];
}

/** Bulk Import types */
export interface BulkImportPayload {
  workspaceId: string;
  nodes: Array<{
    id?: string;
    label: string;
    domain: string;
    subtitle?: string;
    description?: string;
    properties?: Record<string, string | number | boolean>;
  }>;
  relationships: Array<{
    sourceId: string;
    targetId: string;
    type: string;
    weight?: number;
    properties?: Record<string, string | number | boolean>;
  }>;
}

export interface BulkImportJobStatus {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress: {
    processedNodes: number;
    totalNodes: number;
    processedRelationships: number;
    totalRelationships: number;
    percent: number;
  };
  error?: string;
  createdAt: number;
  finishedAt?: number;
}
