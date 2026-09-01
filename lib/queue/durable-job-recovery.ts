import { GenerationJobStatus } from "@prisma/client";
import type { DurableJobDispatcher } from "./durable-job-dispatcher";
import type { DurableJob, DurableJobLifecycle } from "./lifecycle-port";
import {
  structuredQueueLogger,
  type QueueLogger,
} from "./structured-log";

export type RecoverySummary = {
  inspected: number;
  recoveredLeases: number;
  dispatched: number;
  skipped: number;
  failed: number;
};

export class DurableJobRecovery {
  constructor(
    private readonly lifecycle: DurableJobLifecycle,
    private readonly dispatcher: DurableJobDispatcher,
    private readonly logger: QueueLogger = structuredQueueLogger
  ) {}

  async reconcile(
    now = new Date(),
    limit = 50
  ): Promise<RecoverySummary> {
    const candidates = await this.lifecycle.listRecoveryCandidates(now, limit);
    const summary: RecoverySummary = {
      inspected: candidates.length,
      recoveredLeases: 0,
      dispatched: 0,
      skipped: 0,
      failed: 0,
    };

    for (const candidate of candidates) {
      try {
        let job = candidate;
        if (hasExpiredActiveLease(job, now)) {
          job = await this.lifecycle.recoverExpiredLease(job.id, now);
          summary.recoveredLeases += 1;
          this.log("recovery.lease_recovered", job);
        }

        if (isDispatchable(job, now)) {
          await this.dispatcher.dispatch(job.id, job.userId, now);
          summary.dispatched += 1;
        } else {
          summary.skipped += 1;
          this.log("recovery.skipped", job);
        }
      } catch {
        summary.failed += 1;
        this.log("recovery.failed", candidate);
      }
    }

    return summary;
  }

  private log(event: string, job: DurableJob): void {
    this.logger({
      event,
      jobId: job.id,
      generationId: job.generationId,
      status: job.status,
    });
  }
}

function hasExpiredActiveLease(job: DurableJob, now: Date): boolean {
  return (
    (job.status === GenerationJobStatus.claimed ||
      job.status === GenerationJobStatus.running ||
      job.status === GenerationJobStatus.waiting_provider) &&
    job.leaseExpiresAt !== null &&
    job.leaseExpiresAt.getTime() <= now.getTime()
  );
}

function isDispatchable(job: DurableJob, now: Date): boolean {
  return (
    job.status === GenerationJobStatus.queued ||
    (job.status === GenerationJobStatus.retry_scheduled &&
      job.nextRetryAt !== null &&
      job.nextRetryAt.getTime() <= now.getTime() &&
      job.attemptCount < job.maxAttempts) ||
    (job.status === GenerationJobStatus.failed &&
      job.nextRetryAt !== null &&
      job.nextRetryAt.getTime() <= now.getTime() &&
      job.attemptCount < job.maxAttempts)
  );
}
