import assert from "node:assert/strict";
import test from "node:test";
import { GenerationJobType } from "@prisma/client";
import type { QueueConsumer, QueueDelivery } from "../../lib/queue/contracts";
import { DurableJobDispatcher } from "../../lib/queue/durable-job-dispatcher";
import { DurableJobRecovery } from "../../lib/queue/durable-job-recovery";
import { DurableWorkerExecutor } from "../../lib/queue/durable-worker-executor";
import { DurableWorkerRuntime } from "../../lib/queue/durable-worker-runtime";
import { metadataPreparationHandler } from "../../lib/queue/handlers/metadata-preparation-handler";
import { InMemoryJobQueue } from "../../lib/queue/in-memory-job-queue";
import { QueueValidationError } from "../../lib/queue/errors";
import { FakeLifecycle } from "./fakes";

const silentLogger = () => {};

class TestConsumer implements QueueConsumer {
  handler?: (delivery: QueueDelivery) => Promise<void>;
  closed = false;

  async start(handler: (delivery: QueueDelivery) => Promise<void>) {
    this.handler = handler;
  }

  async close() {
    this.closed = true;
  }
}

test("runtime processes duplicate delivery safely and closes transport on shutdown", async () => {
  const lifecycle = new FakeLifecycle();
  lifecycle.candidates = [];
  const queue = new InMemoryJobQueue();
  const consumer = new TestConsumer();
  const executor = new DurableWorkerExecutor(
    lifecycle,
    queue,
    { [GenerationJobType.planning]: metadataPreparationHandler },
    {
      workerIdentity: "runtime-test",
      leaseDurationMs: 1_000,
      heartbeatIntervalMs: 100,
    },
    silentLogger
  );
  const recovery = new DurableJobRecovery(
    lifecycle,
    new DurableJobDispatcher(lifecycle, queue, silentLogger),
    silentLogger
  );
  const runtime = new DurableWorkerRuntime(
    consumer,
    executor,
    recovery,
    { recoveryIntervalMs: 60_000, recoveryBatchSize: 10 },
    silentLogger
  );

  await runtime.start();
  await Promise.all([
    consumer.handler!({ referenceId: "one", jobId: "job-1", attemptKey: "a1" }),
    consumer.handler!({ referenceId: "two", jobId: "job-1", attemptKey: "a1" }),
  ]);
  assert.equal(lifecycle.starts, 1);
  assert.equal(lifecycle.completions, 1);

  await runtime.shutdown();
  assert.equal(consumer.closed, true);
  await assert.rejects(
    queue.enqueue({ jobId: "job-2", deduplicationKey: "attempt-1" }),
    QueueValidationError
  );
});
