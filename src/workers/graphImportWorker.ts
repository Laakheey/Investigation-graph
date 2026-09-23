// =============================================================================
// Asynchronous Graph Processing (Redis + BullMQ Worker)
// -----------------------------------------------------------------------------
// Bulk CSV/JSON imports processed in background without blocking HTTP threads.
// =============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { graphServiceSingleton } from '@/services/graphService';
import { RedisCacheService } from '@/services/cacheService';
import type { NodeType, NodeStatus, EdgeDirectionality, EdgeLineStyle } from '@/types/domain';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
};

export const GRAPH_IMPORT_QUEUE_NAME = 'graph-bulk-import';

export interface ImportNodeItem {
  label: string;
  nodeType?: NodeType;
  status?: NodeStatus;
  subtitle?: string;
  description?: string;
  citationsCount?: number;
  properties?: Record<string, string | number | boolean>;
  position?: { x: number; y: number };
}

export interface ImportEdgeItem {
  sourceId: string;
  targetId: string;
  type?: string;
  label?: string;
  directionality?: EdgeDirectionality;
  lineStyle?: EdgeLineStyle;
  strokeColor?: string;
  weight?: number;
  properties?: Record<string, string | number | boolean>;
}

export interface GraphImportJobData {
  tenantId: string;
  userId: string;
  workspaceId: string;
  nodes: ImportNodeItem[];
  relationships: ImportEdgeItem[];
}

export interface GraphImportJobProgress {
  processedNodes: number;
  totalNodes: number;
  processedRelationships: number;
  totalRelationships: number;
  percent: number;
}

export interface BulkImportJobStatus {
  jobId: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress: GraphImportJobProgress;
  error?: string;
  createdAt: number;
  finishedAt?: number;
}

// In-memory job state fallback for development / test environments
const memoryJobStore = new Map<string, BulkImportJobStatus>();

let importQueue: Queue<GraphImportJobData> | null = null;

export function getGraphImportQueue(): Queue<GraphImportJobData> | null {
  if (importQueue) return importQueue;
  try {
    importQueue = new Queue<GraphImportJobData>(GRAPH_IMPORT_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
    return importQueue;
  } catch {
    return null;
  }
}

/**
 * Enqueue bulk import job with fallback processor for development.
 */
export async function enqueueGraphImport(data: GraphImportJobData): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Record initial job progress in memory
  const initialStatus: BulkImportJobStatus = {
    jobId,
    state: 'active',
    progress: {
      processedNodes: 0,
      totalNodes: data.nodes.length,
      processedRelationships: 0,
      totalRelationships: data.relationships.length,
      percent: 0,
    },
    createdAt: Date.now(),
  };
  memoryJobStore.set(jobId, initialStatus);

  const queue = getGraphImportQueue();
  let enqueuedInBullMQ = false;

  if (queue) {
    try {
      const job = await queue.add('bulk-import', data, { jobId });
      if (job && job.id) enqueuedInBullMQ = true;
    } catch {
      // BullMQ unavailable, will process via async background routine
    }
  }

  if (!enqueuedInBullMQ) {
    setTimeout(async () => {
      await processImportJobInline(jobId, data);
    }, 50);
  }

  return jobId;
}

/**
 * Retrieve current job status and progress.
 */
export async function getImportJobStatus(jobId: string): Promise<BulkImportJobStatus | null> {
  const queue = getGraphImportQueue();
  if (queue) {
    try {
      const job = await queue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        const progress = (job.progress as GraphImportJobProgress) || {
          processedNodes: 0,
          totalNodes: 0,
          processedRelationships: 0,
          totalRelationships: 0,
          percent: 0,
        };
        return {
          jobId,
          state: state as any,
          progress,
          error: job.failedReason,
          createdAt: job.timestamp,
          finishedAt: job.finishedOn,
        };
      }
    } catch {
      // fallback to memory status
    }
  }

  return memoryJobStore.get(jobId) || null;
}

const BATCH_SIZE = 50;

