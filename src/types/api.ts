// =============================================================================
// API Payloads & Zod Validation Schemas (Single Responsibility Principle)
// Controller layer uses these schemas to validate requests before calling services.
// =============================================================================

import { z } from "zod";
import type { GraphNode, GraphEdge, Investigation } from "./domain";

export const CreateNodeSchema = z.object({
  workspaceId: z.string().min(1),
  label: z.string().min(1).max(200),
  nodeType: z.string().min(1).max(100),
  status: z
    .enum(["Active", "Flagged", "Verified", "Archived", "Pending"])
    .optional(),
  citationsCount: z.number().int().nonnegative().optional(),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  properties: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const UpdateNodeSchema = z.object({
  workspaceId: z.string().min(1),
  label: z.string().min(1).max(200).optional(),
  nodeType: z.string().min(1).max(100).optional(),
  status: z
    .enum(["Active", "Flagged", "Verified", "Archived", "Pending"])
    .optional(),
  citationsCount: z.number().int().nonnegative().optional(),
  subtitle: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  properties: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const CreateEdgeSchema = z.object({
  workspaceId: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  type: z.string().min(1).max(100),
  label: z.string().max(100).optional(),
  directionality: z
    .enum(["single", "bidirectional", "nondirectional"])
    .default("single"),
  lineStyle: z.enum(["solid", "dotted", "dashed"]).default("solid"),
  strokeColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .default("#2563EB"),
  weight: z.number().positive().optional(),
  properties: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const UpdateEdgeSchema = z.object({
  workspaceId: z.string().min(1),
  type: z.string().min(1).max(100).optional(),
  label: z.string().max(100).optional(),
  directionality: z
    .enum(["single", "bidirectional", "nondirectional"])
    .optional(),
  lineStyle: z.enum(["solid", "dotted", "dashed"]).optional(),
  strokeColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  weight: z.number().positive().optional(),
  properties: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const CreateInvestigationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000),
  conductType: z.string().max(100).default("Ongoing practice"),
  dateRange: z.string().max(100).optional(),
  consequentialConduct: z.string().max(5000).optional(),
  knownPeopleOrgs: z.string().max(2000).optional(),
  knownAiSystems: z.string().max(2000).optional(),
  status: z.string().optional(),
  leadInvestigator: z.string().optional(),
}).refine((data) => data.name || data.title, {
  message: "Either name or title must be provided",
});

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

export interface AuthContext {
  userId: string;
  email?: string;
  name?: string;
  tenantId: string;
  tenantName?: string;
  roles: string[];
  permissions?: string[];
}
