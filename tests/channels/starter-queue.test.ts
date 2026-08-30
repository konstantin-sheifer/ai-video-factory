import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getMockStarterConcepts,
  shouldUseMockStarterQueue,
} from "../../lib/channels/starter-concepts";

test("staging configuration generates a deterministic mock starter queue", () => {
  assert.equal(shouldUseMockStarterQueue({ AI_BRAIN_LIVE: "false" }), true);
  const ideas = getMockStarterConcepts("Animals");
  assert.equal(ideas.length, 5);
  assert.equal(new Set(ideas.map((idea) => idea.title.toLowerCase())).size, ideas.length);
  assert.ok(ideas.every((idea) => idea.title && idea.hook && idea.script && idea.visual));
});

test("live generation requires both the live switch and an API key", () => {
  assert.equal(
    shouldUseMockStarterQueue({ AI_BRAIN_LIVE: "true", OPENAI_API_KEY: "configured" }),
    false
  );
  assert.equal(shouldUseMockStarterQueue({ AI_BRAIN_LIVE: "true" }), true);
});

test("route authenticates, scopes channel ownership, and persists before responding", async () => {
  const route = await readFile("app/api/channels/generate-queue/route.ts", "utf8");
  const authIndex = route.indexOf("await requireAppUser()");
  const bodyIndex = route.indexOf("await request.json()");
  const ownershipIndex = route.indexOf("ensureChannelForUser");
  const persistenceIndex = route.indexOf("saveStarterConceptsForUser");

  assert.ok(authIndex >= 0 && authIndex < bodyIndex);
  assert.ok(ownershipIndex >= 0);
  assert.ok(persistenceIndex > ownershipIndex);
  assert.match(route, /status:\s*403/);
});

test("database migration provides durable ownership and duplicate protection", async () => {
  const migration = await readFile(
    "prisma/migrations/20260828000000_add_channel_content_queue/migration.sql",
    "utf8"
  );
  assert.match(migration, /FOREIGN KEY \("userId"\) REFERENCES "User"/);
  assert.match(migration, /UNIQUE INDEX "ChannelConcept_channelId_fingerprint_key"/);
});

test("scheduler reloads durable concepts and exposes controlled errors", async () => {
  const page = await readFile("app/scheduler/page.tsx", "utf8");
  assert.match(page, /fetch\("\/api\/channels\/generate-queue", \{ cache: "no-store" \}\)/);
  assert.match(page, /role="alert"/);
  assert.match(page, /conceptIds/);
});
