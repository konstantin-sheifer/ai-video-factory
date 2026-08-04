import {
  ExecutionMode,
  GenerationJobStatus,
  GenerationJobType,
  type GenerationJob,
  type Prisma,
} from "@prisma/client";
import {
  sanitizeFailure,
  LifecycleConflictError,
  LifecycleValidationError,
  type FailureInput,
} from "../../lib/domain/generation-lifecycle";
import type {
  DurableJob,
  DurableJobLifecycle,
} from "../../lib/queue/lifecycle-port";

export class FakeLifecycle implements DurableJobLifecycle {
  job: DurableJob;
  renewals = 0;
  starts = 0;
  completions = 0;
  failures = 0;
  recoveries = 0;
  loseLeaseOnRenew = false;
  cancelOnProgress: number | null = null;
  lastFailureMessage = "";
  candidates: DurableJob[] = [];

  constructor(job = makeJob()) {
    this.job = job;
  }

  async loadJob(id: string, userId: string): Promise<DurableJob> {
    if (this.job.id !== id || this.job.userId !== userId) {
      throw new Error("not found");
    }
    return this.job;
  }

  async loadJobForWorker(id: string): Promise<DurableJob> {
    if (this.job.id !== id) {
      throw new Error("not found");
    }
    return this.job;
  }

  async queueJob(): Promise<DurableJob> {
    this.job = updateJob(this.job, {
      status: GenerationJobStatus.queued,
      nextRetryAt: null,
    });
    return this.job;
  }

  async acquireLease(
    _id: string,
    _userId: string,
    leaseOwner: string,
    leaseDurationMs: number,
    now = new Date()
  ): Promise<DurableJob> {
    if (this.job.status !== GenerationJobStatus.queued) {
      throw new LifecycleConflictError("not queueable");
    }
    this.job = updateJob(this.job, {
      status: GenerationJobStatus.claimed,
      leaseOwner,
      leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
      heartbeatAt: now,
    });
    return this.job;
  }

  async renewLease(
    _id: string,
    _userId: string,
    leaseOwner: string,
    leaseDurationMs: number,
    now = new Date()
  ): Promise<DurableJob> {
    this.renewals += 1;
    if (this.loseLeaseOnRenew || this.job.leaseOwner !== leaseOwner) {
      throw new LifecycleConflictError("lease lost");
    }
    this.job = updateJob(this.job, {
      leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
      heartbeatAt: now,
    });
    return this.job;
  }

  async validateLease(
    _id: string,
    _userId: string,
    leaseOwner: string,
    now = new Date()
  ): Promise<DurableJob> {
    if (
      this.job.leaseOwner !== leaseOwner ||
      !this.job.leaseExpiresAt ||
      this.job.leaseExpiresAt.getTime() <= now.getTime()
    ) {
      throw new LifecycleConflictError("lease invalid");
    }
    return this.job;
  }

  async startJob(): Promise<DurableJob> {
    this.starts += 1;
    this.job = updateJob(this.job, {
      status: GenerationJobStatus.running,
      attemptCount: this.job.attemptCount + 1,
      startedAt: this.job.startedAt ?? new Date(),
    });
    return this.job;
  }

  async completeJob(
    _id: string,
    _userId: string,
    _leaseOwner: string,
    outputJson?: Prisma.InputJsonValue
  ): Promise<DurableJob> {
    this.completions += 1;
    this.job = updateJob(this.job, {
      status: GenerationJobStatus.succeeded,
      progress: 100,
      outputJson: (outputJson ?? null) as Prisma.JsonValue,
      completedAt: new Date(),
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    return this.job;
  }

  async failJob(
    _id: string,
    _userId: string,
    failure: FailureInput,
    options: { nextRetryAt?: Date } = {}
  ): Promise<DurableJob> {
    this.failures += 1;
    const sanitized = sanitizeFailure(failure);
    this.lastFailureMessage = sanitized.message;
    const exhausted = this.job.attemptCount >= this.job.maxAttempts;
    this.job = updateJob(this.job, {
      status:
        failure.retryable && exhausted
          ? GenerationJobStatus.dead_letter
          : GenerationJobStatus.failed,
      failureCode: sanitized.code ?? sanitized.category,
      errorMessage: sanitized.message,
      failedAt: new Date(),
      nextRetryAt:
        failure.retryable && !exhausted
          ? (options.nextRetryAt ?? null)
          : null,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    return this.job;
  }

  async cancelJob(): Promise<DurableJob> {
    this.job = updateJob(this.job, {
      status: GenerationJobStatus.cancelled,
      cancelledAt: new Date(),
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    return this.job;
  }

  async retryJob(
    _id: string,
    _userId: string,
    now = new Date()
  ): Promise<DurableJob> {
    if (
      this.job.status !== GenerationJobStatus.failed ||
      !this.job.nextRetryAt ||
      this.job.nextRetryAt.getTime() > now.getTime() ||
      this.job.attemptCount >= this.job.maxAttempts
    ) {
      throw new LifecycleValidationError("not retryable");
    }
    this.job = updateJob(this.job, {
      status: GenerationJobStatus.retry_scheduled,
    });
    return this.job;
  }

  async updateProgress(
    _id: string,
    _userId: string,
    progress: number
  ): Promise<DurableJob> {
    this.job = updateJob(this.job, { progress });
    if (
      this.cancelOnProgress !== null &&
      progress >= this.cancelOnProgress
    ) {
      await this.cancelJob();
    }
    return this.job;
  }

  getRetryBookkeeping(
    job: DurableJob,
    now = new Date()
  ): {
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date | null;
    eligible: boolean;
  } {
    return {
      retryCount: Math.max(job.attemptCount - 1, 0),
      maxRetries: Math.max(job.maxAttempts - 1, 0),
      nextRetryAt: job.nextRetryAt,
      eligible:
        job.status === GenerationJobStatus.failed &&
        job.nextRetryAt !== null &&
        job.nextRetryAt.getTime() <= now.getTime() &&
        job.attemptCount < job.maxAttempts,
    };
  }

  async listRecoveryCandidates(): Promise<DurableJob[]> {
    return this.candidates;
  }

  async recoverExpiredLease(
    _id: string,
    now = new Date()
  ): Promise<DurableJob> {
    this.recoveries += 1;
    const retryable = this.job.attemptCount < this.job.maxAttempts;
    this.job = updateJob(this.job, {
      status: retryable
        ? GenerationJobStatus.failed
        : GenerationJobStatus.dead_letter,
      nextRetryAt: retryable ? now : null,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    return this.job;
  }
}

export function makeJob(
  overrides: Partial<GenerationJob> = {}
): DurableJob {
  const now = new Date();
  return {
    id: "job-1",
    generationId: "generation-1",
    userId: "user-1",
    type: GenerationJobType.planning,
    stageKey: "metadata-preparation",
    revision: 1,
    status: GenerationJobStatus.queued,
    dependsOnJobIds: [],
    attemptCount: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    heartbeatAt: null,
    provider: null,
    providerOperationId: null,
    progress: 0,
    failureCode: null,
    errorMessage: null,
    idempotencyKey: "job-idempotency-1",
    inputJson: null,
    outputJson: null,
    mode: ExecutionMode.mock,
    version: 0,
    queuedAt: now,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function updateJob(
  job: DurableJob,
  updates: Partial<GenerationJob>
): DurableJob {
  return {
    ...job,
    ...updates,
    version: job.version + 1,
    updatedAt: new Date(),
  };
}
