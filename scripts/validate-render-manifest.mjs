import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = await readFile(new URL("../render.yaml", import.meta.url), "utf8");

assert.match(manifest, /type: web\s+name: aivf-web/);
assert.match(manifest, /healthCheckPath: \/api\/health\/ready/);
assert.match(manifest, /type: keyvalue\s+name: aivf-queue/);
assert.match(manifest, /QUEUE_ENABLED\s+value: "false"/);
assert.doesNotMatch(manifest, /type: worker/);
assert.doesNotMatch(manifest, /worker:start/);

console.log("Render deployment contract is structurally valid.");
