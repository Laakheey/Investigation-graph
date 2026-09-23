// =============================================================================
// Business Logic Layer — Investigation Management Service
// =============================================================================

import { randomUUID } from "crypto";
import { withSession } from "../db/neo4jDriver";
import type { Investigation } from "../types/domain";

const memoryInvestigations = new Map<string, Investigation>();

export class InvestigationService {
  async listInvestigations(tenantId: string): Promise<Investigation[]> {
    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (i:Investigation { tenantId: $tenantId })
            OPTIONAL MATCH (i)-[:CONTAINS]->(n:Node { tenantId: $tenantId })
            OPTIONAL MATCH (n)-[r:RELATES_TO { tenantId: $tenantId }]->()
            RETURN
              i,
              count(DISTINCT n) AS mappedElements,
              count(DISTINCT r) AS mappedRelationships
            ORDER BY i.createdAt DESC
            `,
            { tenantId },
          ),
        );

        return result.records.map((rec) => {
          const props = rec.get("i").properties as Investigation;
          return {
            ...props,
            mappedElements: Number(rec.get("mappedElements")) || 0,
            mappedRelationships: Number(rec.get("mappedRelationships")) || 0,
            unresolvedCount: 0,
          };
        });
      });
    } catch {
      const list: Investigation[] = [];
      for (const inv of memoryInvestigations.values()) {
        if (inv.tenantId === tenantId) list.push(inv);
      }
      return list;
    }
  }

  async getInvestigationById(
    tenantId: string,
    id: string,
  ): Promise<Investigation | null> {
    try {
      return await withSession(async (session) => {
        const result = await session.executeRead((tx) =>
          tx.run(
            `
            MATCH (i:Investigation { tenantId: $tenantId, id: $id })
            OPTIONAL MATCH (i)-[:CONTAINS]->(n:Node { tenantId: $tenantId })
            OPTIONAL MATCH (n)-[r:RELATES_TO { tenantId: $tenantId }]->()
            RETURN
              i,
              count(DISTINCT n) AS mappedElements,
              count(DISTINCT r) AS mappedRelationships
            `,
            { tenantId, id },
          ),
        );

        if (result.records.length === 0) return null;
        const rec = result.records[0];
        const props = rec.get("i").properties as Investigation;
        return {
          ...props,
          mappedElements: Number(rec.get("mappedElements")) || 0,
          mappedRelationships: Number(rec.get("mappedRelationships")) || 0,
          unresolvedCount: 0,
        };
      });
    } catch {
      return memoryInvestigations.get(`${tenantId}:${id}`) || null;
    }
  }

  async createInvestigation(
    tenantId: string,
    userId: string,
    payload: {
      name?: string;
      title?: string;
      description: string;
      conductType?: string;
      dateRange?: string;
      consequentialConduct?: string;
      knownPeopleOrgs?: string;
      knownAiSystems?: string;
      status?: string;
      leadInvestigator?: string;
    },
  ): Promise<Investigation> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const name = payload.name || payload.title || "Untitled Investigation";
    const title = payload.title || payload.name || "Untitled Investigation";

    const record: Investigation = {
      id,
      tenantId,
      name,
      title,
      description: payload.description,
      conductType: payload.conductType || "Ongoing practice",
      dateRange: payload.dateRange,
      consequentialConduct: payload.consequentialConduct,
      knownPeopleOrgs: payload.knownPeopleOrgs,
      knownAiSystems: payload.knownAiSystems,
      status: payload.status || "ACTIVE",
      leadInvestigator: payload.leadInvestigator,
      createdAt: now,
      updatedAt: now,
      mappedElements: 0,
      mappedRelationships: 0,
      unresolvedCount: 0,
    };

    memoryInvestigations.set(`${tenantId}:${id}`, record);

    try {
      await withSession(async (session) => {
        await session.executeWrite((tx) =>
          tx.run(
            `
            MERGE (t:Tenant { id: $tenantId })
            CREATE (i:Investigation:Workspace {
              id: $id,
              tenantId: $tenantId,
              name: $name,
              title: $title,
              description: $description,
              conductType: $conductType,
              dateRange: $dateRange,
              consequentialConduct: $consequentialConduct,
              knownPeopleOrgs: $knownPeopleOrgs,
              knownAiSystems: $knownAiSystems,
              status: $status,
              leadInvestigator: $leadInvestigator,
              createdAt: $now,
              updatedAt: $now
            })
            MERGE (t)-[:HAS_INVESTIGATION]->(i)
            `,
            {
              tenantId,
              id,
              name,
              title,
              description: payload.description,
              conductType: payload.conductType || "Ongoing practice",
              dateRange: payload.dateRange || null,
              consequentialConduct: payload.consequentialConduct || null,
              knownPeopleOrgs: payload.knownPeopleOrgs || null,
              knownAiSystems: payload.knownAiSystems || null,
              status: payload.status || "ACTIVE",
              leadInvestigator: payload.leadInvestigator || null,
              now,
            },
          ),
        );
      });
    } catch {
      // Memory store already set
    }

    return record;
  }
}

export const investigationServiceSingleton = new InvestigationService();
