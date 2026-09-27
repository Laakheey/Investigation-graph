// =============================================================================
// Domain Models — Single Source of Truth (Interface Segregation Principle)
// Presentation, Service, and DAL layers import these decoupled contracts.
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

export type EdgeDirectionality = "single" | "bidirectional" | "nondirectional";
export type EdgeLineStyle = "solid" | "dotted" | "dashed";

// ── Workspace Roles & RBAC ───────────────────────────────────────────────────
export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER" | "GUEST_VIEWER";

export interface WorkspacePermissions {
  role: WorkspaceRole;
  canEdit: boolean;
  canAdmin: boolean;
  canInvite: boolean;
  canDelete: boolean;
  canResolveConflicts: boolean;
  isGuest: boolean;
  permissions: string[];
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email?: string;
  picture?: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvite {
  id: string;
  token: string;
  workspaceId: string;
  tenantId: string;
  email: string;
  role: WorkspaceRole;
  inviterId: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

// ── Conflict Engine ──────────────────────────────────────────────────────────
export interface ConflictedFieldData {
  originalValue: any;
  currentValue: any;
  incomingValue: any;
  authorA?: { userId: string; name: string; timestamp: string };
  authorB?: { userId: string; name: string; timestamp: string };
}

export interface ConflictRecord {
  entityId: string;
  entityType: "NODE" | "EDGE";
  workspaceId: string;
  tenantId: string;
  hasConflict: boolean;
  conflictedFields: Record<string, ConflictedFieldData>;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ── Temporal Audit Models ────────────────────────────────────────────────────
export type AuditActionType =
  | "CREATE_NODE"
  | "UPDATE_NODE_POSITION"
  | "UPDATE_NODE_PROPERTIES"
  | "DELETE_NODE"
  | "CREATE_EDGE"
  | "UPDATE_EDGE_STYLING"
  | "DELETE_EDGE"
  | "FLAG_CONFLICT"
  | "RESOLVE_CONFLICT"
  | "INVITE_USER"
  | "JOIN_WORKSPACE";

export interface AuditActionRecord {
  id: string;
  timestamp: string;
  action: AuditActionType;
  userId: string;
  userName?: string;
  userEmail?: string;
  entityType: "Node" | "Edge" | "Workspace" | "Investigation";
  entityId: string;
  workspaceId: string;
  tenantId: string;
  fieldName?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

// ── Graph Node & Edge Models ─────────────────────────────────────────────────
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
  updatedBy?: string;
  version: number;
  hasConflict?: boolean;
  conflictedFields?: Record<string, ConflictedFieldData>;
}

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
  createdBy?: string;
  updatedBy?: string;
  version: number;
  hasConflict?: boolean;
  conflictedFields?: Record<string, ConflictedFieldData>;
}

// ── Investigation (Workspace) Model ──────────────────────────────────────────
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
  createdBy?: string;
  mappedElements?: number;
  mappedRelationships?: number;
  unresolvedCount?: number;
  hasConflict?: boolean;
}

// ── Auth Context Shape ───────────────────────────────────────────────────────
export interface AuthContext {
  userId: string;
  email?: string;
  name: string;
  picture?: string;
  tenantId: string;
  tenantName: string;
  roles: string[];
  role?: WorkspaceRole;
  isGuest?: boolean;
  permissions: string[];
}
