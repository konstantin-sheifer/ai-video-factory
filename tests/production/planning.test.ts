import assert from "node:assert/strict";
import test from "node:test";
import { createCreativeProducerDecision, CreativeProducerOutputSchema } from "../../lib/ai-brain/creative-producer";
import { buildProductionPlan } from "../../lib/ai-brain/production-plan";
import { createKeyFrames } from "../../lib/ai-brain/visual-development/keyframe-director";
import { createCameraPlan } from "../../lib/ai-brain/visual-development/camera-planner";
import { reviewProductionPackage } from "../../lib/ai-brain/quality-control/quality-controller";
import { ProductionPackageService } from "../../lib/services/production-package-service";
import { MemoryPackageStore, idea } from "./fixtures";

process.env.AI_BRAIN_LIVE = "false";

for (const duration of [10, 30, 60]) {
  test(`actual keyframes and timing reach Camera Planner at ${duration}s`, async () => {
    const plan = await buildProductionPlan(idea, duration);
    const storyboard = plan.aiBrain.storyboard;
    storyboard.frames[1].cameraDirection = "UNIQUE camera direction from source";
    storyboard.frames[1].composition = "UNIQUE physical arrangement";
    const keyframes = createKeyFrames(storyboard);
    const camera = createCameraPlan(keyframes);
    assert.equal(camera.duration, duration);
    assert.equal(camera.shots.length, storyboard.frames.length);
    assert.deepEqual(camera.shots.map(s => s.timeRange), storyboard.frames.map(f => f.timeRange));
    assert.match(camera.shots[1].cameraMove, /UNIQUE camera direction/);
    assert.match(camera.shots[1].framing, /UNIQUE physical arrangement/);
    assert.equal(plan.aiBrain.runwayPackage.duration, duration);
    assert.throws(() => createCameraPlan({ ...keyframes, keyFrames: [] }), /Invalid keyframe/);
    keyframes.keyFrames[0].timeRange.endSecond = 0;
    assert.throws(() => createCameraPlan(keyframes), /Invalid keyframe/);
  });
}

test("quality uses a 100-point scale; critical fixes block even a high average", async () => {
  const plan = await buildProductionPlan(idea, 10);
  const review = reviewProductionPackage(plan.aiBrain);
  assert.equal(review.overallScore, Math.round(review.scores.reduce((n, s) => n + s.score, 0) * 10 / review.scores.length));
  assert.equal(review.canGenerate, true);
  assert.equal(review.approved, true);
  plan.aiBrain.storyboard.frames[0].visualDescription = "weak";
  const failed = reviewProductionPackage(plan.aiBrain);
  assert.ok(failed.overallScore >= 75);
  assert.equal(failed.canGenerate, false);
  assert.equal(failed.approved, false);
});

test("real over-budget adapter output is preserved and rejected, never silently truncated", async () => {
  const store = new MemoryPackageStore();
  const service = new ProductionPackageService(store, buildProductionPlan, async () => { throw new Error("must not submit"); }, () => "mock");
  const result = await service.prepare("owner", { idea });
  assert.ok(result.aiBrain.runwayPackage.promptText.length > 2500);
  assert.match(result.aiBrain.runwayPackage.promptText, /FINAL PAYOFF:/);
  assert.equal(result.canGenerate, false);
  assert.match(result.generationBlockReason, /provider_prompt/);
});

test("unsupported creative duration remains unchanged and produces an explicit rejection", async () => {
  const service = new ProductionPackageService(new MemoryPackageStore(), buildProductionPlan, async () => { throw new Error("must not submit"); }, () => "mock");
  const result = await service.prepare("owner", { idea, duration: 30 });
  assert.equal(result.script.duration, "30 seconds");
  assert.match(result.generationBlockReason, /duration/);
  await assert.rejects(service.generate("owner", result.productionPackage), { code: "DURATION_INCOMPATIBLE" });
});

test("live model errors and malformed output do not become fallback approval", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "local-test-only";
  process.env.AI_BRAIN_LIVE = "true";
  let calls = 0;
  try {
    for (const value of [null, {}, { recommendation: { shouldGenerate: "true" } }]) {
      globalThis.fetch = async () => { calls++; return Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] }); };
      await assert.rejects(createCreativeProducerDecision({ rawIdea: idea, duration: 10 }), /production is blocked/);
    }
    globalThis.fetch = async () => { throw new Error("provider unavailable"); };
    await assert.rejects(createCreativeProducerDecision({ rawIdea: idea, duration: 10 }), /production is blocked/);
    assert.equal(calls, 3);
    assert.equal(CreativeProducerOutputSchema.safeParse({}).success, false);
  } finally {
    globalThis.fetch = oldFetch;
    process.env.AI_BRAIN_LIVE = "false";
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
  }
});
