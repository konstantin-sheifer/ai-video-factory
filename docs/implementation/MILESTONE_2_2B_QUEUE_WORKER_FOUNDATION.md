# Milestone 2.2B — Durable Queue and Worker Foundation

## Infrastructure decision

The repository does not identify a production hosting target and contains no deployment manifest, Redis configuration, container definition, or persistent process definition. Existing architecture documentation explicitly leaves hosting and worker topology unresolved. A Next.js request runtime cannot be assumed to support a persistent queue consumer.

**Decision ADR-2.2B-001:** Keep BullMQ with Redis as the preferred production transport, but do not install or activate it until the production deployment provides:

- a dedicated, continuously running Node.js worker service;
- a reachable production Redis service with persistence and TLS as appropriate;
- independent web and worker deployment, health, restart, and shutdown controls;
- confirmed runtime, region, networking, resource, and observability policies.

This milestone implements only infrastructure-neutral components that remain valid after that decision: queue ports, durable dispatcher, worker execution core, leases and heartbeats, retry transport rules, cancellation checkpoints, bounded recovery, a no-cost handler, configuration validation, and tests. `InMemoryJobQueue` is explicitly test/development-only. It is not a BullMQ substitute and is never selected implicitly for production.

## Architecture

```text
authenticated caller / future coordinator
                |
                v
     DurableJobDispatcher
                |
        JobQueue interface
                |
      future BullMQ adapter
                |
       dedicated consumer
                |
                v
     DurableWorkerExecutor
                |
     GenerationJobService
                |
          PostgreSQL
```

PostgreSQL remains authoritative. Queue messages contain only the durable job ID and an attempt-scoped deduplication key. Queue presence, delivery count, or transport state never replaces the durable lifecycle state.

## Queue boundary

`JobQueue` supports:

- immediate and delayed enqueue through `runAt`;
- deterministic deduplication keys;
- normalized queue references;
- best-effort transport cancellation;
- graceful close.

`QueueConsumer` defines the future dedicated adapter boundary. No application service or route imports BullMQ or Redis types.

`DisabledJobQueue` fails closed when infrastructure is unavailable. `InMemoryJobQueue` supports deterministic focused tests and local verification only.

## Dispatch flow

1. Load the job through the owner-scoped lifecycle service.
2. Accept only `queued`, eligible `failed`, or `retry_scheduled` state.
3. Move `retry_scheduled` to `queued` through `GenerationJobService`.
4. Submit the durable job ID using `generation-job:{id}:attempt:{n}`.
5. Preserve `nextRetryAt` as delayed delivery time.
6. Treat repeated submission as deduplication, not a new durable attempt.

Cancellation records durable state first and then requests transport removal when a queue reference is available.

## Worker process model

`DurableWorkerExecutor` is transport-neutral execution orchestration, not a persistent process entry point. A future dedicated consumer will pass each delivered durable job ID to it.

For each delivery it:

1. Reloads canonical database state without trusting queue ownership data.
2. Rejects cancelled, terminal, premature-retry, or otherwise non-executable work.
3. Converts an eligible failed retry through `retry_scheduled` back to `queued`.
4. Atomically acquires a worker-specific lease.
5. Starts the durable attempt through `GenerationJobService`.
6. Executes the registered handler with progress and cancellation checkpoints.
7. Renews the lease periodically.
8. Validates the lease immediately before completion or failure.
9. Records a sanitized result or failure.
10. Schedules the same durable job identity for a bounded retry when eligible.

Duplicate deliveries in one process are suppressed locally; duplicates across processes compete for the atomic database lease. Only one can execute.

Shutdown aborts active handler work at a safe boundary. It does not mark interrupted jobs completed or failed; the lease expires and recovery makes them eligible again.

## Initial no-cost handler

The `planning` job type is used as a deterministic metadata-preparation proof. The handler:

- performs no network or provider calls;
- reports 20, 60, and 90 percent checkpoints;
- returns bounded metadata;
- supports a short test delay;
- supports an explicit simulated retryable failure;
- observes abort and cancellation checkpoints.

No Runway, ElevenLabs, OpenAI, rendering, or publishing work is migrated.

## Lease and heartbeat behavior

