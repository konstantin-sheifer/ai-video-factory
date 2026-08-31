import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = await readFile(new URL("../render.yaml", import.meta.url), "utf8");

assert.match(manifest, /type: web\s+name: aivf-web/);
assert.match(manifest, /healthCheckPath: \/api\/health\/ready/);
assert.match(manifest, /type: keyvalue\s+name: aivf-queue/);
assert.match(manifest, /type: worker\s+name: aivf-worker/);
assert.match(manifest, /plan: 0\.5c-512mb/);
assert.match(manifest, /startCommand: npm run worker:start/);
assert.match(
  manifest,
  /key: REDIS_URL\s+fromService:\s+type: keyvalue\s+name: aivf-queue\s+property: connectionString/
);
assert.match(manifest, /QUEUE_ENABLED\s+value: "false"/);
assert.match(manifest, /PROJECT_STORAGE_PROVIDER\s+value: prisma/);
assert.match(manifest, /AI_BRAIN_LIVE\s+value: "false"/);
assert.match(manifest, /VIDEO_PROVIDER\s+value: mock/);
assert.match(manifest, /VOICE_PROVIDER\s+value: mock/);
assert.match(manifest, /SUBTITLE_PROVIDER\s+value: mock/);
assert.match(manifest, /RENDER_PROVIDER\s+value: mock/);
assert.match(manifest, /PUBLISH_PROVIDER\s+value: mock/);
assert.match(manifest, /DOWNLOAD_PROVIDER\s+value: mock/);
assert.match(manifest, /NEXT_PUBLIC_CLERK_SIGN_IN_URL\s+value: \/sign-in/);
assert.match(manifest, /NEXT_PUBLIC_CLERK_SIGN_UP_URL\s+value: \/sign-up/);
assert.match(
  manifest,
  /NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL\s+value: \/dashboard/
);
assert.match(
  manifest,
  /NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL\s+value: \/dashboard/
);
assert.doesNotMatch(manifest, /localhost:3000/);
assert.match(
  manifest,
  /buildCommand: npm ci && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build/
);

console.log("Render deployment contract is structurally valid.");
