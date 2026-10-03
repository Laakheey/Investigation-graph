// =============================================================================
// Business Logic Layer — Workspace Collaboration & RBAC Service
// -----------------------------------------------------------------------------
// Handles multi-user workspace membership, RBAC permissions, and invite tokens.
// Stores relationships natively in Neo4j with in-memory fallback.
// =============================================================================

import { randomUUID } from "crypto";
import { withSession } from "../db/neo4jDriver";
import type {
  WorkspaceRole,
  WorkspacePermissions,
  WorkspaceMember,
  WorkspaceInvite,
} from "../types/domain";

// In-memory fallback stores for development/offline
const memoryMembers = new Map<string, WorkspaceMember[]>(); // key: `${tenantId}:${workspaceId}`
const memoryInvites = new Map<string, WorkspaceInvite>(); // key: token

export class CollaborationService {
  /**
   * Evaluates user permissions for a specific workspace.
   */
  async getUserPermissions(
    tenantId: string,
    workspaceId: string,
    userId: string,
    isGuest = false,
  ): Promise<WorkspacePermissions> {
    if (isGuest || userId === "guest_user") {
      return {
        role: "GUEST_VIEWER",
        canEdit: false,
        canAdmin: false,
        canInvite: false,
        canDelete: false,
        canResolveConflicts: false,
        isGuest: true,
        permissions: ["read:investigations", "read:graph"],
      };
    }

    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (i:Investigation { tenantId: $tenantId, id: $workspaceId })
            OPTIONAL MATCH (u:User { id: $userId })-[m:MEMBER_OF]->(i)
            RETURN i.createdBy AS createdBy, m.role AS role
            `,
            { tenantId, workspaceId, userId },
          ),
        );

        if (result.records.length === 0) {
          // Default fallback: Authenticated users get OWNER permissions
          return this.derivePermissions(isGuest ? "GUEST_VIEWER" : "OWNER", isGuest);
        }

        const record = result.records[0];
        const createdBy = record.get("createdBy");
        const role = record.get("role");

        if (createdBy === userId || role === "OWNER") {
          return this.derivePermissions("OWNER", false);
        }

        if (role === "EDITOR") {
          return this.derivePermissions("EDITOR", false);
        }

        // Default authenticated members to EDITOR so they have full canEdit authoring capabilities
        return this.derivePermissions(isGuest ? "GUEST_VIEWER" : "EDITOR", isGuest);
      });
    } catch {
      // Memory fallback lookup
      const key = `${tenantId}:${workspaceId}`;
      const members = memoryMembers.get(key) || [];
      const member = members.find((m) => m.userId === userId);
      const role = member?.role || "OWNER"; // Default to OWNER in dev memory
      return this.derivePermissions(role, false);
    }
  }

  /**
   * Helper to derive boolean permission flags from role.
   */
  private derivePermissions(
    role: WorkspaceRole,
    isGuest: boolean,
  ): WorkspacePermissions {
    switch (role) {
      case "OWNER":
        return {
          role: "OWNER",
          canEdit: true,
          canAdmin: true,
          canInvite: true,
          canDelete: true,
          canResolveConflicts: true,
          isGuest: false,
          permissions: [
            "read:graph",
            "write:graph",
            "admin:workspace",
            "invite:member",
            "resolve:conflict",
          ],
        };
      case "EDITOR":
        return {
          role: "EDITOR",
          canEdit: true,
          canAdmin: false,
          canInvite: true,
          canDelete: false,
          canResolveConflicts: true,
          isGuest: false,
          permissions: ["read:graph", "write:graph", "resolve:conflict"],
        };
      case "VIEWER":
        return {
          role: "VIEWER",
          canEdit: false,
          canAdmin: false,
          canInvite: false,
          canDelete: false,
          canResolveConflicts: false,
          isGuest: false,
          permissions: ["read:graph"],
        };
      case "GUEST_VIEWER":
      default:
        return {
          role: "GUEST_VIEWER",
          canEdit: false,
          canAdmin: false,
          canInvite: false,
          canDelete: false,
          canResolveConflicts: false,
          isGuest: true,
          permissions: ["read:graph"],
        };
    }
  }

  /**
   * Adds or updates a member's role in an investigation workspace.
   */
  async addMemberToWorkspace(
    tenantId: string,
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    userName = "Collaborator",
    userEmail?: string,
  ): Promise<void> {
    const joinedAt = new Date().toISOString();

    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MERGE (u:User { id: $userId })
            ON CREATE SET u.name = $userName, u.email = $userEmail, u.createdAt = $joinedAt
            ON MATCH SET u.name = coalesce($userName, u.name)
            WITH u
            MATCH (i:Investigation { tenantId: $tenantId, id: $workspaceId })
            MERGE (u)-[m:MEMBER_OF]->(i)
            SET m.role = $role, m.joinedAt = $joinedAt
            `,
            { tenantId, workspaceId, userId, role, userName, userEmail: userEmail || null, joinedAt },
          ),
        );
      });
    } catch {
      // Memory fallback
      const key = `${tenantId}:${workspaceId}`;
      const list = memoryMembers.get(key) || [];
      const filtered = list.filter((m) => m.userId !== userId);
      filtered.push({ userId, name: userName, email: userEmail, role, joinedAt });
      memoryMembers.set(key, filtered);
    }
  }

  /**
   * Creates an email invitation with a secure token.
   */
  async createWorkspaceInvite(
    tenantId: string,
    workspaceId: string,
    inviterId: string,
    email: string,
    role: WorkspaceRole = "VIEWER",
  ): Promise<WorkspaceInvite> {
    const id = randomUUID();
    const token = `inv_${randomUUID().replace(/-/g, "")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const createdAt = now.toISOString();

    const invite: WorkspaceInvite = {
      id,
      token,
      workspaceId,
      tenantId,
      email: email.toLowerCase().trim(),
      role,
      inviterId,
      createdAt,
      expiresAt,
    };

    memoryInvites.set(token, invite);

    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (i:Investigation { tenantId: $tenantId, id: $workspaceId })
            CREATE (inv:WorkspaceInvite {
              id: $id,
              token: $token,
              workspaceId: $workspaceId,
              tenantId: $tenantId,
              email: $email,
              role: $role,
              inviterId: $inviterId,
              createdAt: $createdAt,
              expiresAt: $expiresAt
            })
            CREATE (inv)-[:FOR_WORKSPACE]->(i)
            `,
            {
              id,
              token,
              workspaceId,
              tenantId,
              email: invite.email,
              role,
              inviterId,
              createdAt,
              expiresAt,
            },
          ),
        );
      });
    } catch {
      // Memory fallback used
    }

    return invite;
  }

  /**
   * Accepts an invitation and grants workspace membership.
   */
  async acceptWorkspaceInvite(
    token: string,
    userId: string,
    userName = "Collaborator",
    userEmail?: string,
  ): Promise<{ workspaceId: string; role: WorkspaceRole; tenantId: string }> {
    let invite: WorkspaceInvite | null = memoryInvites.get(token) || null;

    try {
      const dbInvite = await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (inv:WorkspaceInvite { token: $token })
            WHERE inv.acceptedAt IS NULL
            RETURN inv
            `,
            { token },
          ),
        );
        if (result.records.length > 0) {
          return result.records[0].get("inv").properties as WorkspaceInvite;
        }
        return null;
      });
      if (dbInvite) invite = dbInvite;
    } catch {
      // Use memory invite
    }

    if (!invite) {
      throw new Error("Invalid or expired invitation token.");
    }

    if (new Date(invite.expiresAt) < new Date()) {
      throw new Error("This invitation has expired.");
    }

    // Add user as member
    await this.addMemberToWorkspace(
      invite.tenantId,
      invite.workspaceId,
      userId,
      invite.role,
      userName,
      userEmail || invite.email,
    );

    // Mark invite accepted
    const acceptedAt = new Date().toISOString();
    invite.acceptedAt = acceptedAt;

    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (inv:WorkspaceInvite { token: $token })
            SET inv.acceptedAt = $acceptedAt, inv.acceptedBy = $userId
            `,
            { token, acceptedAt, userId },
          ),
        );
      });
    } catch {
      // Ignored
    }

    return {
      workspaceId: invite.workspaceId,
      role: invite.role,
      tenantId: invite.tenantId,
    };
  }

  /**
   * Lists all active members of an investigation workspace.
   */
  async listWorkspaceMembers(
    tenantId: string,
    workspaceId: string,
  ): Promise<WorkspaceMember[]> {
    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (i:Investigation { tenantId: $tenantId, id: $workspaceId })
            OPTIONAL MATCH (u:User)-[m:MEMBER_OF]->(i)
            WHERE u.id IS NOT NULL
            RETURN u.id AS userId, u.name AS name, u.email AS email, u.picture AS picture, m.role AS role, m.joinedAt AS joinedAt
            ORDER BY m.joinedAt ASC
            `,
            { tenantId, workspaceId },
          ),
        );

        const members: WorkspaceMember[] = [];
        for (const rec of result.records) {
          const userId = rec.get("userId");
          if (userId) {
            members.push({
              userId,
              name: rec.get("name") || "Investigator",
              email: rec.get("email") || undefined,
              picture: rec.get("picture") || undefined,
              role: (rec.get("role") as WorkspaceRole) || "VIEWER",
              joinedAt: rec.get("joinedAt") || new Date().toISOString(),
            });
          }
        }
        return members;
      });
    } catch {
      const key = `${tenantId}:${workspaceId}`;
      return memoryMembers.get(key) || [];
    }
  }

  /**
   * Removes a member from a workspace.
   */
  async removeMember(
    tenantId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<void> {
    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MATCH (u:User { id: $targetUserId })-[m:MEMBER_OF]->(i:Investigation { tenantId: $tenantId, id: $workspaceId })
            DELETE m
            `,
            { tenantId, workspaceId, targetUserId },
          ),
        );
      });
    } catch {
      const key = `${tenantId}:${workspaceId}`;
      const list = memoryMembers.get(key) || [];
      memoryMembers.set(
        key,
        list.filter((m) => m.userId !== targetUserId),
      );
    }
  }
}

export const collaborationServiceSingleton = new CollaborationService();
