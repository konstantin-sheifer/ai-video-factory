import { GenerationJobStatus } from "@prisma/client";
import type { JobQueue, QueueReference } from "./contracts";
import {
  QueueError,
  QueueUnavailableError,
  QueueValidationError,
} from "./errors";
import type { DurableJob, DurableJobLifecycle } from "./lifecycle-port";
import {
  structuredQueueLogger,
  type QueueLogger,
} from "./structured-log";

export type DispatchResult = {
  job: DurableJob;
  queueReference: QueueReference;
};

export class DurableJobDispatcher {
  constructor(
    private readonly lifecycle: DurableJobLifecycle,
    private readonly queue: JobQueue,
    private readonly logger: QueueLogger = structuredQueueLogger
  ) {}

  async dispatch(
    jobId: string,
    userId: string,
    now = new Date()
  ): Promise<DispatchResult> {
    let job = await this.lifecycle.loadJob(jobId, userId);

    if (job.status === GenerationJobStatus.retry_scheduled) {
      job = await this.lifecycle.queueJob(job.id, userId);
    }

    const runAt = resolveDispatchTime(job, now);
    const deduplicationKey = buildAttemptKey(job);

    try {
      const queueReference = await this.queue.enqueue({
        jobId: job.id,
        deduplicationKey,
        runAt,
      });

      this.logger({
        event: "queue.submitted",
        jobId: job.id,
        generationId: job.generationId,
        queueReferenceId: queueReference.id,
        status: job.status,
        retryAt: runAt.toISOString(),
        outcome: queueReference.deduplicated ? "deduplicated" : "enqueued",
      });

      return { job, queueReference };
    } catch (error) {
      if (error instanceof QueueError) {
        throw error;
      }
      throw new QueueUnavailableError(
        "The durable job could not be submitted."
      );
    }
  }

  async cancel(
    jobId: string,
    userId: string,
    reason: string,
    queueReferenceId?: string
  ): Promise<DurableJob> {
    const job = await this.lifecycle.cancelJob(jobId, userId, reason);

    if (queueReferenceId) {
      await this.queue.cancel(queueReferenceId);
    }

    this.logger({
      event: "queue.cancelled",
      jobId: job.id,
      generationId: job.generationId,
      status: job.status,
    });

    return job;
  }
}

export function buildAttemptKey(job: DurableJob): string {
  return `generation-job:${job.id}:attempt:${job.attemptCount + 1}`;
}

function resolveDispatchTime(job: DurableJob, now: Date): Date {
  if (job.status === GenerationJobStatus.queued) {
    return now;
  }

  if (
    job.status === GenerationJobStatus.failed &&
    job.nextRetryAt &&
    job.attemptCount < job.maxAttempts
  ) {
    return job.nextRetryAt;
  }

  throw new QueueValidationError(
    `A ${job.status} durable job is not eligible for dispatch.`
  );
}
