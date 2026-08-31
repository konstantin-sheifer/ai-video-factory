import "server-only";

import { createHash } from "node:crypto";
import {
  ExecutionMode,
  GenerationJobStatus,
  GenerationJobType,
  GenerationStage,
  GenerationStatus,
  Prisma,
  type Generation,
  type GenerationJob,
  type PrismaClient,
} from "@prisma/client";
import type { QueueConfiguration } from "./config";
import type { JobQueue } from "./contracts";
import { buildAttemptKey, type DurableJobDispatcher } from "./durable-job-dispatcher";
import type { DurableJobRecovery } from "./durable-job-recovery";
import type { QueueLogger } from "./structured-log";
import type { GenerationJobService } from "../services/generation-job-service";

const VERIFICATION_USER_ID = "queue-verification-user";
const VERIFICATION_PROJECT_ID = "queue-verification-project";
const VERIFICATION_PROVIDER = "internal-verification";
const POLL_INTERVAL_MS = 250;
const SCENARIO_TIMEOUT_MS = 120_000;

export const QUEUE_VERIFICATION_EVENTS = [
  "verification.started",
  "verification.enqueue.passed",
  "verification.heartbeat.passed",
  "verification.duplicate.passed",
  "verification.retry.passed",
  "verification.cancellation.passed",
  "verification.missing_delivery_recovery.passed",
  "verification.expired_lease_recovery.passed",
  "verification.shutdown_fixture.ready",
  "verification.completed",
  "verification.failed",
] as const;

type HarnessDependencies = {
  database: PrismaClient;
  lifecycle: GenerationJobService;
  queue: JobQueue;
  dispatcher: DurableJobDispatcher;
  recovery: DurableJobRecovery;
  configuration: QueueConfiguration;
  logger: QueueLogger;
};

export type VerificationHarnessResult =
  | { outcome: "disabled" }
  | { outcome: "suppressed"; runKey: string }
  | { outcome: "completed"; runKey: string }
  | { outcome: "failed"; runKey: string };

export async function runRenderQueueVerification(
  dependencies: HarnessDependencies,
  environment: NodeJS.ProcessEnv = process.env
): Promise<VerificationHarnessResult> {
  const rawRunId = environment.QUEUE_VERIFICATION_RUN_ID?.trim();
  if (!rawRunId) return { outcome: "disabled" };

  const runKey = createVerificationRunKey(rawRunId);
  let marker: Awaited<ReturnType<typeof claimRun>>;
  try {
    marker = await claimRun(dependencies.database, runKey);
  } catch {
    dependencies.logger({ event: "verification.failed", outcome: "failed" });
    return { outcome: "failed", runKey };
  }
  if (!marker.claimed) {
    dependencies.logger({
      event: "verification.run_suppressed",
      generationId: marker.generation.id,
      status: marker.generation.status,
      outcome: "suppressed",
    });
    return { outcome: "suppressed", runKey };
  }

  dependencies.logger({
    event: "verification.started",
    generationId: marker.generation.id,
    outcome: "started",
  });

  try {
    const context = { ...dependencies, generation: marker.generation, runKey };
    await verifyEnqueueAndHeartbeat(context);
    await verifyDuplicateDelivery(context);
    await verifyDelayedRetry(context);
    await verifyCancellation(context);
    await verifyMissingDeliveryRecovery(context);
    await verifyExpiredLeaseRecovery(context);
    const shutdownJob = await prepareShutdownFixture(context);

    await dependencies.database.generation.update({
      where: { id: marker.generation.id },
      data: {
        status: GenerationStatus.completed,
        currentStage: GenerationStage.completed,
        progress: 100,
        completedAt: new Date(),
        productionPackageJson: {
          verification: {
            runKey,
            completed: true,
            shutdownFixtureJobId: shutdownJob.id,
          },
        },
      },
    });
    dependencies.logger({
      event: "verification.completed",
      generationId: marker.generation.id,
      outcome: "completed",
    });
    return { outcome: "completed", runKey };
  } catch {
    await dependencies.database.generation
      .update({
        where: { id: marker.generation.id },
        data: {
          status: GenerationStatus.failed,
          failureCode: "verification:harness_failed",
          errorMessage: "The internal queue verification run failed.",
          failedAt: new Date(),
        },
      })
      .catch(() => undefined);
    dependencies.logger({
      event: "verification.failed",
      generationId: marker.generation.id,
      outcome: "failed",
    });
    return { outcome: "failed", runKey };
  }
}

