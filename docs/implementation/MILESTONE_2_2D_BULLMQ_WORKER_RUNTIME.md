# Milestone 2.2D-A — BullMQ Adapter and Render Worker Runtime

## Scope

This milestone adds BullMQ as the production transport behind the existing `JobQueue` and `QueueConsumer` contracts. PostgreSQL remains authoritative for lifecycle state, attempts, leases, heartbeats, progress, cancellation, retries, and terminal outcomes. Render Key Value is non-authoritative delivery infrastructure.

The only registered worker handler is deterministic metadata preparation. It performs no paid provider or media work. Provider-stage migration remains Milestone 2.3.

## Runtime topology

- `aivf-web`: existing Next.js web service. `QUEUE_ENABLED` remains `false` until the worker is provisioned and verified.
- `aivf-worker`: paid Render Background Worker using plan `0.5c-512mb` in Oregon.
- `aivf-queue`: existing Render Key Value instance, reached only through its private `connectionString`.
- Neon PostgreSQL: durable source of truth shared by web and worker.

The worker uses a publisher connection for retry/recovery delivery and a BullMQ worker connection for blocking consumption. Connections are process-owned, validated at startup, and closed during shutdown. BullMQ transport retries are disabled; durable retry rules are applied by `DurableWorkerExecutor`.

## Configuration

Required worker variables:

- `DATABASE_URL` — secret Neon connection string.
- `REDIS_URL` — private Blueprint reference to `aivf-queue.connectionString`.
- `QUEUE_ENABLED=true`.
- `QUEUE_NAME=ai-video-factory-generation`.
- `QUEUE_PREFIX=aivf`.
- `QUEUE_WORKER_CONCURRENCY=2`.
- `QUEUE_LEASE_DURATION_MS=60000`.
- `QUEUE_HEARTBEAT_INTERVAL_MS=15000`.
- `QUEUE_RECOVERY_INTERVAL_MS=30000`.
- `QUEUE_RECOVERY_BATCH_SIZE=50`.

No Clerk or provider secret is required by this worker milestone.

## Delivery and recovery invariants

1. Every delivery contains only a schema version, durable PostgreSQL job ID, and attempt key.
2. BullMQ job IDs are deterministic hashes of the attempt key.
3. Duplicate delivery is harmless because PostgreSQL lease acquisition is atomic.
4. The worker acknowledges transport delivery only after the durable executor returns.
5. Retry timestamps and attempt limits come from PostgreSQL, not BullMQ.
6. Recovery scans are bounded and non-overlapping.
7. Eligible queued jobs and expired leases are recovered from PostgreSQL and idempotently re-enqueued.
8. Loss of the Key Value dataset can delay work but cannot erase durable job state.

## Real Render Valkey verification

Do not enable paid providers during this procedure.

The worker contains a strictly opt-in verification harness. It is inert unless
`QUEUE_VERIFICATION_RUN_ID` is a non-empty value. The value is hashed before it
is persisted or referenced; the raw value is never logged. Each value claims one
durable PostgreSQL generation marker. A completed, failed, or interrupted marker
suppresses later execution with the same value, so use a new unique value for a
new run.

The harness creates only isolated `ExecutionMode.mock` planning jobs owned by the
internal `queue-verification-user` fixture. Its only handler is deterministic
metadata preparation with provider `internal-verification`; it imports and calls
no AI, video, voice, render, publishing, or media provider.

