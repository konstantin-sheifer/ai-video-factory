# AI VIDEO FACTORY — MASTER HANDOFF v2 FINAL

**Owner:** Konstantin Sheifer  
**Canonical purpose:** single continuity package for all future ChatGPT/Codex work on AI Video Factory.  
**Status:** finalized from repository truth audit dated 2026-10-04.  
**Repository truth audit:** completed read-only on 2026-10-04.  
**Current verified branch:** `main`  
**Current verified HEAD:** `cb485bb293496916e8902dc6483bc82f3864074d`  
**Current verified commit message:** `fix(queue): restore durable retry execution`

---

# 0. Source-of-truth hierarchy

When information conflicts, use this order:

1. **Current repository + actual deployed runtime/logs**
2. **Tracked architecture/implementation docs that match current code**
3. **This Master Handoff**
4. Older chats, screenshots, historical reports, untracked root docs

The current repository defines what is actually implemented.

This handoff defines:
- product intent;
- protected product behavior;
- architectural principles;
- current verified checkpoint;
- roadmap;
- collaboration rules.

Old chats are historical evidence only.

---

# 1. Product identity

AI Video Factory is intended to be a commercial AI SaaS that takes a simple user idea and coordinates the entire content-production journey:

**Idea → Creative Direction → Script → Visual Plan → Video → Voice → Subtitles → Render → Review → Publish → Analytics**

The project has two equal goals:

1. Build a reliable production-quality commercial SaaS.
2. Serve as Konstantin’s flagship portfolio project demonstrating senior-level AI engineering, product architecture, durable execution, provider abstraction, security, and product thinking.

The system should optimize for final user value, not isolated model output.

A technically valid MP4 is not success.

Success is a coherent, engaging, visually consistent, emotionally effective, publishable piece of content.

Early North Star:

> **Wow, full-feeling video from a simple prompt.**

Long-term North Star:

> **AI Movie Factory / AI Content Factory**

Target evolution:

**short vertical videos → longer platform content → episodic content → short films → feature-length production orchestration**

“Hollywood quality” is a directional aspiration, not a current product claim.

---

# 2. Product philosophy

The user should not need to understand:
- screenplay structure;
- directing;
- camera language;
- provider-specific prompting;
- voice generation;
- subtitles;
- rendering;
- social-platform formats;
- publishing pipelines.

The user provides the idea.

The system accepts professional responsibility for turning that idea into a strong result.

Core product principles:
- quality over raw speed;
- minimal premium UX;
- clear creative ownership;
- strong storytelling;
- continuity;
- explicit quality gates;
- provider independence;
- reliable production execution.

---

# 3. Primary users

Likely early users:
- creators;
- small businesses;
- social-media specialists;
- affiliate/e-commerce creators;
- agencies/content teams;
- people with ideas but without professional video-production skills.

Core user pain:
- fragmented AI tools;
- provider-specific prompt knowledge;
- inconsistent output quality;
- weak storytelling;
- poor character/environment/style continuity;
- manual voice/subtitle/render work;
- wasted provider spend;
- manual publishing/scheduling;
- difficulty reproducing successful formats.

The product should sell:
- judgment;
- orchestration;
- quality control;
- continuity;
- a finished result.

Not merely access to AI providers.

---

# 4. Creative Producer and AI Brain

For the user, the central creative identity should be the **Creative Producer**.

Creative Producer is responsible for transforming the user’s idea into an executable production decision.

Internally, AI Brain may include specialized bounded roles such as:
- Executive Producer;
- Creative Producer;
- Quality Controller;
- Intent Analyst;
- Story Director;
- Screenwriter;
- Emotion Director;
- Retention Strategist;
- Character Designer;
- Environment Designer;
- Style Director;
- Storyboard Director;
- Keyframe Director;
- Camera Planner;
- Continuity Supervisor;
- Provider Prompt Architect;
- Production Feasibility Analyst;
- Platform Adaptation Director;
- specialized reviewers.

Do not create agents merely for naming/complexity.

Every internal role must have a clear responsibility and measurable impact on output quality.

