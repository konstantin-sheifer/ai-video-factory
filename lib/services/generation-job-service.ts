import "server-only";

import {
  ExecutionMode,
  GenerationJobStatus,
  type GenerationJob,
  type GenerationJobType,
  Prisma,
} from "@prisma/client";
import {
  assertJobTransition,
  LifecycleConflictError,
  LifecycleResourceNotFoundError,
  LifecycleValidationError,
  sanitizeFailure,
  sanitizeLifecycleReason,
  validateProgress,
  type FailureInput,
} from "@/lib/domain/generation-lifecycle";
import { GenerationJobRepository } from "@/lib/repositories/generation-job-repository";
import { GenerationRepository } from "@/lib/repositories/generation-repository";

const TERMINAL_JOB_STATES = new Set<GenerationJobStatus>([
  GenerationJobStatus.succeeded,
  GenerationJobStatus.failed,
  GenerationJobStatus.dead_letter,
  GenerationJobStatus.cancelled,
]);

export type CreateGenerationJobInput = {
  userId: string;
  generationId: string;
  type: GenerationJobType;
  stageKey: string;
  idempotencyKey: string;
  revision?: number;
  dependsOnJobIds?: string[];
  maxAttempts?: number;
  provider?: string;
  inputJson?: Prisma.InputJsonValue;
  mode?: ExecutionMode;
};

export class GenerationJobService {
  constructor(
    private readonly jobs: GenerationJobRepository =
      new GenerationJobRepository(),
    private readonly generations: GenerationRepository =
      new GenerationRepository()
  ) {}

  async createJob(input: CreateGenerationJobInput): Promise<GenerationJob> {
    assertRequired(input.userId, "Authenticated internal user ID");
    assertRequired(input.generationId, "Generation ID");
    assertRequired(input.stageKey, "Stage key");
    assertRequired(input.idempotencyKey, "Idempotency key");
    const idempotencyKey = input.idempotencyKey.trim();

    const generation = await this.generations.findOwned(
      input.generationId,
      input.userId
    );

    if (!generation) {
      throw new LifecycleResourceNotFoundError("generation");
    }

    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new LifecycleValidationError(
        "Maximum attempts must be a positive integer."
      );
    }

    const revision = input.revision ?? 1;
    if (!Number.isInteger(revision) || revision < 1) {
      throw new LifecycleValidationError(
        "Job revision must be a positive integer."
      );
    }

    const dependencies = [...new Set(input.dependsOnJobIds ?? [])];
    if (dependencies.length > 0) {
      const ownedDependencyCount = await this.jobs.countOwnedDependencies(
        input.generationId,
        input.userId,
        dependencies
      );

      if (ownedDependencyCount !== dependencies.length) {
        throw new LifecycleValidationError(
          "Every dependency must belong to the same owned generation."
        );
      }
    }

    const existing = await this.jobs.findOwnedByIdempotencyKey(
      input.userId,
      idempotencyKey
    );
    if (existing) {
      return existing;
    }

    try {
      return await this.jobs.create({
        generationId: input.generationId,
        userId: input.userId,
        type: input.type,
        stageKey: input.stageKey.trim(),
        revision,
        status: GenerationJobStatus.queued,
        dependsOnJobIds: dependencies,
        maxAttempts,
        provider: input.provider,
        inputJson: input.inputJson,
        idempotencyKey,
        mode: input.mode ?? ExecutionMode.legacy,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const racedJob = await this.jobs.findOwnedByIdempotencyKey(
          input.userId,
          idempotencyKey
        );

        if (racedJob) {
          return racedJob;
        }
      }

      throw error;
    }
  }

  async loadJob(id: string, userId: string): Promise<GenerationJob> {
    assertRequired(userId, "Authenticated internal user ID");
    const job = await this.jobs.findOwned(id, userId);

    if (!job) {
      throw new LifecycleResourceNotFoundError("job");
    }

    return job;
  }