- Lease acquisition and renewal are atomic owner-scoped database updates.
- Renewal requires the same worker identity, an unexpired lease, and an active status.
- Production configuration requires the heartbeat interval to be shorter than the lease.
- Lease loss aborts the handler and prevents completion or failure writes.
- An expired unstarted `claimed` job returns to `queued`.
- An expired `running` or `waiting_provider` job becomes retryable `failed`, or `dead_letter` when attempts are exhausted.

Heartbeat timers do not live in Next.js route handlers. They belong inside the future dedicated worker process.

## Retry behavior

- `attemptCount` and `maxAttempts` in PostgreSQL remain authoritative.
- BullMQ-native automatic attempts must be disabled when the adapter is added.
- A retryable failure records `nextRetryAt`.
- The worker publishes one delayed delivery for the next durable attempt.
- Delivery at or after that time performs `failed → retry_scheduled → queued`.
- The same `GenerationJob.id` is preserved.
- Exhausted retries become `dead_letter`.
- If retry publication fails, bounded recovery finds the due database job later.

## Cancellation limitations

- A cancelled job never starts.
- Active handlers inspect cancellation at explicit checkpoints.
- Safe-boundary cancellation records `cancelled` through `GenerationJobService`.
- Transport cancellation is best effort.
- No external provider cancellation is claimed or implemented.
- There is no frontend cancellation UI in this milestone.

## Recovery

`DurableJobRecovery.reconcile()` processes at most 100 candidates per call and covers:

- queued database jobs that may be missing from transport;
- due retryable failures;
- expired claimed, running, or provider-wait leases;
- duplicate queue submission through deterministic deduplication;
- worker restart through lease expiry.

Recovery is an explicit service operation. No scheduler or recurring process is started by the web application. The future worker deployment must invoke it on startup and at a bounded operational interval.

## Configuration

The server-side configuration reader recognizes:

| Variable | Default | Purpose |
| --- | --- | --- |
| `QUEUE_ENABLED` | `false` | Explicit queue enable/disable switch |
| `REDIS_URL` | none | Required only when queueing is enabled |
| `QUEUE_NAME` | `ai-video-factory-generation` | Logical queue name |
| `QUEUE_PREFIX` | `aivf` | Shared Redis key prefix |
| `QUEUE_WORKER_IDENTITY` | `worker-{pid}` | Lease owner identity |
| `QUEUE_LEASE_DURATION_MS` | `60000` | Durable worker lease |
| `QUEUE_HEARTBEAT_INTERVAL_MS` | `15000` | Lease-renewal interval |
| `QUEUE_WORKER_CONCURRENCY` | `2` | Future consumer concurrency |

Values are validated without logging Redis credentials. No secret is committed.

## Observability

Structured logs cover submission, deduplication, lease acquisition, start, heartbeat, progress, retry scheduling, cancellation, completion, normalized failure, lease loss, skipped delivery, and recovery. Fields are limited to lifecycle identifiers and controlled status metadata. They exclude prompts, user content, provider bodies, credentials, Redis URLs, and raw errors.

## Local verification

```text
npm run test:queue
npm run test:queue:db
```

- `test:queue` uses the explicit in-memory transport and no paid providers.
- `test:queue:db` performs a rollback-only PostgreSQL integration check for creation, lease acquisition, renewal, expiry recovery, retry eligibility, and requeue.

No Redis instance or disposable container was used because no Redis/BullMQ adapter was selected at the infrastructure gate.

## Production deployment requirements

Before enabling `QUEUE_ENABLED`:

1. Select and document the production host.
2. Provision a dedicated worker service and managed Redis.
3. Add and test the BullMQ adapter behind `JobQueue` and `QueueConsumer`.
4. Disable independent BullMQ retries; use the durable retry state.
5. Add worker health/readiness probes and graceful termination windows.
6. Run Redis integration tests for delayed delivery, deduplication, reconnect, shutdown, and recovery.
7. Invoke bounded reconciliation on worker startup and at an approved interval.

Until these conditions are met, the application continues using its existing synchronous generation path and the durable queue remains disabled.

## Deferred to Milestone 2.3

- deployment-specific BullMQ/Redis adapter and worker entry point
- full generation pipeline job graph and dependency dispatch
- Runway, ElevenLabs, OpenAI, render, and transcription handlers
- provider submission reconciliation and external cancellation
- progress and cancellation APIs and UI
- object-storage media handoff
- production worker health endpoints and operational dashboards
