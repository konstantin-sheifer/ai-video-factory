import assert from "node:assert/strict";
import test from "node:test";
import {
  GenerationJobStatus,
  GenerationJobType,
} from "@prisma/client";
import { DurableWorkerExecutor } from "../../lib/queue/durable-worker-executor";
import {
  JobHandlerFailure,
  JobLeaseLostSignal,
  type JobHandler,
} from "../../lib/queue/job-handler";
import { metadataPreparationHandler } from "../../lib/queue/handlers/metadata-preparation-handler";
import { InMemoryJobQueue } from "../../lib/queue/in-memory-job-queue";
import { FakeLifecycle, makeJob } from "./fakes";

const silentLogger = () => {};

function createWorker(
  lifecycle: FakeLifecycle,
  handler: JobHandler = metadataPreparationHandler,
  queue = new InMemoryJobQueue()
) {
  return {
    queue,
    worker: new DurableWorkerExecutor(
      lifecycle,
      queue,
      { [GenerationJobType.planning]: handler },
      {
        workerIdentity: "test-worker",
        leaseDurationMs: 200,
        heartbeatIntervalMs: 10,
        defaultRetryDelayMs: 1,
      },
      silentLogger
    ),
  };
}

test("worker acquires, renews, progresses, and completes", async () => {
  const lifecycle = new FakeLifecycle(
    makeJob({ inputJson: { delayMs: 35 } })
  );
  const { worker } = createWorker(lifecycle);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "completed");
  assert.equal(lifecycle.starts, 1);
  assert.equal(lifecycle.completions, 1);
  assert.ok(lifecycle.renewals >= 1);
  assert.equal(lifecycle.job.progress, 100);
});

test("due retry delivery preserves job identity and completes next attempt", async () => {
  const lifecycle = new FakeLifecycle(
    makeJob({
      status: GenerationJobStatus.failed,
      attemptCount: 1,
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() - 1),
    })
  );
  const { worker } = createWorker(lifecycle);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "completed");
  assert.equal(lifecycle.job.id, "job-1");
  assert.equal(lifecycle.job.attemptCount, 2);
  assert.equal(lifecycle.completions, 1);
});

test("duplicate delivery does not start a second execution", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const lifecycle = new FakeLifecycle();
  const handler: JobHandler = async ({ checkpoint }) => {
    await checkpoint(20);
    await gate;
    return { ok: true };
  };
  const { worker } = createWorker(lifecycle, handler);

  const first = worker.process("job-1");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const duplicate = await worker.process("job-1");
  release();
  const completed = await first;

  assert.equal(duplicate.outcome, "duplicate");
  assert.equal(completed.outcome, "completed");
  assert.equal(lifecycle.starts, 1);
});

test("worker stops without terminal mutation after lease loss", async () => {
  const lifecycle = new FakeLifecycle();
  lifecycle.loseLeaseOnRenew = true;
  const handler: JobHandler = async ({ signal, checkpoint }) => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, 40);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeout);
          reject(new JobLeaseLostSignal());
        },
        { once: true }
      );
    });
    await checkpoint(50);
    return { ok: true };
  };
  const { worker } = createWorker(lifecycle, handler);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "lease_lost");
  assert.equal(lifecycle.completions, 0);
  assert.equal(lifecycle.failures, 0);
});

test("retryable failure is sanitized and scheduled once", async () => {
  const lifecycle = new FakeLifecycle(
    makeJob({ maxAttempts: 2 })
  );
  const handler: JobHandler = async () => {
    throw new JobHandlerFailure({
      category: "provider",
      code: "temporary",
      message:
        "Bearer secret https://internal.test /home/app/private request_id=req_1",
      retryable: true,
      retryDelayMs: 1,
    });
  };
  const { worker, queue } = createWorker(lifecycle, handler);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "retry_scheduled");
  assert.equal(lifecycle.failures, 1);
  assert.doesNotMatch(
    lifecycle.lastFailureMessage,
    /secret|internal\.test|home\/app|req_1/
  );
  assert.equal(queue.takeReady(new Date(Date.now() + 100)).length, 1);
});

test("max attempts produce dead letter without another delivery", async () => {
  const lifecycle = new FakeLifecycle(
    makeJob({ attemptCount: 1, maxAttempts: 2 })
  );
  const handler: JobHandler = async () => {
    throw new JobHandlerFailure({
      category: "verification",
      message: "retry requested",
      retryable: true,
      retryDelayMs: 1,
    });
  };
  const { worker, queue } = createWorker(lifecycle, handler);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "dead_letter");
  assert.deepEqual(queue.takeReady(new Date(Date.now() + 100)), []);
});

test("cancelled job never starts", async () => {
  const lifecycle = new FakeLifecycle(
    makeJob({ status: GenerationJobStatus.cancelled })
  );
  const { worker } = createWorker(lifecycle);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "not_executable");
  assert.equal(lifecycle.starts, 0);
});

test("cancellation during execution stops at the next checkpoint", async () => {
  const lifecycle = new FakeLifecycle();
  lifecycle.cancelOnProgress = 20;
  const { worker } = createWorker(lifecycle);

  const result = await worker.process("job-1");
  assert.equal(result.outcome, "cancelled");
  assert.equal(lifecycle.completions, 0);
  assert.equal(lifecycle.job.status, GenerationJobStatus.cancelled);
});
