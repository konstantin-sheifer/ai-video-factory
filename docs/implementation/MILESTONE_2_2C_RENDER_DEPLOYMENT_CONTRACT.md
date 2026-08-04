# Milestone 2.2C — Render Production Deployment Contract

## Decision

AI Video Factory targets a Render Web Service for the current Next.js application, a future Render Background Worker for durable execution, Render Key Value for the future BullMQ transport, and the existing external Neon PostgreSQL database as the durable source of truth.

The queue remains disabled. This milestone does not install BullMQ, start a worker, migrate provider work, or change the synchronous generation flow.

## Runtime and build contract

- Node.js 20 is the supported production runtime. It satisfies the Node 20.9 minimum shared by Next.js 16 and Clerk.
- Render uses the native Node runtime; a Dockerfile is unnecessary for the current web service.
- Web build: `npm ci && npm run build`.
- Web start: `npm run start`.
- The existing Neon database is supplied through `DATABASE_URL`; the Blueprint does not provision PostgreSQL.

## Render services

`render.yaml` defines:

- `aivf-web`, the production Next.js web service;
- `aivf-queue`, a Redis-compatible Key Value service configured for `noeviction` and journal-plus-snapshot persistence.

Render Blueprints do not support a safely disabled background-worker placeholder. Defining `aivf-provider-worker` before a real command exists would deploy a failing or misleading service. It is therefore deliberately deferred to 2.2D, when the Blueprint will add a worker with the real `npm run worker:start` contract.

## Health contract

- `GET /api/health/live` returns process liveness only.
- `GET /api/health/ready` checks PostgreSQL with `SELECT 1`.
- When `QUEUE_ENABLED=false`, readiness reports the queue as disabled and does not require Redis.
- When `QUEUE_ENABLED=true`, readiness also performs a bounded Redis `PING`; failure returns HTTP 503.
- Responses contain only controlled status values. They do not expose hostnames, connection strings, provider state, stack traces, or internal errors.

Both endpoints are public because Render health probes do not carry Clerk sessions. They do not read or mutate user data.

## Environment and secrets

`.env.example` contains safe placeholders and defaults only. Real database, Clerk, Redis, and provider credentials belong in Render environment secrets. Web and worker environments must be separated so that the web service receives only credentials needed by work it still performs.

`QUEUE_ENABLED=false` is explicit in the web Blueprint. Provisioning `aivf-queue` does not activate queue publishing or consumption.

## Future worker contract

Milestone 2.2D must add:

- BullMQ and its Redis client;
- a compiled persistent worker entry point;
- `worker:start` and worker build commands;
- startup dependency checks, recovery, heartbeat, and graceful shutdown;
- an `aivf-provider-worker` Blueprint service using that real command.

The worker must fail startup when required configuration is invalid. It must never idle while presenting itself as an active consumer.

## CI

The GitHub Actions workflow installs locked dependencies, generates Prisma Client, validates the Prisma schema, runs TypeScript, lints milestone source files, runs queue and health tests, builds the production web application, and checks the Render manifest contract. It does not deploy and requires no production secrets.

Repository-wide lint remains outside this milestone because untouched UI files contain verified pre-existing issues. The workflow names its targeted lint scope explicitly rather than suppressing results.

## Deployment order

1. Owner creates the Render workspace and connects the repository.
2. Owner supplies Neon and Clerk production secrets.
3. Render provisions `aivf-queue` and deploys `aivf-web` with the queue disabled.
4. Verify liveness, readiness, authentication, and the synchronous generation journey.
5. Milestone 2.2D adds and verifies the real worker locally.
6. Milestone 2.2E provisions and activates the background worker with a no-cost handler before provider stages move.

## Rollback

Keep `QUEUE_ENABLED=false`, stop or omit the future worker, and redeploy the previous web commit. PostgreSQL remains authoritative and no schema migration is introduced here. The new health endpoints are isolated from user flows.

## Owner actions required for 2.2E

- Create or authorize the Render account and workspace.
- Connect the GitHub repository.
- Select the Render region nearest the existing Neon database.
- Supply production `DATABASE_URL` and Clerk secrets.
- Confirm Neon connection pooling and limits.
- Approve the persistent Key Value service and its secret connection URL.
- After 2.2D, add provider credentials only to the worker that requires them.

No account provisioning, secret installation, or deployment occurs in this milestone.
