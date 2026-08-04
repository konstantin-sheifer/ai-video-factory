import { GenerationJobStatus } from "@prisma/client";
import type { JobQueue } from "./contracts";
import { QueueValidationError } from "./errors";
import {
  JobCancellationSignal,
  JobHandlerFailure,
  JobLeaseLostSignal,
  type JobHandlerRegistry,
} from "./job-handler";
import type { DurableJob, DurableJobLifecycle } from "./lifecycle-port";
import {
  structuredQueueLogger,
  type QueueLogger,
} from "./structured-log";
import { buildAttemptKey } from "./durable-job-dispatcher";

export type WorkerExecutionResult = {
  jobId: string;
  outcome:
    | "completed"
    | "cancelled"
    | "duplicate"
    | "not_executable"
    | "retry_scheduled"
    | "failed"
    | "dead_letter"
    | "lease_lost";
};

export type DurableWorkerOptions = {
  workerIdentity: string;
  leaseDurationMs: number;
  heartbeatIntervalMs: number;
  defaultRetryDelayMs?: number;
};

export class DurableWorkerExecutor {
  private readonly activeExecutions = new Map<string, AbortController>();
  private shuttingDown = false;

  constructor(
    private readonly lifecycle: DurableJobLifecycle,
    private readonly queue: JobQueue,
    private readonly handlers: JobHandlerRegistry,
    private readonly options: DurableWorkerOptions,
    private readonly logger: QueueLogger = structuredQueueLogger
  ) {
    if (!options.workerIdentity.trim()) {
      throw new QueueValidationError("A worker identity is required.");
    }
    if (
      !Number.isInteger(options.leaseDurationMs) ||
      options.leaseDurationMs < 1
    ) {
      throw new QueueValidationError(
        "Worker lease duration must be a positive integer."
      );
    }
    if (
      !Number.isInteger(options.heartbeatIntervalMs) ||
      options.heartbeatIntervalMs < 1 ||
      options.heartbeatIntervalMs >= options.leaseDurationMs
    ) {
      throw new QueueValidationError(
        "Heartbeat interval must be positive and shorter than the lease."
      );
    }
  }