Key creative directions already represented in the codebase:
- Creative Producer;
- Creative Brief;
- Emotion Director;
- Production Bible;
- Storyboard;
- keyframes;
- camera planning;
- provider-neutral prompts;
- quality review.

---

# 5. Production package — intended architecture vs current main

## Intended architecture

AI Brain should produce one authoritative, versioned **production package** containing structured production intent such as:
- original/interpreted idea;
- creative brief;
- audience/platform/format/duration;
- beats/story;
- emotional direction;
- character/environment definitions;
- visual language;
- scene/shot/camera plan;
- continuity constraints;
- narration/dialogue/subtitle intent;
- provider-neutral instructions;
- negative constraints;
- feasibility/quality results;
- generation-readiness decision;
- provenance/version/revision data.

Important intended rules:
1. AI/model output is untrusted until validated.
2. Significant outputs should be structured and runtime-validatable.
3. Upstream changes invalidate downstream dependencies.
4. Fallback/mock must not masquerade as live equivalence.
5. Quality review should be independent.
6. AI Brain must not own HTTP/auth/DB/queues/files/credentials.
7. Paid generation should be blocked when quality gates fail.

## Repository truth on 2026-10-04

The immutable production-package enforcement work is **not in `main`**.

A separate remote branch exists:

`fix/production-package-contract`

at:

`d1c7517`

That branch is one commit ahead of current `main` and contains production-package enforcement work.

Therefore, on current `main`:
- immutable production package is not an enforced execution boundary;
- raw `/api/video` prompt bypass protection is not part of the main branch;
- quality-gate enforcement is not yet mandatory.

This distinction is critical.

Do not describe production-package enforcement as live on `main` until that implementation is intentionally reconciled/merged/reimplemented.

---

# 6. Quality gate truth

Current `main` contains quality-related logic.

However, current repository audit proves:

- `/api/script` can return `canGenerate` and `generationBlocked`;
- `/loading` does not enforce those fields;
- Studio channel generation does not enforce those fields;
- `/api/video` accepts client-supplied prompt data.

Therefore:

> **Quality gate exists conceptually and partially in code, but is not an authoritative execution boundary on current `main`.**

This is a known later architectural/security/product task after the current durable-worker milestone is completed.

---

# 7. Duration strategy

10-second vertical 9:16 remains the early validation format.

It is not the long-term product boundary.

Target duration architecture should use a shared contract across:

**user intent → script → beats/scenes → visual plan → provider strategy → voice → subtitles → render → publishing**

Scalable concepts:
- target duration;
- beat budget;
- pacing profile;
- scene/shot constraints;
- provider capability envelope;
- segmentation/stitching.

Do not hardcode the whole creative system independently per duration.

“One continuous shot” and limited characters/locations were reliability strategies for early short-video production, not permanent product restrictions.

---

# 8. Provider-neutral architecture

AI Brain determines **what and why**.

Provider adapters determine **how** to express that intent to specific providers.

Potential providers:
- Runway;
- Kling;
- Veo;
- Pika;
- future providers.

Provider-specific:
- model names;
- API syntax;
- polling;
- retries;
- credentials;
- error normalization

must remain at provider boundaries.

Runway must never become core domain logic.

Mock/live provenance must remain explicit.

---

# 9. Permanent system architecture

Logical target:

```text
Experience Layer
    │
    ▼
Application API
    │
    ▼
Generation Orchestration
    │
    ├── AI Brain
    ├── Provider Abstraction
    ├── Quality Gates
    ├── Media Processing
    └── Publishing
    │
    ▼
Durable Platform Services
    ├── Relational Database
    ├── Job Queue
    ├── Object Storage
    ├── Identity
    └── Observability
```

Permanent engineering principles:
- user experience first;
- quality over raw speed;
- durable state over transient execution;
- explicit subsystem boundaries;
- provider independence;
- secure by default;
- observable execution;
- incremental reversible migration;
- **verify, never assume**.

---

# 10. Authoritative state rules

## PostgreSQL

PostgreSQL is authoritative for business lifecycle.

