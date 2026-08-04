# Milestone 2.2C.1 — First Render Staging Readiness

## Outcome

The Render Blueprint now defines a reproducible, no-paid-provider staging deployment. PostgreSQL is authoritative for projects, the synchronous renderer is disabled, Prisma migrations run before the new build is deployed, and mock media does not write authoritative output to Render's ephemeral public filesystem.

## Blockers and fixes

| Blocker | Resolution |
| --- | --- |
| Project storage could fall back to process memory | Render sets `PROJECT_STORAGE_PROVIDER=prisma`; existing authenticated ownership queries remain in force. |
| Live and mock provider modes were implicit | Every existing provider selector used by the main generation flow is explicit in `render.yaml`. |
| FFmpeg and generated media used ephemeral web-service paths | Render sets `RENDER_PROVIDER=mock`; mock video is a deterministic public demo fixture and mock render passes that URL through without file writes. |
| Clean CI build required an undeclared provider secret | The channel queue route now constructs its OpenAI client only after authentication and request validation, so route-module collection does not require `OPENAI_API_KEY`. |
| Render had no migration lifecycle | The build runs `prisma generate` and `prisma migrate deploy` before `next build`. A successful build is deployed only after this sequence completes. |
| Queue readiness could be confused with deployment readiness | `QUEUE_ENABLED=false` remains explicit. Readiness requires PostgreSQL and reports the queue disabled without contacting Redis. |

## Explicit staging profile

```text
DEPLOYMENT_ENVIRONMENT=staging
PROJECT_STORAGE_PROVIDER=prisma
AI_BRAIN_LIVE=false
VIDEO_PROVIDER=mock
VOICE_PROVIDER=mock
SUBTITLE_PROVIDER=mock
RENDER_PROVIDER=mock
PUBLISH_PROVIDER=mock
DOWNLOAD_PROVIDER=mock
QUEUE_ENABLED=false
```

`AI_BRAIN_LIVE=false` selects the deterministic AI Brain fallback and reports mock provenance from the script route. No `OPENAI_API_KEY`, `RUNWAY_API_KEY`, or `ELEVENLABS_API_KEY` is supplied to staging. The transcription endpoint has no repository-level mock provider selector and is therefore intentionally unavailable without an OpenAI key; it is not part of the landing generation path. The channel queue generator likewise remains unavailable without a live OpenAI credential. These are controlled staging limitations, not simulated live-provider success.

## Mock media strategy

- Video uses one deterministic public MDN demo URL and returns `provider: "mock"`, `mock: true`.
- Voice uses the existing deterministic public SoundHelix demo URL and returns mock provenance.
- Subtitles are produced in memory and return mock provenance.
- Render returns the verified mock video URL with `provider: "mock"`, `mock: true`; it does not invoke FFmpeg, download media, or write generated/final files.
- Publishing and download remain their existing mock adapters.

These external demo URLs are stable staging fixtures, but they are not platform-owned durable media. The staging UI must be understood as a functional mock demonstration. Durable generated media requires future object storage before live providers are activated.

## Database deployment

Render executes:

```text
npm ci && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build
```

Render's free web-service plan does not provide the paid pre-deploy command lifecycle. Running `prisma migrate deploy` in the build phase is the supported free-staging compromise: it occurs before the new version can receive traffic and uses only committed, non-destructive production migrations. It does not run `migrate dev`, reset, or seed. The existing external Neon database remains the source of truth.

Migrations can precede a later build failure, so future migrations must remain backward-compatible with the currently deployed version. A paid pre-deploy command can replace this build-phase step when the service tier changes.

## CI root cause

Next.js 16 collects route modules during production page-data collection. `app/api/channels/generate-queue/route.ts` previously instantiated the OpenAI SDK at module scope. In clean Node 20 CI, where paid-provider secrets are intentionally absent, the SDK threw `Missing credentials` while collecting `/api/channels/generate-queue`. Lazy construction after authentication and validation removes the build-time secret dependency without suppressing runtime provider errors.

## Render secrets

The Blueprint requests exactly these secrets with `sync: false`:

- `DATABASE_URL` — external Neon PostgreSQL connection string.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk staging publishable key.
- `CLERK_SECRET_KEY` — Clerk staging secret key.

No provider credential is required or expected for the all-mock staging profile. Redis can remain provisioned for the future queue foundation, but the web process does not require or receive `REDIS_URL` while the queue is disabled.

## First deployment checklist

1. Select a Render region close to the Neon database.
2. Supply the three requested secrets; do not add paid-provider credentials.
3. Confirm the build completes dependency installation, Prisma generation, migration deployment, and Next.js production build.
4. Verify `/api/health/live` returns liveness.
5. Verify `/api/health/ready` reports database up and queue disabled.
6. Sign up, create a project, complete the mock landing-to-Studio flow, and reload to confirm Prisma persistence.
7. Confirm video, voice, subtitles, and render responses display mock provenance.
8. Confirm no generated or final video is treated as a durable local Render file.
9. Verify publish remains mock-only.

## Production differences and remaining limitations

- The Render web filesystem is ephemeral and is not an authoritative media store.
- Mock media depends on public third-party demo fixtures and is unsuitable for a live product SLA.
- Queue transport and persistent workers remain disabled.
- Real transcription, channel queue generation, AI providers, publishing, and FFmpeg rendering remain unavailable.
- Object storage, a dedicated provider worker, and an isolated FFmpeg-capable render worker are required before live generation is enabled.
