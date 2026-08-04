import assert from "node:assert/strict";
import test from "node:test";
import { GenerationJobStatus } from "@prisma/client";
import { DurableJobDispatcher } from "../../lib/queue/durable-job-dispatcher";
import { InMemoryJobQueue } from "../../lib/queue/in-memory-job-queue";
import { QueueValidationError } from "../../lib/queue/errors";
import { FakeLifecycle, makeJob } from "./fakes";

const silentLogger = () => {};

test("enqueue is idempotent and preserves delayed delivery", async () => {
  const queue = new InMemoryJobQueue();
  const runAt = new Date(Date.now() + 10_000);
  const first = await queue.enqueue({
    jobId: "job-1",
    deduplicationKey: "job-1:attempt:1",
    runAt,
  });
  const duplicate = await queue.enqueue({
    jobId: "job-1",
    deduplicationKey: "job-1:attempt:1",
    runAt,
  });

  assert.equal(duplicate.id, first.id);
  assert.equal(duplicate.deduplicated, true);
  assert.deepEqual(queue.takeReady(new Date(runAt.getTime() - 1)), []);
  assert.equal(queue.takeReady(runAt).length, 1);
});

test("cancel removes an in-memory delivery", async () => {
  const queue = new InMemoryJobQueue();
  const reference = await queue.enqueue({
    jobId: "job-1",
    deduplicationKey: "job-1:attempt:1",
  });

  assert.equal(await queue.cancel(reference.id), true);
  assert.deepEqual(queue.takeReady(), []);
});

test("dispatcher deduplicates eligible jobs and rejects illegal state", async () => {
  const lifecycle = new FakeLifecycle();
  const queue = new InMemoryJobQueue();
  const dispatcher = new DurableJobDispatcher(
    lifecycle,
    queue,
    silentLogger
  );

  const first = await dispatcher.dispatch("job-1", "user-1");
  const duplicate = await dispatcher.dispatch("job-1", "user-1");
  assert.equal(first.queueReference.id, duplicate.queueReference.id);
  assert.equal(duplicate.queueReference.deduplicated, true);

  lifecycle.job = makeJob({ status: GenerationJobStatus.succeeded });
  await assert.rejects(
    dispatcher.dispatch("job-1", "user-1"),
    QueueValidationError
  );
});

test("dispatcher preserves durable retry time", async () => {
  const retryAt = new Date(Date.now() + 5_000);
  const lifecycle = new FakeLifecycle(
    makeJob({
      status: GenerationJobStatus.failed,
      attemptCount: 1,
      nextRetryAt: retryAt,
    })
  );
  const queue = new InMemoryJobQueue();
  const dispatcher = new DurableJobDispatcher(
    lifecycle,
    queue,
    silentLogger
  );

  const result = await dispatcher.dispatch("job-1", "user-1");
  assert.equal(result.queueReference.scheduledFor.getTime(), retryAt.getTime());
});