Critical state must not depend solely on:
- localStorage;
- browser memory;
- process memory;
- one HTTP request;
- one server process;
- ephemeral files.

## Browser

Browser initiates and observes.

Browser must not own durable generation orchestration.

## Redis / Valkey

Redis/Valkey is delivery coordination, not the business source of truth.

PostgreSQL remains authoritative for:
- job status;
- attempts;
- leases;
- heartbeat;
- progress;
- retries;
- cancellation;
- outcomes.

---

# 11. Verified Git truth — 2026-10-04

Branch:

`main`

HEAD:

`cb485bb293496916e8902dc6483bc82f3864074d`

`origin/main`:

same SHA.

Verified commit message:

`fix(queue): restore durable retry execution`

Staging area:
- empty.

Uncommitted user files:
- modified `AGENTS.md`;
- nine untracked root `docs/*.md`.

Tracked documentation is only under:

`docs/implementation/`

Tags:
- none.

Important historical SHA ambiguity is now resolved:

> `cb485bb293496916e8902dc6483bc82f3864074d` is genuinely the current `fix(queue): restore durable retry execution` commit.

Any older note that used this SHA as an earlier baseline is stale/incorrect.

---

# 12. Verified recent commit sequence

Most recent verified commits include:

```text
cb485bb fix(queue): restore durable retry execution
9d6015a fix(queue): handle stale retry delivery cancellation
a623e0f fix(queue): unblock Render retry recovery
cc7742a fix(queue): repair durable retry delivery
1ef8de7 fix(queue): complete delayed retry verification
f095cf1 test(queue): add Render BullMQ verification harness
f6c47b1 feat(queue): add BullMQ worker runtime
0ba413d fix(studio): keep background music toggle visible
7a59436 fix(studio): restore background music volume control
7ca038e fix(channels): restore starter queue generation on staging
f005809 fix(auth): handle existing Clerk sessions on auth pages
7f4ffae fix(auth): restore Clerk sign-in rendering on staging
8d05ae8 fix(auth): use deployment-aware Clerk redirects
a7b5c11 fix(deploy): resolve Render staging blockers
071b4eb fix(deploy): support free Render Blueprint provisioning
acf00f4 chore(deploy): add Render production deployment contract
47bf39e feat(backend): add durable queue and worker foundation
5098997 feat(backend): implement durable job lifecycle services
e2441b6 feat(backend): add durable generation schema
4a2a17c feat(security): authenticate remaining provider routes
67c77b5 feat(security): complete Backend Security v1 hardening
3df1faf chore(repo): stop tracking generated videos
f48b697 Fix project list persistence
3b027cc Fix Studio suspense boundary
d79e212 Remove generated subtitle files
```

---

# 13. Current execution architecture — critical truth

Current repository contains **two execution systems that are not yet connected**.

## 13.1 Current real user pipeline

```text
Browser
  → sequential API routes
  → provider/render work
  → Project / Generation persistence
```

This remains browser-orchestrated/synchronous in important areas.

## 13.2 Durable worker foundation

```text
PostgreSQL GenerationJob
  → BullMQ / Render Valkey
  → persistent worker
  → deterministic planning handler
```

The durable worker currently does **not** execute the real user generation pipeline.

The only registered worker handler is deterministic/free planning behavior used for infrastructure verification.

Therefore:

> Durable queue infrastructure exists, but user generation has not yet been migrated onto it.

---

# 14. Actual current landing/loading user journey

Verified current path:

1. User enters idea on `/`.
2. Idea is stored in `localStorage`.
3. Browser navigates to protected `/loading`.
4. Clerk authentication occurs if needed, then returns to `/loading`.
5. Browser sequentially calls:
   - `/api/script`
   - `/api/timeline`
   - `/api/video`
   - `/api/voice`
   - `/api/subtitles`
   - `/api/render`
   - `/api/projects`
   - `/api/generations`
6. Browser stores additional Studio/session data in `localStorage`.
7. Browser navigates to:

`/studio?projectId=...`

Studio also contains a second partially duplicated pipeline for channel-concept generation.

This browser ownership is a major target for Backend Architecture v2 migration.

---