1. Obtain owner approval for the billable `aivf-worker` resource and sync the Blueprint.
2. Set the worker `DATABASE_URL` to the same Neon database used by `aivf-web`.
3. Confirm worker startup emits `worker.ready` and no credential-bearing logs.
4. Confirm the worker connected through the private `REDIS_URL`; do not add public Key Value access.
5. Create a deterministic mock generation and planning job through the database verification fixture or the future control API.
6. Enqueue the job and confirm `queue.submitted` contains its durable job ID and queue reference.
7. Confirm the worker logs `worker.lease_acquired`, progress/heartbeat events, then `worker.completed`.
8. Query PostgreSQL and verify `attemptCount`, `progress`, `heartbeatAt`, lease cleanup, and `succeeded` state.
9. Submit the same attempt delivery twice and verify one execution completes while the duplicate is skipped without a second attempt.
10. Trigger the deterministic retry fixture and verify the failed row retains `nextRetryAt`, delayed delivery occurs, and the next attempt completes without BullMQ-managed retries.
11. Request cancellation before delivery and during the deterministic delay; verify no completion write follows cancellation.
12. Restart the worker during the deterministic delay; after lease expiry, verify recovery re-enqueues and completes the durable job.
13. Remove a waiting BullMQ delivery or restart the non-persistent Key Value instance; verify the bounded recovery scan restores delivery from the queued PostgreSQL row.
14. Send `SIGTERM` during the deterministic delay; verify new jobs stop, the handler aborts, no terminal write occurs after lease loss, connections close, and the process exits within 30 seconds.
15. Keep `aivf-web` at `QUEUE_ENABLED=false` until all checks pass. Then enable web publishing in a separate controlled activation milestone.

### Exact Render activation sequence

1. Deploy the commit containing the harness while leaving
   `QUEUE_VERIFICATION_RUN_ID` absent. Confirm the worker emits its normal
   `worker.ready` event and no `verification.started` event.
2. In the Render Dashboard, open `aivf-worker`, then **Environment**.
3. Add `QUEUE_VERIFICATION_RUN_ID` with a new unique, non-secret value such as a
   timestamped verification label. Do not change `DATABASE_URL`, `REDIS_URL`,
   provider variables, or the web service.
4. Save the environment change and deploy the worker when Render prompts.
5. Open the new worker instance logs. Confirm the automatic run emits, in order
   as scenarios finish:
   - `verification.started`
   - `verification.heartbeat.passed`
   - `verification.enqueue.passed`
   - `verification.duplicate.passed`
   - `verification.retry.passed`
   - `verification.cancellation.passed`
   - `verification.missing_delivery_recovery.passed`
   - `verification.expired_lease_recovery.passed`
   - `verification.shutdown_fixture.ready`
   - `verification.completed`
6. For the manual graceful-shutdown check, act while the 90-second shutdown
   fixture is running: open `aivf-worker` **Manual Deploy**, choose **Deploy
   latest commit**, and confirm. Do not restart Key Value and do not change any
   environment value.
7. In the old instance logs, confirm `worker.shutdown_requested` followed by
   `worker.stopped`. In the replacement instance, confirm
   `verification.run_suppressed`, then allow the 60-second lease to expire and
   confirm recovery logs show the fixture is recovered and eventually completed.
8. Return to `aivf-worker` **Environment**, remove
   `QUEUE_VERIFICATION_RUN_ID`, save, and deploy once more.
9. Confirm the clean worker emits `worker.ready` with no verification events.
10. Keep `aivf-web` at `QUEUE_ENABLED=false` until Milestone 2.3.

If `verification.failed` appears, retain the PostgreSQL fixture for diagnosis,
remove the variable, and do not reuse that run ID. No scenario automatically
restarts a Render service or modifies provider configuration.

## Rollback

1. Keep or restore `aivf-web` `QUEUE_ENABLED=false`.
2. Suspend or remove `aivf-worker` through an approved Blueprint change.
3. Leave PostgreSQL rows intact; they remain recoverable.
4. The Key Value instance may be cleared without deleting authoritative state.
5. Revert the worker deployment if startup/readiness logs fail; no provider traffic is activated by this milestone.

## Verification boundary

Unit and contract tests do not substitute for real Redis/Valkey verification. The Render sequence above is required before claiming production BullMQ locking, delayed delivery, restart recovery, or private-network connectivity.
