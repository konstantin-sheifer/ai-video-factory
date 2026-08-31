import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  GenerationJobStatus,
  GenerationJobType,
  GenerationStatus,
  type Generation,
  type PrismaClient,
} from "@prisma/client";
import { InMemoryJobQueue } from "../../lib/queue/in-memory-job-queue";
import { DurableWorkerExecutor } from "../../lib/queue/durable-worker-executor";
import { metadataPreparationHandler } from "../../lib/queue/handlers/metadata-preparation-handler";
import type { QueueLogFields } from "../../lib/queue/structured-log";
import {
  createVerificationRunKey,
  QUEUE_VERIFICATION_EVENTS,
  runRenderQueueVerification,
} from "../../lib/queue/render-verification-harness";
import { FakeLifecycle, makeJob } from "./fakes";

const silentLogger = () => {};

test("verification harness is inert when the run ID is absent", async () => {
  let databaseTouched = false;
  const database = new Proxy(
    {},
    {
      get() {
        databaseTouched = true;
        throw new Error("database should not be touched");
      },
    }
  ) as PrismaClient;

  const result = await runRenderQueueVerification(
    { database } as never,
    { NODE_ENV: "test" }
  );

  assert.deepEqual(result, { outcome: "disabled" });
  assert.equal(databaseTouched, false);
});

test("the same durable run marker suppresses execution after restart", async () => {
  const existing = {
    id: "verification-generation",
    status: GenerationStatus.completed,
  } as Generation;
  let loggedEvent = "";
  const database = {
    user: { upsert: async () => ({}) },
    project: { upsert: async () => ({}) },
    generation: { findFirst: async () => existing },
  } as unknown as PrismaClient;

  const result = await runRenderQueueVerification(
    {
      database,
      logger: (fields: QueueLogFields) => {
        loggedEvent = fields.event;
      },
    } as never,
    { NODE_ENV: "test", QUEUE_VERIFICATION_RUN_ID: "render-run-1" }
  );

  assert.equal(result.outcome, "suppressed");
  assert.equal(loggedEvent, "verification.run_suppressed");
});

test("run identity is stable, opaque, and rejects invalid values", () => {
  const first = createVerificationRunKey("owner-selected-run");
  assert.equal(first, createVerificationRunKey("owner-selected-run"));
  assert.equal(first.length, 24);
  assert.doesNotMatch(first, /owner|selected|run/);
  assert.throws(() => createVerificationRunKey(""));
  assert.throws(() => createVerificationRunKey("x".repeat(201)));
});

test("controlled metadata handler fails once and then succeeds durably", async () => {
  const lifecycle = new FakeLifecycle(
    makeJob({
      provider: "internal-verification",
      inputJson: { failUntilAttempt: 1 },
      maxAttempts: 2,
    })
  );
  const queue = new InMemoryJobQueue();
  const worker = new DurableWorkerExecutor(
    lifecycle,
    queue,
    { [GenerationJobType.planning]: metadataPreparationHandler },
    {
      workerIdentity: "verification-test",
      leaseDurationMs: 200,
      heartbeatIntervalMs: 10,
      defaultRetryDelayMs: 1,
    },
    silentLogger
  );

  const first = await worker.process(lifecycle.job.id);
  assert.equal(first.outcome, "retry_scheduled");
  assert.equal(lifecycle.job.status, GenerationJobStatus.failed);
  assert.equal(queue.takeReady(new Date(Date.now() + 2_000)).length, 1);

  await new Promise((resolve) => setTimeout(resolve, 1_100));
  const second = await worker.process(lifecycle.job.id);
  assert.equal(second.outcome, "completed");
  assert.equal(lifecycle.job.attemptCount, 2);
});

test("scenario contract is complete and imports no paid provider adapter", async () => {
  assert.deepEqual(QUEUE_VERIFICATION_EVENTS, [
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
  ]);

  const source = await readFile(
    new URL("../../lib/queue/render-verification-harness.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /providers\/(?:video|voice|render|publish)|openai|runway|elevenlabs/i
  );
});

test("startup failure logs a sanitized event without the thrown detail", async () => {
  const events: unknown[] = [];
  const database = {
    user: {
      upsert: async () => {
        throw new Error("redis://secret@internal.invalid database-password");
      },
    },
  } as unknown as PrismaClient;

  const result = await runRenderQueueVerification(
    {
      database,
      logger: (fields: QueueLogFields) => events.push(fields),
    } as never,
    { NODE_ENV: "test", QUEUE_VERIFICATION_RUN_ID: "failure-run" }
  );

  assert.equal(result.outcome, "failed");
  assert.doesNotMatch(JSON.stringify(events), /secret|internal|password/i);
});