# 15. Backend Architecture v2 — verified foundation

Verified present:
- durable `Generation`;
- durable `GenerationJob`;
- `MediaAsset` schema;
- job lifecycle services;
- lease state;
- heartbeat/progress;
- retry state;
- cancellation state;
- recovery;
- queue abstraction;
- BullMQ adapter;
- Redis/Valkey connection factory;
- persistent worker runtime;
- deterministic transport/delivery identifiers;
- graceful shutdown support;
- structured sanitized logs;
- verification harness.

Partial/not yet active in user production flow:
- `GenerationJob` orchestration of actual user video generation;
- `MediaAsset` as real media authority;
- durable job graph for user pipeline.

---

# 16. Current Render / Neon topology

Latest known and repository-described topology:

- **aivf-web** — Next.js web service.
- **aivf-worker** — Render Background Worker.
- **aivf-queue** — Render Valkey.
- **Neon PostgreSQL** — authoritative relational database.

Known worker size:

`0.5c-512mb`

Important queue safety state:

> `aivf-web QUEUE_ENABLED` must remain `false` until durable worker verification is explicitly completed.

Current `render.yaml` passes `REDIS_URL` to web even though queue publishing remains disabled.

Older deployment documentation saying web receives no Redis URL is outdated.

Do not use Blueprint Manual Sync casually because Blueprint changes may provision/change billable infrastructure.

---

# 17. Real Render verification status

The verification harness is designed to:
- activate only with non-empty `QUEUE_VERIFICATION_RUN_ID`;
- remain inert when absent;
- expose no public API;
- make no paid provider calls;
- use internal/mock deterministic behavior;
- use durable run-once protection.

Scenarios intended:
- enqueue;
- BullMQ delivery;
- lease;
- heartbeat/progress;
- duplicate delivery;
- delayed retry;
- cancellation;
- missing-delivery recovery;
- expired-lease recovery;
- graceful shutdown.

Real Render evidence has already demonstrated at least:
- worker configuration loads;
- Valkey connectivity;
- PostgreSQL connectivity when Neon is available;
- worker initialization;
- recovery scans;
- real enqueue;
- real delivery;
- lease/execution behavior;
- heartbeat observation;
- duplicate protection;
- controlled retry failure persistence;
- transition into retry states;
- verification run suppression.

However:

> **The repaired delayed retry path after current commit `cb485bb` has not yet been proven end-to-end on Render.**

This remains the current blocker.

---

# 18. Temporary Neon outage — resolved operationally

A recent Render worker run repeatedly logged:

`Can't reach database server ...neon.tech:5432`

The configured Neon hostname was later verified to match the active Neon connection hostname.

Neon showed:
- `production` branch active;
- primary compute active;
- connection pooling enabled;
- no IP restrictions shown.

Fresh later Render logs showed repeated:

`recovery.completed`

Therefore:
- the database URL was not obviously stale;
- connectivity recovered;
- the Neon outage is not the current blocker.

Current blocker remains retry verification.

---

# 19. Current active milestone

## Milestone 2.2D-C — Complete Real Render Durable Retry Verification

This is the **only current engineering priority**.

Need to prove using a fresh `QUEUE_VERIFICATION_RUN_ID`:

1. recovery detects due `retry_scheduled`;
2. attempt 2 receives a new BullMQ delivery;
3. worker receives that delivery;
4. worker acquires lease;
5. attempt 2 executes;
6. job reaches `succeeded`;
7. logs include:
   - `verification.retry.passed`;
8. following scenarios complete:
   - cancellation;
   - missing-delivery recovery;
   - expired-lease recovery;
   - graceful shutdown/restart;
9. verification harness is disabled again by removing `QUEUE_VERIFICATION_RUN_ID`;
10. `aivf-web QUEUE_ENABLED` remains `false`.

If the verification passes:
- application code does not need changes;
- update tracked milestone docs and this handoff only.

If it fails:
- only fix the proven queue/runtime defect;
- do not expand scope.

---

# 20. Why retry verification matters

Commercial SaaS cannot safely rely on “the request probably finishes.”

