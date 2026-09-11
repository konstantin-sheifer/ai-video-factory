import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { ProductionPackageService, packageDigest } from "../../lib/services/production-package-service";
import { productionPackageHandlers } from "../../lib/http/production-package-handlers";
import { ProductionPackageSchema } from "../../lib/production/contract";
import { ProductionPackageRepository } from "../../lib/repositories/production-package-repository";
import { GenerationRepository } from "../../lib/repositories/generation-repository";
import { MemoryPackageStore, approvedFixture, idea } from "./fixtures";

async function fixture() {
  const store = new MemoryPackageStore();
  const plan = await approvedFixture();
  const prompts: string[] = [];
  let provider: "mock" | "runway" = "mock";
  const service = new ProductionPackageService(store, async () => structuredClone(plan), async prompt => {
    prompts.push(prompt);
    assert.equal(store.writes.at(-1), "claim");
    return { provider: "mock", mock: true, status: "SUCCEEDED", taskId: "fixture", videoUrl: "/generated-videos/fixture.mp4" };
  }, () => provider);
  const handlers = productionPackageHandlers(async () => ({ internalUserId: "owner" }), service);
  return { store, plan, prompts, service, handlers, changeProvider: () => { provider = "runway"; } };
}
const request = (body: unknown) => new Request("http://localhost/api/video", { method: "POST", body: JSON.stringify(body) });

test("approved immutable snapshot is saved before response; only its exact prompt is submitted", async () => {
  const f = await fixture();
  const response = await f.handlers.script(request({ idea }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(f.store.writes, ["insert"]);
  const before = structuredClone(f.store.rows.get(data.productionPackage.packageId)!.productionPackageJson);
  const snapshot = ProductionPackageSchema.parse(before);
  assert.equal(snapshot.owner, "owner");
  assert.equal(snapshot.intent.originalIdea, idea);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.gate.state, "approved");
  assert.equal((await f.handlers.video(request(data.productionPackage))).status, 200);
  assert.deepEqual(f.prompts, [snapshot.provider.promptText]);
  assert.deepEqual(f.store.rows.get(snapshot.id)!.productionPackageJson, before);
  assert.equal(f.store.rows.get(snapshot.id)!.status, "processing");
});

for (const payload of [{ prompt: "bypass" }, { brief: { sceneVisual: "bypass" } }, { packageId: "x", version: 1, prompt: "bypass" }, {}, { packageId: "x", version: "1" }]) {
  test(`raw/untrusted video request is rejected: ${JSON.stringify(payload)}`, async () => {
    const f = await fixture();
    const response = await f.handlers.video(request(payload));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "INVALID_PACKAGE_REFERENCE");
    assert.equal(f.prompts.length, 0);
  });
}

for (const reason of ["quality", "producer", "checks", "emotion", "brief", "duration", "prompt"]) {
  test(`${reason} rejection is persisted and makes zero provider calls`, async () => {
    const f = await fixture();
    if (reason === "quality") { f.plan.aiBrain.qualityReview.canGenerate = false; f.plan.aiBrain.qualityReview.approved = false; }
    if (reason === "producer") f.plan.aiBrain.creativeProducer.recommendation.shouldGenerate = false;
    if (reason === "checks") f.plan.aiBrain.creativeProducer.stageChecks[0].passed = false;
    if (reason === "emotion") f.plan.aiBrain.emotionDirector.status = "needs_revision";
    if (reason === "brief") f.plan.aiBrain.creativeBrief.finalGate.canGenerate = false;
    if (reason === "duration") f.plan.aiBrain.cameraPlan.duration = 30;
    if (reason === "prompt") f.plan.aiBrain.runwayPackage.promptText = "x".repeat(2501);
    const result = await f.handlers.script(request({ idea }));
    assert.equal(result.status, 422);
    const data = await result.json();
    assert.equal(data.canGenerate, false);
    assert.equal(f.store.rows.size, 1);
    assert.equal((await f.handlers.video(request(data.productionPackage))).status, 422);
    assert.equal(f.prompts.length, 0);
  });
}

test("foreign, missing, stale and altered packages fail closed", async () => {
  const f = await fixture();
  const data = await f.service.prepare("owner", { idea });
  await assert.rejects(f.service.generate("other", data.productionPackage), { code: "PACKAGE_NOT_FOUND" });
  await assert.rejects(f.service.generate("owner", { packageId: "missing", version: 1 }), { code: "PACKAGE_NOT_FOUND" });
  await assert.rejects(f.service.generate("owner", { ...data.productionPackage, version: 2 }), { code: "PACKAGE_VERSION_STALE" });
  const row = f.store.rows.get(data.productionPackage.packageId)!;
  const snapshot = ProductionPackageSchema.parse(row.productionPackageJson);
  snapshot.provider.promptText = "tampered";
  row.productionPackageJson = snapshot as unknown as Prisma.JsonValue;
  await assert.rejects(f.service.generate("owner", data.productionPackage), { code: "PACKAGE_INVALID" });
  assert.equal(f.prompts.length, 0);
});

for (const status of ["planning", "cancelled", "failed", "completed"] as const) {
  test(`non-submittable ${status} package never calls the provider`, async () => {
    const f = await fixture();
    const data = await f.service.prepare("owner", { idea });
    f.store.rows.get(data.productionPackage.packageId)!.status = status;
    await assert.rejects(f.service.generate("owner", data.productionPackage), { code: "PACKAGE_CONSUMED" });
    assert.equal(f.prompts.length, 0);
  });
}