export function createVerificationRunKey(runId: string): string {
  if (!runId.trim() || runId.length > 200) {
    throw new Error("A valid queue verification run ID is required.");
  }
  return createHash("sha256").update(runId).digest("hex").slice(0, 24);
}

type ScenarioContext = HarnessDependencies & {
  generation: Generation;
  runKey: string;
};

async function verifyEnqueueAndHeartbeat(context: ScenarioContext) {
  const delayMs = Math.min(
    Math.max(context.configuration.heartbeatIntervalMs + 5_000, 6_000),
    30_000
  );
  const job = await createJob(context, "enqueue-heartbeat", {
    delayMs,
  });
  await context.dispatcher.dispatch(job.id, job.userId);
  const running = await waitForJob(context.database, job.id, (value) =>
    value.status === GenerationJobStatus.running && value.progress >= 20
  );
  const initialHeartbeat = running.heartbeatAt?.getTime() ?? 0;
  await waitForJob(
    context.database,
    job.id,
    (value) =>
      value.status === GenerationJobStatus.running &&
      (value.heartbeatAt?.getTime() ?? 0) > initialHeartbeat
  );
  context.logger({
    event: "verification.heartbeat.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
  const completed = await waitForStatus(
    context.database,
    job.id,
    GenerationJobStatus.succeeded
  );
  assertJob(completed, { attemptCount: 1, progress: 100 });
  context.logger({
    event: "verification.enqueue.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
}

async function verifyDuplicateDelivery(context: ScenarioContext) {
  const job = await createJob(context, "duplicate-delivery", {
    delayMs: 1_000,
  });
  const submission = {
    jobId: job.id,
    deduplicationKey: buildAttemptKey(job),
  };
  await Promise.all([
    context.queue.enqueue(submission),
    context.queue.enqueue(submission),
  ]);
  const completed = await waitForStatus(
    context.database,
    job.id,
    GenerationJobStatus.succeeded
  );
  assertJob(completed, { attemptCount: 1, progress: 100 });
  context.logger({
    event: "verification.duplicate.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
}

async function verifyDelayedRetry(context: ScenarioContext) {
  const job = await createJob(
    context,
    "delayed-retry",
    { failUntilAttempt: 1 },
    2
  );
  await context.dispatcher.dispatch(job.id, job.userId);
  await waitForJob(
    context.database,
    job.id,
    (value) =>
      value.status === GenerationJobStatus.failed && value.nextRetryAt !== null
  );
  const completed = await waitForStatus(
    context.database,
    job.id,
    GenerationJobStatus.succeeded
  );
  assertJob(completed, { attemptCount: 2, progress: 100 });
  context.logger({
    event: "verification.retry.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
}

async function verifyCancellation(context: ScenarioContext) {
  const job = await createJob(context, "cancellation", { delayMs: 2_000 });
  await context.dispatcher.dispatch(job.id, job.userId);
  await waitForStatus(context.database, job.id, GenerationJobStatus.running);
  await context.lifecycle.cancelJob(
    job.id,
    job.userId,
    "Internal queue verification cancellation."
  );
  const cancelled = await waitForStatus(
    context.database,
    job.id,
    GenerationJobStatus.cancelled
  );
  await wait(2_500);
  const stable = await context.database.generationJob.findUniqueOrThrow({
    where: { id: cancelled.id },
  });
  assertJob(stable, { attemptCount: 1, progress: 20 });
  context.logger({
    event: "verification.cancellation.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
}

async function verifyMissingDeliveryRecovery(context: ScenarioContext) {
  const job = await createJob(context, "missing-delivery", {});
  await context.recovery.reconcile(new Date(), 50);
  const completed = await waitForStatus(
    context.database,
    job.id,
    GenerationJobStatus.succeeded
  );
  assertJob(completed, { attemptCount: 1, progress: 100 });
  context.logger({
    event: "verification.missing_delivery_recovery.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
}

async function verifyExpiredLeaseRecovery(context: ScenarioContext) {
  const job = await createJob(context, "expired-lease", {}, 3);
  await context.lifecycle.acquireLease(
    job.id,
    job.userId,
    `verification-${context.runKey}`,
    5_000
  );
  await context.lifecycle.startJob(
    job.id,
    job.userId,
    `verification-${context.runKey}`
  );
  await context.database.generationJob.update({
    where: { id: job.id },
    data: { leaseExpiresAt: new Date(Date.now() - 1) },
  });
  await context.recovery.reconcile(new Date(), 50);
  const completed = await waitForStatus(
    context.database,
    job.id,
    GenerationJobStatus.succeeded
  );
  assertJob(completed, { attemptCount: 2, progress: 100 });
  context.logger({
    event: "verification.expired_lease_recovery.passed",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "passed",
  });
}

async function prepareShutdownFixture(context: ScenarioContext) {
  const job = await createJob(context, "graceful-shutdown", { delayMs: 90_000 });
  await context.dispatcher.dispatch(job.id, job.userId);
  await waitForStatus(context.database, job.id, GenerationJobStatus.running);
  context.logger({
    event: "verification.shutdown_fixture.ready",
    jobId: job.id,
    generationId: job.generationId,
    outcome: "ready",
  });
  return job;
}

async function createJob(
  context: ScenarioContext,
  scenario: string,
  inputJson: Prisma.InputJsonObject,
  maxAttempts = 2
): Promise<GenerationJob> {
  return context.lifecycle.createJob({
    userId: context.generation.userId!,
    generationId: context.generation.id,
    type: GenerationJobType.planning,
    stageKey: `verification-${scenario}`,
    idempotencyKey: `queue-verification:${context.runKey}:${scenario}`,
    maxAttempts,
    provider: VERIFICATION_PROVIDER,
    inputJson,
    mode: ExecutionMode.mock,
  });
}

async function claimRun(database: PrismaClient, runKey: string) {
  await database.user.upsert({
    where: { clerkId: "internal:queue-verification" },
    update: {},
    create: {
      id: VERIFICATION_USER_ID,
      clerkId: "internal:queue-verification",
      name: "Internal Queue Verification",
    },
  });
  await database.project.upsert({
    where: { id: VERIFICATION_PROJECT_ID },
    update: {},
    create: {
      id: VERIFICATION_PROJECT_ID,
      userId: VERIFICATION_USER_ID,
      title: "Internal Queue Verification",
      idea: "Isolated deterministic queue verification fixtures.",
      status: "internal-verification",
      videoUrl: "",
    },
  });

  const idempotencyKey = `queue-verification-run:${runKey}`;
  const existing = await database.generation.findFirst({
    where: { userId: VERIFICATION_USER_ID, idempotencyKey },
  });
  if (existing) return { claimed: false as const, generation: existing };

  try {
    const generation = await database.generation.create({
      data: {
        userId: VERIFICATION_USER_ID,
        projectId: VERIFICATION_PROJECT_ID,
        idea: "Internal Render BullMQ verification",
        prompt: "Deterministic internal verification; no provider execution.",
        status: GenerationStatus.processing,
        currentStage: GenerationStage.planning,
        progress: 1,
        idempotencyKey,
        mode: ExecutionMode.mock,
        architectureVersion: "backend-v2-verification",
        inputJson: { verification: { runKey } },
      },
    });
    return { claimed: true as const, generation };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const generation = await database.generation.findFirstOrThrow({
      where: { userId: VERIFICATION_USER_ID, idempotencyKey },
    });
    return { claimed: false as const, generation };
  }
}

async function waitForStatus(
  database: PrismaClient,
  jobId: string,
  status: GenerationJobStatus
) {
  return waitForJob(database, jobId, (job) => job.status === status);
}

async function waitForJob(
  database: PrismaClient,
  jobId: string,
  predicate: (job: GenerationJob) => boolean
): Promise<GenerationJob> {
  const deadline = Date.now() + SCENARIO_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const job = await database.generationJob.findUnique({
      where: { id: jobId },
    });
    if (job && predicate(job)) return job;
    if (
      job &&
      (job.status === GenerationJobStatus.dead_letter ||
        job.status === GenerationJobStatus.cancelled) &&
      !predicate(job)
    ) {
      throw new Error("The verification job reached an unexpected terminal state.");
    }
    await wait(POLL_INTERVAL_MS);
  }
  throw new Error("The verification job did not reach the expected state.");
}

function assertJob(
  job: GenerationJob,
  expected: { attemptCount: number; progress: number }
) {
  if (
    job.attemptCount !== expected.attemptCount ||
    job.progress !== expected.progress
  ) {
    throw new Error("The durable verification result was inconsistent.");
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

function wait(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