Example:
- user paid;
- provider generation begins;
- worker restarts;
- network fails;
- Redis delivery is lost;
- duplicate delivery occurs.

Bad outcomes:
- job disappears after money is spent;
- provider work executes twice and money is charged twice.

The durable architecture must prove:

> If execution is interrupted, the system can resume correctly without losing the job and without duplicating paid provider work.

That is why leases, heartbeat, retry, recovery, deterministic IDs, idempotency, and PostgreSQL authority matter.

---

# 21. Next milestone after 2.2D-C

After real durable retry verification closes:

## Backend Architecture v2 — user pipeline activation

Transition from:

```text
HTTP/browser → long generation chain
```

to:

```text
HTTP command
→ durable Generation/GenerationJob
→ BullMQ
→ persistent worker
→ provider
→ durable result/state
→ frontend observes status
```

This is the point where the durable worker stops being only infrastructure foundation and becomes the real execution backbone.

---

# 22. End-to-end staging milestone after durable activation

After user generation is queue-driven, verify:

**Landing → Auth → Dashboard / Channel → Generate → Loading/Progress → Studio → Render → Download → Projects → Publish foundations**

The important acceptance criterion:

> Closing/reloading a browser or restarting a web process must not destroy an active generation.

After this succeeds, major backend architecture for MVP should be frozen unless a proven defect requires change.

Do not endlessly improve architecture for its own sake.

---

# 23. UI / visual polish phase

After durable execution backbone is proven and activated:

- return to reference/benchmark screenshots;
- refine Landing;
- Dashboard;
- Projects;
- Channels;
- Loading;
- Studio;
- Platforms;
- scheduling surfaces.

Goals:
- premium cinematic feel;
- better spacing/composition;
- visual hierarchy;
- typography;
- control consistency;
- responsive behavior;
- minimal UX.

Do not break established backend behavior during UI polish.

---

# 24. Protected Studio behavior

Without explicit owner approval:
- keep fixed/no-scroll Studio layout;
- do not casually change core sizes/fonts/positions;
- do not reintroduce removed Scenes block;
- do not break source-preview behavior after Download.

Critical protected behavior:

> After Download, Studio preview must not automatically switch to the final MP4.

Voice/subtitle preview controls should remain independent of downloaded/final source selection.

Current Studio features present in code/tests include:
- subtitles;
- voiceover;
- voice style;
- background music;
- background music volume;
- download MP4;
- project-based loading/persistence.

Historical background-music UI fixes are in current `main`.

---

# 25. Auth / security truth

Public API allowlist includes:
- `POST /api/generate` — simple mock generator, not main flow;
- `GET /api/health/db`;
- `GET /api/health/live`;
- `GET /api/health/ready`.

All other `/api/*` routes are proxy protected.

Handler-level auth verified for:
- projects;
- generations;
- publish;
- channel starter queue;
- script;
- surprise;
- video;
- video status;
- voice;
- transcribe.

Routes relying only on proxy auth include:
- assets/persist;
- dashboard;
- download;
- platforms;
- render;
- render/status;
- scheduler;
- subtitles;
- timeline.

Ownership is strong for:
- projects;
- generations;
- publish;
- channel concepts.

Known security/state weaknesses:
- scheduler is global process memory;
- platform connections are global process memory;
- some protected API routes lack defense-in-depth handler auth;
- paid provider routes lack quotas/rate limits/idempotency/project ownership anchor;
- page routes `/projects`, `/scheduler`, `/platforms` are not protected as page routes even though APIs are protected.

Backend Security v1/v1.1 work exists and is substantial, but security is not complete.

---

# 26. Persistence / mock / live truth

## Durable verified

- Prisma users;
- projects;
- generations;
- owned channels;
- starter concepts;
- job lifecycle schema/services;
- BullMQ adapter;
- persistent worker runtime.

## Partial

- generations persist after browser pipeline completes rather than controlling it;
- `GenerationJob` does not yet drive user generation;
- `MediaAsset` is not yet the authoritative media boundary;
- Studio/channel UI still uses localStorage.

## Mock/global

