import PgBoss from "pg-boss";
import { db } from "@/db";
import { failedJobs } from "@/db/schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ai_tech_consultant";

let bossInstance: PgBoss | null = null;

export function getBoss(): PgBoss {
  if (!bossInstance) {
    bossInstance = new PgBoss(connectionString);
  }
  return bossInstance;
}

export interface JobPayload<T = unknown> {
  businessId: string;
  data: T;
}

export interface EnqueueOptions {
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  expireInSeconds?: number;
}

/**
 * Initializes the Postgres-backed pg-boss job queue.
 */
export async function startQueue(): Promise<PgBoss> {
  const boss = getBoss();
  await boss.start();
  return boss;
}

/**
 * Enqueues a persistent job with automatic retry options.
 */
export async function enqueueJob<T = unknown>(
  queueName: string,
  businessId: string,
  data: T,
  options?: EnqueueOptions
): Promise<string | null> {
  const boss = getBoss();
  const payload: JobPayload<T> = { businessId, data };

  const jobId = await boss.send(queueName, payload, {
    retryLimit: options?.retryLimit ?? 3,
    retryDelay: options?.retryDelay ?? 5,
    retryBackoff: options?.retryBackoff ?? true,
    expireInSeconds: options?.expireInSeconds ?? 1800,
  });

  return jobId;
}

/**
 * Registers a worker handler for a specific queue with automatic failed job capture.
 */
export async function registerWorker<T = unknown>(
  queueName: string,
  handler: (payload: JobPayload<T>) => Promise<void>
) {
  const boss = getBoss();

  await boss.work(queueName, async (jobs) => {
    // pg-boss can deliver single or array of jobs
    const jobList = Array.isArray(jobs) ? jobs : [jobs];

    for (const job of jobList) {
      const payload = job.data as JobPayload<T>;
      try {
        await handler(payload);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        // If this is the last attempt or job failed permanently, record into failed_jobs
        const retryCount = (job as unknown as { retrycount?: number }).retrycount ?? 0;
        const retryLimit = (job as unknown as { retrylimit?: number }).retrylimit ?? 3;

        if (retryCount >= retryLimit - 1) {
          try {
            await db.insert(failedJobs).values({
              businessId: payload.businessId,
              queueName,
              payload: payload as unknown as Record<string, unknown>,
              errorStack: error.stack || error.message,
              retryCount: retryCount + 1,
            });
          } catch (dbErr) {
            console.error("Failed to log into failed_jobs table:", dbErr);
          }
        }
        throw error; // Re-throw so pg-boss handles the retry state
      }
    }
  });
}