test("parallel and repeated requests submit an approved package only once", async () => {
  const f = await fixture();
  const data = await f.service.prepare("owner", { idea });
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => f.service.generate("owner", data.productionPackage)));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(f.prompts.length, 1);
  await assert.rejects(f.service.generate("owner", data.productionPackage), { code: "PACKAGE_CONSUMED" });
});

test("provider configuration drift and mock-to-live promotion are rejected", async () => {
  const f = await fixture();
  const data = await f.service.prepare("owner", { idea });
  f.changeProvider();
  await assert.rejects(f.service.generate("owner", data.productionPackage), { code: "PROVIDER_INCOMPATIBLE" });
  const mockPlan = await f.service.prepare("owner", { idea });
  assert.equal(mockPlan.canGenerate, false);
  await assert.rejects(f.service.generate("owner", mockPlan.productionPackage), { code: "PACKAGE_NOT_APPROVED" });
  assert.equal(f.prompts.length, 0);
});

test("planning, persistence, authentication, JSON and claim errors make zero provider calls", async () => {
  const f = await fixture();
  const unauthenticated = productionPackageHandlers(async () => { throw Object.assign(new Error("auth"), { status: 401 }); }, f.service);
  assert.equal((await unauthenticated.video(request({}))).status, 401);
  assert.equal((await f.handlers.video(new Request("http://localhost", { method: "POST", body: "{" }))).status, 400);
  f.store.failInsert = true;
  assert.equal((await f.handlers.script(request({ idea }))).status, 500);
  f.store.failInsert = false;
  const data = await f.service.prepare("owner", { idea });
  f.store.failClaim = true;
  assert.equal((await f.handlers.video(request(data.productionPackage))).status, 500);
  const broken = new ProductionPackageService(f.store, async () => { throw new Error("planning failed"); }, async () => { throw new Error("must not run"); });
  assert.equal((await productionPackageHandlers(async () => ({ internalUserId: "owner" }), broken).script(request({ idea }))).status, 500);
  assert.equal(f.prompts.length, 0);
});

test("ambiguous provider failure and failed outcome persistence never resubmit the package", async () => {
  for (const failProvider of [true, false]) {
    const f = await fixture();
    let calls = 0;
    const service = new ProductionPackageService(f.store, async () => f.plan, async () => {
      calls++;
      if (failProvider) throw new Error("timeout after submission");
      return { provider: "mock", mock: true, status: "SUCCEEDED", taskId: "x", videoUrl: "/fixture.mp4" };
    }, () => "mock");
    const data = await service.prepare("owner", { idea });
    f.store.failFinish = !failProvider;
    await assert.rejects(service.generate("owner", data.productionPackage), { code: "VIDEO_SUBMISSION_FAILED" });
    await assert.rejects(service.generate("owner", data.productionPackage), { code: "PACKAGE_CONSUMED" });
    assert.equal(calls, 1);
  }
});

test("repository claim is one conditional SQL write; generic writer cannot mutate snapshots", async () => {
  const f = await fixture();
  const data = await f.service.prepare("owner", { idea });
  const row = f.store.rows.get(data.productionPackage.packageId)!;
  const calls: Prisma.GenerationUpdateManyArgs[] = [];
  const database = { generation: { updateMany: async (args: Prisma.GenerationUpdateManyArgs) => { calls.push(args); return { count: 0 }; } } } as unknown as Prisma.TransactionClient;
  assert.equal(await new ProductionPackageRepository(database).claim(row), false);
  assert.deepEqual(calls[0].where, { id: row.id, userId: "owner", version: 1, status: "queued", architectureVersion: "production-package-v1", productionPackageJson: { equals: row.productionPackageJson } });
  await new GenerationRepository(database).updateOwned(row.id, "owner", 1, { productionPackageJson: {} });
  assert.deepEqual(calls[1].where?.architectureVersion, { not: "production-package-v1" });
});


test("obsolete contracts, unapproved states and low scores are rejected before submission", async () => {
  for (const change of ["contract", "pending", "score", "checks", "schema", "rowVersion"]) {
    const f = await fixture();
    const data = await f.service.prepare("owner", { idea });
    const row = f.store.rows.get(data.productionPackage.packageId)!;
    const snapshot = ProductionPackageSchema.parse(row.productionPackageJson);
    const stored = JSON.parse(JSON.stringify(snapshot));
    if (change === "contract") stored.contractVersion = "obsolete";
    if (change === "pending") stored.gate.state = "pending";
    if (change === "score") stored.gate.score = 74;
    if (change === "checks") stored.gate.checks = [];
    if (change === "schema") row.schemaVersion = 0;
    if (change === "rowVersion") row.version = 2;
    row.productionPackageJson = stored;
    // Simulate an older server snapshot, rather than merely corrupting its hash.
    row.promptVersionJson = { digest: packageDigest(stored) };
    await assert.rejects(f.service.generate("owner", data.productionPackage), {
      code: change === "score" ? "PACKAGE_NOT_APPROVED" : change === "schema" ? "PACKAGE_VERSION_STALE" : change === "rowVersion" ? "PACKAGE_CONSUMED" : "PACKAGE_INVALID",
    });
    assert.equal(f.prompts.length, 0);
  }
});

test("JSON object key reordering does not invalidate a persisted snapshot", async () => {
  const f = await fixture();
  const data = await f.service.prepare("owner", { idea });
  const row = f.store.rows.get(data.productionPackage.packageId)!;
  const snapshot = ProductionPackageSchema.parse(row.productionPackageJson);
  row.productionPackageJson = Object.fromEntries(Object.entries(snapshot).reverse()) as Prisma.JsonObject;
  await f.service.generate("owner", data.productionPackage);
  assert.equal(f.prompts.length, 1);
});