  async queueJob(id: string, userId: string): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);

    if (job.status === GenerationJobStatus.queued) {
      return job;
    }

    assertJobTransition(job.status, GenerationJobStatus.queued);

    if (job.nextRetryAt && job.nextRetryAt.getTime() > Date.now()) {
      throw new LifecycleValidationError("The job is not eligible to queue yet.");
    }

    return this.updateOrThrow(job, {
      status: GenerationJobStatus.queued,
      queuedAt: new Date(),
      nextRetryAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    });
  }

  async acquireLease(
    id: string,
    userId: string,
    leaseOwner: string,
    leaseDurationMs: number,
    now = new Date()
  ): Promise<GenerationJob> {
    assertRequired(leaseOwner, "Lease owner");
    if (
      !Number.isInteger(leaseDurationMs) ||
      leaseDurationMs < 1_000 ||
      leaseDurationMs > 15 * 60 * 1_000
    ) {
      throw new LifecycleValidationError(
        "Lease duration must be between 1 second and 15 minutes."
      );
    }

    const current = await this.loadJob(id, userId);
    if (
      current.status !== GenerationJobStatus.queued &&
      current.status !== GenerationJobStatus.retry_scheduled &&
      current.status !== GenerationJobStatus.claimed
    ) {
      throw new LifecycleValidationError(
        `A ${current.status} job cannot be leased.`
      );
    }

    if (
      current.status === GenerationJobStatus.claimed &&
      current.leaseExpiresAt &&
      current.leaseExpiresAt.getTime() > now.getTime()
    ) {
      throw new LifecycleConflictError("The job already has an active lease.");
    }

    const leased = await this.jobs.acquireLease(
      id,
      userId,
      leaseOwner.trim(),
      new Date(now.getTime() + leaseDurationMs),
      now
    );

    if (!leased) {
      throw new LifecycleConflictError(
        "The job is not currently eligible for a lease."
      );
    }

    return leased;
  }

  async releaseLease(
    id: string,
    userId: string,
    leaseOwner: string,
    now = new Date()
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);

    if (job.status === GenerationJobStatus.succeeded) {
      return job;
    }

    this.assertValidLease(job, leaseOwner, now);

    if (job.status !== GenerationJobStatus.claimed) {
      throw new LifecycleValidationError(
        "Only a claimed job can release its lease without completing an attempt."
      );
    }

    assertJobTransition(job.status, GenerationJobStatus.queued);
    return this.updateOrThrow(job, {
      status: GenerationJobStatus.queued,
      leaseOwner: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    });
  }

  async validateLease(
    id: string,
    userId: string,
    leaseOwner: string,
    now = new Date()
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);
    this.assertValidLease(job, leaseOwner, now);
    return job;
  }

  async startJob(
    id: string,
    userId: string,
    leaseOwner: string,
    now = new Date()
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);
    this.assertValidLease(job, leaseOwner, now);
    assertJobTransition(job.status, GenerationJobStatus.running);

    return this.updateOrThrow(job, {
      status: GenerationJobStatus.running,
      attemptCount: { increment: 1 },
      startedAt: job.startedAt ?? now,
      heartbeatAt: now,
    });
  }

  async completeJob(
    id: string,
    userId: string,
    leaseOwner: string,
    outputJson?: Prisma.InputJsonValue,
    now = new Date()
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);
    this.assertValidLease(job, leaseOwner, now);
    assertJobTransition(job.status, GenerationJobStatus.succeeded);

    return this.updateOrThrow(job, {
      status: GenerationJobStatus.succeeded,
      progress: 100,
      outputJson,
      completedAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    });
  }

  async failJob(
    id: string,
    userId: string,
    failure: FailureInput,
    options: {
      leaseOwner?: string;
      nextRetryAt?: Date;
      now?: Date;
    } = {}
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);
    const now = options.now ?? new Date();

    if (
      job.status === GenerationJobStatus.failed ||
      job.status === GenerationJobStatus.dead_letter
    ) {
      return job;
    }

    if (job.leaseOwner) {
      this.assertValidLease(job, options.leaseOwner ?? "", now);
    }

    const sanitized = sanitizeFailure(failure);
    const attemptsExhausted = job.attemptCount >= job.maxAttempts;
    const status =
      sanitized.retryable && attemptsExhausted
        ? GenerationJobStatus.dead_letter
        : GenerationJobStatus.failed;
    assertJobTransition(job.status, status);

    if (
      sanitized.retryable &&
      !attemptsExhausted &&
      !options.nextRetryAt
    ) {
      throw new LifecycleValidationError(
        "A retryable job failure requires a next retry timestamp."
      );
    }

    return this.updateOrThrow(job, {
      status,
      failureCode: joinFailureCode(sanitized.category, sanitized.code),
      errorMessage: sanitized.message,
      outputJson: mergeJobMetadata(job.outputJson, {
        failure: {
          category: sanitized.category,
          code: sanitized.code,
          retryable: sanitized.retryable,
          occurredAt: now.toISOString(),
          providerDetails: sanitized.providerDetails,
        },
      }),
      failedAt: now,
      nextRetryAt:
        sanitized.retryable && !attemptsExhausted
          ? options.nextRetryAt
          : null,
      leaseOwner: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    });
  }

  async retryJob(
    id: string,
    userId: string,
    now = new Date()
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);

    if (job.status === GenerationJobStatus.retry_scheduled) {
      return job;
    }

    assertJobTransition(job.status, GenerationJobStatus.retry_scheduled);

    if (!job.nextRetryAt) {
      throw new LifecycleValidationError("The job failure is not retryable.");
    }
    if (job.attemptCount >= job.maxAttempts) {
      throw new LifecycleValidationError("The job has no retry attempts left.");
    }
    if (job.nextRetryAt.getTime() > now.getTime()) {
      throw new LifecycleValidationError("The job is not eligible to retry yet.");
    }

    return this.updateOrThrow(job, {
      status: GenerationJobStatus.retry_scheduled,
      leaseOwner: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    });
  }

  async cancelJob(
    id: string,
    userId: string,
    reason: string
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);

    if (job.status === GenerationJobStatus.cancelled) {
      return job;
    }
    if (TERMINAL_JOB_STATES.has(job.status)) {
      throw new LifecycleValidationError(
        `A ${job.status} job cannot be cancelled.`
      );
    }

    assertJobTransition(job.status, GenerationJobStatus.cancelled);
    const now = new Date();

    return this.updateOrThrow(job, {
      status: GenerationJobStatus.cancelled,
      outputJson: mergeJobMetadata(job.outputJson, {
        cancellation: {
          reason: sanitizeLifecycleReason(
            reason,
            "Cancellation requested."
          ),
          cancelledAt: now.toISOString(),
        },
      }),
      cancelledAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    });
  }

  async updateProgress(
    id: string,
    userId: string,
    progress: number,
    leaseOwner?: string,
    now = new Date()
  ): Promise<GenerationJob> {
    const job = await this.loadJob(id, userId);

    if (TERMINAL_JOB_STATES.has(job.status)) {
      throw new LifecycleValidationError(
        `Progress cannot change after a job is ${job.status}.`
      );
    }
    if (job.leaseOwner) {
      this.assertValidLease(job, leaseOwner ?? "", now);
    }

    validateProgress(progress, job.progress);
    return this.updateOrThrow(job, {
      progress,
      ...(job.leaseOwner ? { heartbeatAt: now } : {}),
    });
  }

  getRetryBookkeeping(job: GenerationJob): {
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date | null;
    eligible: boolean;
  } {
    const retryCount = Math.max(job.attemptCount - 1, 0);
    const maxRetries = Math.max(job.maxAttempts - 1, 0);

    return {
      retryCount,
      maxRetries,
      nextRetryAt: job.nextRetryAt,
      eligible:
        job.status === GenerationJobStatus.failed &&
        job.attemptCount < job.maxAttempts &&
        job.nextRetryAt !== null &&
        job.nextRetryAt.getTime() <= Date.now(),
    };
  }

  private assertValidLease(
    job: GenerationJob,
    leaseOwner: string,
    now: Date
  ): void {
    if (!leaseOwner || job.leaseOwner !== leaseOwner) {
      throw new LifecycleConflictError("The job lease owner does not match.");
    }
    if (!job.leaseExpiresAt || job.leaseExpiresAt.getTime() <= now.getTime()) {
      throw new LifecycleConflictError("The job lease has expired.");
    }
  }

  private async updateOrThrow(
    job: GenerationJob,
    data: Prisma.GenerationJobUpdateManyMutationInput
  ): Promise<GenerationJob> {
    const updated = await this.jobs.updateOwned(
      job.id,
      job.userId,
      job.version,
      data
    );

    if (!updated) {
      throw new LifecycleConflictError(
        "Generation job changed during the lifecycle update."
      );
    }

    return updated;
  }
}

function mergeJobMetadata(
  existingValue: Prisma.JsonValue | null,
  metadata: Prisma.InputJsonObject
): Prisma.InputJsonObject {
  const existing =
    existingValue &&
    typeof existingValue === "object" &&
    !Array.isArray(existingValue)
      ? (existingValue as Prisma.JsonObject)
      : {};

  return {
    ...existing,
    lifecycle: {
      ...readLifecycleObject(existing.lifecycle),
      ...metadata,
    },
  } as Prisma.InputJsonObject;
}

function readLifecycleObject(
  value: Prisma.JsonValue | undefined
): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function joinFailureCode(category: string, code: string | null): string {
  return code ? `${category}:${code}` : category;
}

export const generationJobService = new GenerationJobService();

function assertRequired(value: string, label: string): void {
  if (!value.trim()) {
    throw new LifecycleValidationError(`${label} is required.`);
  }
}

function isUniqueConstraintError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