async function processImportJobInline(jobId: string, data: GraphImportJobData) {
  const { tenantId, userId, workspaceId, nodes, relationships } = data;
  const status = memoryJobStore.get(jobId);
  if (!status) return;

  try {
    let processedNodes = 0;
    let processedRelationships = 0;
    const totalItems = nodes.length + relationships.length;

    // Process nodes in batches
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((n) =>
          graphServiceSingleton.createNode(tenantId, userId, {
            workspaceId,
            label: n.label,
            nodeType: n.nodeType || 'Person',
            status: n.status || 'Active',
            subtitle: n.subtitle,
            description: n.description,
            citationsCount: n.citationsCount || 0,
            properties: n.properties || {},
            position: n.position,
          })
        )
      );
      processedNodes += batch.length;

      const percent =
        totalItems > 0 ? Math.round(((processedNodes + processedRelationships) / totalItems) * 100) : 100;
      status.progress = {
        processedNodes,
        totalNodes: nodes.length,
        processedRelationships,
        totalRelationships: relationships.length,
        percent,
      };
    }

    // Process relationships in batches
    for (let i = 0; i < relationships.length; i += BATCH_SIZE) {
      const batch = relationships.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((r) =>
          graphServiceSingleton.createEdge(tenantId, {
            workspaceId,
            sourceId: r.sourceId,
            targetId: r.targetId,
            type: r.type || 'ASSOCIATED_WITH',
            label: r.label,
            directionality: r.directionality || 'single',
            lineStyle: r.lineStyle || 'solid',
            strokeColor: r.strokeColor || '#2563EB',
            weight: r.weight,
            properties: r.properties || {},
          })
        )
      );
      processedRelationships += batch.length;

      const percent =
        totalItems > 0 ? Math.round(((processedNodes + processedRelationships) / totalItems) * 100) : 100;
      status.progress = {
        processedNodes,
        totalNodes: nodes.length,
        processedRelationships,
        totalRelationships: relationships.length,
        percent,
      };
    }

    status.state = 'completed';
    status.finishedAt = Date.now();
    status.progress.percent = 100;
  } catch (err: any) {
    status.state = 'failed';
    status.error = err?.message || 'Import failed';
    status.finishedAt = Date.now();
  }
}

export function startStandaloneWorker() {
  const worker = new Worker<GraphImportJobData>(
    GRAPH_IMPORT_QUEUE_NAME,
    async (job: Job<GraphImportJobData>) => {
      const { tenantId, userId, workspaceId, nodes, relationships } = job.data;
      let processedNodes = 0;
      let processedRelationships = 0;
      const totalItems = nodes.length + relationships.length;

      for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
        const batch = nodes.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((n) =>
            graphServiceSingleton.createNode(tenantId, userId, {
              workspaceId,
              label: n.label,
              nodeType: n.nodeType || 'Person',
              status: n.status || 'Active',
              subtitle: n.subtitle,
              description: n.description,
              citationsCount: n.citationsCount || 0,
              properties: n.properties || {},
              position: n.position,
            })
          )
        );
        processedNodes += batch.length;

        await job.updateProgress({
          processedNodes,
          totalNodes: nodes.length,
          processedRelationships,
          totalRelationships: relationships.length,
          percent:
            totalItems > 0
              ? Math.round(((processedNodes + processedRelationships) / totalItems) * 100)
              : 100,
        } satisfies GraphImportJobProgress);
      }

      for (let i = 0; i < relationships.length; i += BATCH_SIZE) {
        const batch = relationships.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((r) =>
            graphServiceSingleton.createEdge(tenantId, {
              workspaceId,
              sourceId: r.sourceId,
              targetId: r.targetId,
              type: r.type || 'ASSOCIATED_WITH',
              label: r.label,
              directionality: r.directionality || 'single',
              lineStyle: r.lineStyle || 'solid',
              strokeColor: r.strokeColor || '#2563EB',
              weight: r.weight,
              properties: r.properties || {},
            })
          )
        );
        processedRelationships += batch.length;

        await job.updateProgress({
          processedNodes,
          totalNodes: nodes.length,
          processedRelationships,
          totalRelationships: relationships.length,
          percent:
            totalItems > 0
              ? Math.round(((processedNodes + processedRelationships) / totalItems) * 100)
              : 100,
        } satisfies GraphImportJobProgress);
      }

      return { processedNodes, processedRelationships };
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 20, duration: 1000 },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[graphImportWorker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[graphImportWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