- Dashboard metrics are static;
- Scheduler is process-memory global;
- Platforms are process-memory global with demo data;
- Publishing is mock; real mode is blocked;
- current staging profile for render/video/voice/subtitles is mock.

---

# 27. Media storage truth

Live video and FFmpeg paths still write into local `public/` filesystem.

This is not durable production media storage.

Audit found ignored/untracked local media:
- 18 generated MP4;
- 28 final MP4.

Future production architecture must move authoritative media to object storage.

This is not the immediate milestone.

---

# 28. Important product defect candidates after current milestone

Prioritized risks after current 2.2D-C closes:

1. browser-orchestrated user pipeline is not durable;
2. quality gate can be bypassed;
3. `/api/video` accepts arbitrary client prompt;
4. paid provider paths lack quota/rate/idempotency/ownership controls;
5. final Download MP4 is not persisted back to `Project.videoUrl`, so Publish may use stale media;
6. scheduler/platform state is global and ephemeral;
7. media is stored on ephemeral local filesystem;
8. some page routes are not protected;
9. CI does not run complete lint/test coverage;
10. legacy/parallel AI Brain paths remain.

Do not address these randomly.

Proceed milestone-by-milestone.

---

# 29. Legacy / duplicate path warning

Current repository contains parallel/legacy AI subsystems including:
- `lib/story-engine/`;
- older `pipeline/orchestrator` paths;
- current Creative Producer / production planning paths.

These are legacy/dead-path candidates until a dedicated call-graph audit decides what is canonical.

Studio contains a partially duplicated generation pipeline for channel concepts.

Do not delete or consolidate these casually.

Do it only after tracing actual production call paths.

---

# 30. Current validation baseline

Verified on supported Node 20:

- TypeScript: passed.
- Production build: passed.
- Queue/health/staging/auth/channel/Studio tests: **48/48 passed**.
- Render manifest validation: passed.
- `git diff --check`: passed.

Repository-wide ESLint:
- **failed**;
- 6 errors;
- 7 warnings;
- existing UI/legacy issues.

An initial test launch under system Node 24 failed before loading tests.
The same test suite under supported Node 20 passed.

Therefore Node 20 is the authoritative validation environment unless repository support changes.

---

# 31. Documentation truth

Current root documentation is not a trustworthy source of implementation truth.

Facts:
- nine root `docs/*.md` files are untracked;
- some describe state from 2026-07-27;
- some claim queue/deployment/test infrastructure does not exist;
- this is now false;
- `AGENTS.md` is modified and currently claims test scripts are absent even though package scripts now contain queue/health/staging suites;
- only `docs/implementation/` is tracked documentation.

This Master Handoff should become the canonical continuity document.

Stale root docs should not be used as authoritative implementation evidence.

---

# 32. Working rules with Konstantin

Protected collaboration rules:

1. Communicate in Russian while preserving useful English technical terms.
2. Be concise and practical; avoid motivational filler.
3. Do not require Konstantin to hunt through code manually.
4. ChatGPT acts as architect / tech lead / reviewer.
5. Codex acts as implementation agent.
6. Delegate repository implementation/investigation to Codex whenever reasonable.
7. Assistant chooses one prioritized next milestone rather than giving a large menu.
8. If manual file replacement is required, provide complete files with exact paths.
9. Never instruct “replace this block” when a full-file replacement is appropriate.
10. Avoid large code walls in conversation.
11. Do not change fonts/layout/UI without explicit request.
12. Keep Studio no-scroll unless explicitly changed.
13. Do not spend paid provider credits during architecture/test work when mock/static/local tests suffice.
14. For UI operations, provide precise click-by-click instructions.
15. Do not assume Ctrl+F works reliably on Konstantin’s laptop.
16. When a screen already exposes all needed controls, provide all actions for that screen together.
17. In dev context, “сделай” means implement/code, not generate an image.
18. Always account for prior fixes before modifying related code.
19. Validate changes with relevant tests/build/logs.
20. Challenge product ideas that weaken end-user value or architecture.

---

# 33. Cost / deployment safety rules

