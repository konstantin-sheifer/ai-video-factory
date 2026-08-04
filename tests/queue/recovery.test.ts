import assert from "node:assert/strict";
import test from "node:test";
import { GenerationJobStatus } from "@prisma/client";
import { DurableJobDispatcher } from "../../lib/queue/durable-job-dispatcher";
import { DurableJobRecovery } from "../../lib/queue/durable-job-recovery";
import { InMemoryJobQueue } from "../../lib/queue/in-memory-job-queue";
import { FakeLifecycle, makeJob } from "./fakes";

const silentLogger = () => {};

test("recovery reclaims an expired running lease and restores delivery", async () => {
  const now = new Date();
  const expired = makeJob({
    status: GenerationJobStatus.running,
    attemptCount: 1,
    leaseOwner: "dead-worker",
    leaseExpiresAt: new Date(now.getTime() - 1),
  });
  const lifecycle = new FakeLifecycle(expired);
  lifecycle.candidates = [expired];
  const queue = new InMemoryJobQueue();
  const dispatcher = new DurableJobDispatcher(
    lifecycle,
    queue,
    silentLogger
  );
  const recovery = new DurableJobRecovery(
    lifecycle,
    dispatcher,
    silentLogger
  );

  const summary = await recovery.reconcile(now, 10);
  assert.deepEqual(summary, {
    inspected: 1,
    recoveredLeases: 1,
    dispatched: 1,
    skipped: 0,
    failed: 0,
  });
  assert.equal(lifecycle.recoveries, 1);
  assert.equal(queue.takeReady(now).length, 1);
});

test("recovery deduplicates an executable database job already in queue", async () => {
  const now = new Date();
  const queued = makeJob();
  const lifecycle = new FakeLifecycle(queued);
  lifecycle.candidates = [queued, queued];
  const queue = new InMemoryJobQueue();
  const dispatcher = new DurableJobDispatcher(
    lifecycle,
    queue,
    silentLogger
  );
  const recovery = new DurableJobRecovery(
    lifecycle,
    dispatcher,
    silentLogger
  );

  const summary = await recovery.reconcile(now, 10);
  assert.equal(summary.dispatched, 2);
  assert.equal(queue.takeReady(now).length, 1);
});
