import assert from "node:assert/strict";
import test from "node:test";
import type { JobsOptions } from "bullmq";
import type Redis from "ioredis";
import {
  BullMqJobQueue,
  createReferenceId,
  type BullMqQueuePort,
} from "../../lib/queue/bullmq-job-queue";
import {
  deserializeDelivery,
  serializeDelivery,
  type BullMqDeliveryPayload,
} from "../../lib/queue/bullmq-delivery";
import { loadQueueConfiguration } from "../../lib/queue/config";
import {
  QueueUnavailableError,
  QueueValidationError,
} from "../../lib/queue/errors";
import { verifyRedisConnection } from "../../lib/queue/redis-connection";

class FakeBullQueue implements BullMqQueuePort {
  jobs = new Map<string, FakeBullJob>();
  lockedJobs = new Set<string>();
  closed = false;

  async add(_name: string, data: BullMqDeliveryPayload, options: JobsOptions) {
    const id = String(options.jobId);
    const existing = this.jobs.get(id);
    if (existing) return existing;
    const job = new FakeBullJob(
      id,
      Date.now(),
      Number(options.delay || 0),
      data,
      () => this.jobs.delete(id)
    );
    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string) {
    return this.jobs.get(id);
  }

  async remove(id: string) {
    if (this.lockedJobs.has(id)) return 0;
    return this.jobs.delete(id) ? 1 : 0;
  }

  async close() {
    this.closed = true;
  }
}

class FakeBullJob {
  constructor(
    readonly id: string,
    readonly timestamp: number,
    readonly delay: number,
    readonly data: BullMqDeliveryPayload,
    private readonly removeJob: () => void
  ) {}

  async remove() {
    this.removeJob();
  }
}

test("BullMQ adapter enqueues immediate and delayed attempt-specific delivery", async () => {
  const port = new FakeBullQueue();
  const queue = new BullMqJobQueue("generation", port);
  const immediate = await queue.enqueue({
    jobId: "job-1",
    deduplicationKey: "generation-job:job-1:attempt:1",
  });
  const runAt = new Date(Date.now() + 10_000);
  const delayed = await queue.enqueue({
    jobId: "job-1",
    deduplicationKey: "generation-job:job-1:attempt:2",
    runAt,
  });

  assert.notEqual(immediate.id, delayed.id);
  assert.equal(delayed.scheduledFor.getTime(), runAt.getTime());
  assert.ok(port.jobs.get(delayed.id)!.delay > 0);
});

test("BullMQ adapter deduplicates the same attempt and supports cancellation", async () => {
  const port = new FakeBullQueue();
  const queue = new BullMqJobQueue("generation", port);
  const submission = {
    jobId: "job-1",
    deduplicationKey: "generation-job:job-1:attempt:1",
  };
  const first = await queue.enqueue(submission);
  const duplicate = await queue.enqueue(submission);

  assert.equal(first.id, duplicate.id);
  assert.equal(duplicate.deduplicated, true);
  assert.equal(await queue.cancel(first.id), true);
  assert.equal(await queue.cancel(first.id), false);
});

test("BullMQ adapter treats missing and locked cancellation as idempotent misses", async () => {
  const port = new FakeBullQueue();
  const queue = new BullMqJobQueue("generation", port);
  const delivery = await queue.enqueue({
    jobId: "job-1",
    deduplicationKey: "generation-job:job-1:attempt:1",
  });

  port.lockedJobs.add(delivery.id);

  assert.equal(await queue.cancel(delivery.id), false);
  assert.equal(await queue.cancel("missing-delivery"), false);
  assert.ok(port.jobs.has(delivery.id));
});

test("delivery serialization is versioned, validated, and preserves identity", () => {
  const payload = serializeDelivery("job-1", "attempt-1");
  assert.deepEqual(deserializeDelivery("reference-1", payload), {
    referenceId: "reference-1",
    jobId: "job-1",
    attemptKey: "attempt-1",
  });
  assert.equal(createReferenceId("attempt-1"), createReferenceId("attempt-1"));
  assert.throws(
    () => deserializeDelivery("reference-1", { ...payload, version: 99 }),
    QueueValidationError
  );
});

test("queue configuration rejects malformed and non-Redis URLs", () => {
  assert.throws(
    () =>
      loadQueueConfiguration({
        NODE_ENV: "test",
        QUEUE_ENABLED: "true",
        REDIS_URL: "not a url",
      }),
    QueueValidationError
  );
  assert.throws(
    () =>
      loadQueueConfiguration({
        NODE_ENV: "test",
        QUEUE_ENABLED: "true",
        REDIS_URL: "https://queue.test",
      }),
    QueueValidationError
  );
});

test("Redis startup failure is normalized without leaking connection details", async () => {
  const fakeConnection = {
    status: "wait",
    async connect() {
      throw new Error("redis://secret@internal.example:6379");
    },
    disconnect() {},
  } as unknown as Redis;

  await assert.rejects(
    verifyRedisConnection(fakeConnection),
    (error: unknown) =>
      error instanceof QueueUnavailableError &&
      !/secret|internal\.example/.test(error.message)
  );
});