- No paid provider calls during architecture audits unless explicitly approved.
- Keep mock/live provenance explicit.
- Quality gates should precede expensive operations.
- Duplicate delivery must not create duplicate paid provider execution.
- Paid operations need explicit idempotency/cost accounting before production exposure.
- Do not enable web queue publishing prematurely.
- Do not provision billable infrastructure without explicit owner approval.
- Do not use Blueprint Manual Sync casually.

---

# 34. Long-term Movie Factory requirements

Feature-film-scale architecture eventually needs:
- premise/theme/audience promise;
- world rules;
- character motivations and long arcs;
- acts/sequences/scenes/beats;
- complete script/dialogue;
- emotional arc;
- visual/character/environment bibles;
- persistent continuity memory;
- shot/performance/camera/light/sound direction;
- provider-aware production planning;
- many-scene generation orchestration;
- editing/audio/music/voice/subtitles/titles/mastering;
- hierarchical quality review;
- selective regeneration;
- provenance/rights/storage/export/distribution.

Do not build feature-film-scale infrastructure before earlier product and commercial evidence justify it.

---

# 35. Immediate next action

Do not start a new architecture feature.

Do not merge the production-package branch yet.

Do not enable `QUEUE_ENABLED` on web.

Do not perform UI redesign yet.

Next action:

> **Complete one fresh real Render verification run on current `main` / `cb485bb` using a new unique `QUEUE_VERIFICATION_RUN_ID`.**

Success must prove delayed retry and the remaining recovery/shutdown scenarios.

After success:
1. remove `QUEUE_VERIFICATION_RUN_ID`;
2. redeploy clean worker;
3. update tracked milestone documentation;
4. mark Milestone 2.2D-C complete;
5. begin queue-driven user pipeline activation.

---

# 36. New-chat initialization protocol

For a new AI Video Factory chat:

1. Attach this file.
2. State that it is the canonical project continuity package.
3. Provide repository access when needed.
4. Tell the model:
   - repository/runtime override this file for implementation facts;
   - no paid provider calls during orientation;
   - preserve uncommitted user files;
   - select one next milestone at a time.

Recommended first message:

```text
Мы продолжаем AI Video Factory.

Файл AI_VIDEO_FACTORY_MASTER_HANDOFF_v2_FINAL.md — канонический continuity package проекта.

Текущий repository/runtime является источником истины о фактической реализации. Handoff является источником истины о продуктовой философии, защищённых сценариях, архитектурных принципах и текущем roadmap.

Не запускай платные provider calls и не меняй unrelated/uncommitted файлы.

Текущий приоритет из handoff: завершить Milestone 2.2D-C — real Render durable retry verification — и только после этого переходить к queue-driven user pipeline.

Сначала кратко подтверди текущий checkpoint и предложи ровно следующий один шаг.
```

---

# 37. Old-chat deletion readiness

After this v2 file is:
- downloaded/backed up;
- committed into the repository in a canonical tracked location;
- used to initialize the new Master Development Chat;

the old AI Video Factory chats are no longer required as operational project context.

They may then be deleted as historical conversation noise.

Do not delete chats before the v2 file has been safely stored in at least one durable location outside those chats.

---

# 38. Recommended repository path

Recommended canonical tracked path:

`docs/AI_VIDEO_FACTORY_MASTER_HANDOFF.md`

This file should replace reliance on:
- old chat history;
- stale root docs;
- outdated handoff copies.

Do not copy every historical bug into it.

Update it only when a milestone materially changes:
- verified current state;
- canonical pipeline;
- architecture decisions;
- protected behavior;
- major risks;
- active milestone.

---

# 39. One-line canonical checkpoint

**AI Video Factory is a working short-video SaaS prototype with a substantial AI creative layer and a now-deployed durable BullMQ/Render/Valkey/PostgreSQL execution foundation; the durable worker is not yet connected to real user generation, the production-package gate is not enforced on current `main`, and the immediate task is to complete real Render retry/recovery verification before activating queue-driven user generation, then perform end-to-end staging, freeze MVP backend architecture, polish the premium UI, and continue toward production SaaS and eventually AI Movie Factory.**
