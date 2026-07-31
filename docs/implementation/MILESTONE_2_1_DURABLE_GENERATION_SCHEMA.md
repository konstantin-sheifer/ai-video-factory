# Milestone 2.1 — Durable Generation Schema

## Purpose

This milestone adds the relational foundation required by Backend Architecture v2 without introducing queues, workers, polling, provider changes, or frontend behavior changes.

## Added schema

### Generation

The existing `Generation` model remains compatible with current API and storage behavior. Its lowercase `status` values are preserved while the column becomes a stable lifecycle enum.

New fields support:

- durable aggregate stage and progress;
- idempotent creation;
- cancellation and terminal timestamps;
- controlled failure classification;
- optimistic updates;
- mock/live provenance;
- provider configuration;
- architecture and schema versions;
- versioned AI Brain input, production package, decision, quality, prompt, and revision snapshots.

Existing script, timeline, subtitle, settings, provider, and media URL fields remain unchanged.

### GenerationJob

`GenerationJob` defines one future asynchronous pipeline unit. It records:

- direct user ownership and its parent generation;
- stage identity, revision, and dependencies;
- lifecycle status and progress;
- attempt and retry metadata;
- future worker lease and heartbeat state;
- provider operation references;
- idempotency;
- controlled failure information;
- structured input and output metadata;
- mock/live provenance and lifecycle timestamps.

No job runner or queue consumes these records in Milestone 2.1.

### MediaAsset

The existing `Video` model is not an authoritative general media model: it cannot represent audio or subtitle assets and has no direct user or generation ownership.

`MediaAsset` provides the future durable boundary for owned video, audio, subtitle, image, and thumbnail artifacts. It stores an authoritative storage identity, media metadata, provider provenance, lifecycle status, and relations to the owning user and optional generation, project, and job.

The existing `Video` model remains unchanged as a legacy compatibility model. New durable pipeline work will use `MediaAsset`; reconciliation or backfill of legacy `Video` rows is deferred until the media-storage cutover.

## Ownership

- New jobs require both `generationId` and `userId`.
- New media assets require `userId`.
- Media may also reference its generation, project, and producing job.
- Existing nullable `Generation.userId` and `Generation.projectId` remain nullable solely to preserve legacy records and current flows.
- Future creation APIs must derive user ownership from `requireAppUser()` and must never accept authoritative client-supplied user IDs.

## Lifecycle enums

- `GenerationStatus` models aggregate generation state.
- `GenerationStage` identifies the active pipeline stage.
- `GenerationJobType` identifies durable units of work.
- `GenerationJobStatus` supports queueing, leases, provider waits, retries, terminal failure, and cancellation.
- `ExecutionMode` distinguishes mock, live, mixed, and legacy provenance.
- `MediaAssetType` and `MediaAssetStatus` define durable media classification and lifecycle.

Existing lowercase generation status values remain compatible with current API response shapes.

## JSON persistence boundaries

Versioned creative artifacts remain structured JSON at this stage:

- input snapshot;
- AI Brain production package;
- AI Brain version manifest;
- prompt and template versions;
- decision summary;
- quality summary;
- revision and provenance metadata;
- provider configuration;
- job input and output metadata;
- media metadata.

Agent-specific relational tables are intentionally deferred. Normalization should occur only when query, ownership, or integrity requirements justify it.

## Compatibility decisions

- No existing field is deleted or renamed.
- Existing `Project` ownership and API behavior are unchanged.
- Existing provider, Studio, Projects, rendering, download, and publishing code is unchanged.
- Existing completed generations are backfilled with completed stage and timestamps.
- `progress` defaults to `100` because the current synchronous API persists only completed generations.
- Existing rows use `legacy` execution provenance because historical mock/live state cannot be inferred reliably from every record.
- The `Video` model and local URL fields remain available during the transition.

## Deferred to Milestone 2.2

- Queue infrastructure and dispatch
- Worker processes
- Job claiming, leases, and heartbeats
- Retry execution
- Job attempt history
- Polling and progress APIs
- Cancellation execution
- Provider submission and reconciliation
- Object-storage migration
- Media asset backfill
- New generation-start APIs
- Frontend pipeline cutover

Until those capabilities exist, `GenerationJob` and `MediaAsset` are durable schema foundations only.