  async process(jobId: string): Promise<WorkerExecutionResult> {
    if (this.shuttingDown) {
      return { jobId, outcome: "not_executable" };
    }
    if (this.activeExecutions.has(jobId)) {
      this.log("worker.duplicate_delivery", { id: jobId });
      return { jobId, outcome: "duplicate" };
    }

    const controller = new AbortController();
    this.activeExecutions.set(jobId, controller);

    try {
      let job = await this.lifecycle.loadJobForWorker(jobId);
      job = await this.prepareForDelivery(job);

      if (job.status !== GenerationJobStatus.queued) {
        this.log("worker.delivery_skipped", job, {
          outcome: "not_executable",
        });
        return { jobId, outcome: "not_executable" };
      }

      try {
        job = await this.lifecycle.acquireLease(
          job.id,
          job.userId,
          this.options.workerIdentity,
          this.options.leaseDurationMs
        );
      } catch (error) {
        if (isLifecycleConflict(error)) {
          this.log("worker.duplicate_delivery", job);
          return { jobId, outcome: "duplicate" };
        }
        throw error;
      }

      this.log("worker.lease_acquired", job);
      job = await this.lifecycle.startJob(
        job.id,
        job.userId,
        this.options.workerIdentity
      );
      this.log("worker.started", job);

      return await this.executeHandler(job, controller);
    } finally {
      this.activeExecutions.delete(jobId);
    }
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const controller of this.activeExecutions.values()) {
      controller.abort();
    }
    await this.queue.close();
  }

  private async prepareForDelivery(job: DurableJob): Promise<DurableJob> {
    if (job.status === GenerationJobStatus.failed) {
      const retry = this.lifecycle.getRetryBookkeeping(job);
      if (!retry.eligible) {
        return job;
      }
      job = await this.lifecycle.retryJob(job.id, job.userId);
    }

    if (job.status === GenerationJobStatus.retry_scheduled) {
      job = await this.lifecycle.queueJob(job.id, job.userId);
    }

    return job;
  }

  private async executeHandler(
    startedJob: DurableJob,
    controller: AbortController
  ): Promise<WorkerExecutionResult> {
    let leaseLost = false;
    let renewalInProgress = false;
    let renewalPromise: Promise<void> | null = null;
    const heartbeat = setInterval(() => {
      if (renewalInProgress || leaseLost) {
        return;
      }
      renewalInProgress = true;
      const pendingRenewal = this.lifecycle
        .renewLease(
          startedJob.id,
          startedJob.userId,
          this.options.workerIdentity,
          this.options.leaseDurationMs
        )
        .then(() => {
          this.log("worker.heartbeat", startedJob);
        })
        .catch(() => {
          leaseLost = true;
          controller.abort();
          this.log("worker.lease_lost", startedJob);
        })
        .finally(() => {
          renewalInProgress = false;
          if (renewalPromise === pendingRenewal) {
            renewalPromise = null;
          }
        });
      renewalPromise = pendingRenewal;
    }, this.options.heartbeatIntervalMs);

    const stopHeartbeat = () => clearInterval(heartbeat);

    try {
      const handler = this.handlers[startedJob.type];
      if (!handler) {
        throw new JobHandlerFailure({
          category: "worker",
          code: "handler_unavailable",
          message: "No worker handler is registered for this job type.",
          retryable: false,
        });
      }

      const output = await handler({
        job: startedJob,
        signal: controller.signal,
        checkpoint: async (progress) => {
          if (leaseLost) {
            throw new JobLeaseLostSignal();
          }

          const current = await this.lifecycle.loadJobForWorker(startedJob.id);
          if (
            current.status === GenerationJobStatus.cancelling ||
            current.status === GenerationJobStatus.cancelled
          ) {
            controller.abort();
            throw new JobCancellationSignal();
          }

          await this.lifecycle.validateLease(
            current.id,
            current.userId,
            this.options.workerIdentity
          );

          if (progress !== undefined) {
            await this.lifecycle.updateProgress(
              current.id,
              current.userId,
              progress,
              this.options.workerIdentity
            );
            this.log("worker.progress", current, { progress });
          }
        },
      });

      stopHeartbeat();
      await renewalPromise;

      if (leaseLost) {
        return { jobId: startedJob.id, outcome: "lease_lost" };
      }

      await this.lifecycle.validateLease(
        startedJob.id,
        startedJob.userId,
        this.options.workerIdentity
      );
      const completed = await this.lifecycle.completeJob(
        startedJob.id,
        startedJob.userId,
        this.options.workerIdentity,
        output
      );
      this.log("worker.completed", completed);
      return { jobId: startedJob.id, outcome: "completed" };
    } catch (error) {
      if (
        this.shuttingDown ||
        leaseLost ||
        error instanceof JobLeaseLostSignal
      ) {
        return { jobId: startedJob.id, outcome: "lease_lost" };
      }

      const current = await this.lifecycle.loadJobForWorker(startedJob.id);
      if (
        current.status === GenerationJobStatus.cancelled ||
        error instanceof JobCancellationSignal
      ) {
        if (current.status !== GenerationJobStatus.cancelled) {
          await this.lifecycle.cancelJob(
            current.id,
            current.userId,
            "Worker observed a cancellation request."
          );
        }
        this.log("worker.cancelled", current);
        return { jobId: startedJob.id, outcome: "cancelled" };
      }

      try {
        await this.lifecycle.validateLease(
          current.id,
          current.userId,
          this.options.workerIdentity
        );
      } catch {
        this.log("worker.lease_lost", current);
        return { jobId: startedJob.id, outcome: "lease_lost" };
      }

      const failure = normalizeHandlerFailure(error);
      const canRetry =
        failure.retryable && current.attemptCount < current.maxAttempts;
      const nextRetryAt = canRetry
        ? new Date(
            Date.now() +
              (failure.retryDelayMs ??
                this.options.defaultRetryDelayMs ??
                5_000)
          )
        : undefined;
      const failed = await this.lifecycle.failJob(
        current.id,
        current.userId,
        {
          category: failure.category,
          code: failure.code,
          message: failure.message,
          retryable: failure.retryable,
        },
        {
          leaseOwner: this.options.workerIdentity,
          nextRetryAt,
        }
      );

      this.log("worker.failed", failed, {
        failureCategory: failure.category,
        retryAt: nextRetryAt?.toISOString(),
      });

      if (
        failed.status === GenerationJobStatus.failed &&
        failed.nextRetryAt
      ) {
        try {
          await this.queue.enqueue({
            jobId: failed.id,
            deduplicationKey: buildAttemptKey(failed),
            runAt: failed.nextRetryAt,
          });
          this.log("worker.retry_scheduled", failed, {
            retryAt: failed.nextRetryAt.toISOString(),
          });
        } catch {
          this.log("worker.retry_enqueue_failed", failed, {
            retryAt: failed.nextRetryAt.toISOString(),
          });
        }
        return { jobId: failed.id, outcome: "retry_scheduled" };
      }

      return {
        jobId: failed.id,
        outcome:
          failed.status === GenerationJobStatus.dead_letter
            ? "dead_letter"
            : "failed",
      };
    } finally {
      stopHeartbeat();
    }
  }

  private log(
    event: string,
    job: DurableJob | { id: string },
    fields: {
      progress?: number;
      failureCategory?: string;
      retryAt?: string;
      outcome?: string;
    } = {}
  ): void {
    this.logger({
      event,
      jobId: job.id,
      ...("generationId" in job
        ? {
            generationId: job.generationId,
            status: job.status,
          }
        : {}),
      workerId: this.options.workerIdentity,
      ...fields,
    });
  }
}

function normalizeHandlerFailure(error: unknown): {
  category: string;
  code?: string;
  message: string;
  retryable: boolean;
  retryDelayMs?: number;
} {
  if (error instanceof JobHandlerFailure) {
    return {
      category: error.category,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      retryDelayMs: error.retryDelayMs,
    };
  }

  return {
    category: "worker",
    code: "unexpected_handler_failure",
    message: "The durable job handler failed unexpectedly.",
    retryable: false,
  };
}

function isLifecycleConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "LIFECYCLE_CONFLICT"
  );
}
