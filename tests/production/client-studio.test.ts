import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { requireApprovedPackage, generatePackageVideo } from "../../lib/production/client";
import { productionPackageHandlers } from "../../lib/http/production-package-handlers";
import { ProductionPackageService } from "../../lib/services/production-package-service";
import { backgroundMusicPercentToVolume } from "../../lib/studio/background-music";
import { MemoryPackageStore, approvedFixture, idea } from "./fixtures";
import { pageHandler, jsxTrees, subtitleClick } from "./ui-harness";

const pages = ["app/loading/page.tsx", "app/studio/page.tsx"];
const noop = () => {};

async function runPage(file: string, reject: boolean) {
  const store = new MemoryPackageStore();
  const plan = await approvedFixture();
  if (reject) plan.aiBrain.qualityReview.canGenerate = false;
  const providerPrompts: string[] = [];
  const submitted: unknown[] = [];
  const events: string[] = [];
  const service = new ProductionPackageService(store, async () => plan, async prompt => {
    providerPrompts.push(prompt);
    return { provider: "mock", mock: true, status: "SUCCEEDED", taskId: "fixture", videoUrl: "/generated-videos/fixture.mp4" };
  }, () => "mock");
  const routes = productionPackageHandlers(async () => ({ internalUserId: "owner" }), service);
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    events.push(url);
    if (url === "/api/script") return routes.script(new Request(`http://localhost${url}`, init));
    if (url === "/api/video") {
      submitted.push(JSON.parse(String(init?.body)));
      return routes.video(new Request(`http://localhost${url}`, init));
    }
    if (url === "/api/timeline") return Response.json({ timeline: [] });
    if (url === "/api/voice") return Response.json({ audioUrl: "fixture-audio", provider: "mock" });
    if (url === "/api/transcribe" || url === "/api/subtitles") return Response.json({ subtitles: [] });
    if (url === "/api/render") return Response.json({ provider: "mock", finalVideoUrl: "/generated-videos/fixture.mp4" });
    if (url === "/api/projects") return Response.json({ project: { id: "saved-project" } });
    throw new Error(`Unexpected request: ${url}`);
  };
  const statuses: string[] = [];
  const scope: Record<string, unknown> = {
    requireApprovedPackage, generatePackageVideo, fetch: fakeFetch,
    SESSION_KEY: "session", localStorage: { removeItem: noop },
    setStage: noop, setErrorMessage: (s: string) => statuses.push(s),
    setPublishStatus: (s: string) => statuses.push(s), setRenderState: noop,
    setLoading: noop, setDownloadStatus: noop, clearPlaybackState: noop,
    setScript: noop, setTimeline: noop, setProjectSettings: noop,
    setProjectId: noop, setVideoUrl: noop, setAudioUrl: noop, setSubtitles: noop, setFinalVideoUrl: noop,
    saveGenerationToDatabase: async () => {}, saveProjectToLocalLibrary: noop, saveSession: noop,
    markQueueItemAsVideo: noop, setProgress: noop, checkRenderStatus: async () => {},
    voiceStyle: "cinematic", subtitlesEnabled: true, voiceoverEnabled: true, musicEnabled: false, musicVolume: 0.25,
    window: { setTimeout: noop, history: { replaceState: noop } }, router: { replace: noop },
    console: { error: noop }, Error,
  };
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch;
  try { await pageHandler(file, "generatePipeline", scope).invoke(idea); }
  finally { globalThis.fetch = previousFetch; }
  return { providerPrompts, submitted, events, statuses, plan };
}

for (const file of pages) {
  test(`${file}: actual page handler stops before timeline/video when package is rejected`, async () => {
    const result = await runPage(file, true);
    assert.deepEqual(result.events, ["/api/script"]);
    assert.equal(result.providerPrompts.length, 0);
    assert.ok(result.statuses.some(s => s.includes("Production blocked")));
  });
  test(`${file}: actual page handler uses the saved approved package and no browser prompt`, async () => {
    const result = await runPage(file, false);
    assert.deepEqual(result.providerPrompts, [result.plan.aiBrain.runwayPackage.promptText]);
    assert.equal(result.submitted.length, 1);
    assert.deepEqual(Object.keys(result.submitted[0] as object).sort(), ["packageId", "version"]);
    assert.ok(result.events.includes("/api/projects"));
  });
}

test("client refuses missing approval, missing version and HTTP errors before video submission", () => {
  assert.throws(() => requireApprovedPackage(new Response(), {}));
  assert.throws(() => requireApprovedPackage(new Response(), { canGenerate: true, generationBlocked: false, productionPackage: { packageId: "x" } }));
  assert.throws(() => requireApprovedPackage(new Response(null, { status: 500 }), { canGenerate: true, generationBlocked: false }));
});

test("Studio and Loading JSX/layout remain byte-identical to cb485bb", () => {
  for (const file of pages) {
    const original = execFileSync("git", ["show", `cb485bb:${file}`], { encoding: "utf8" });
    assert.deepEqual(jsxTrees(readFileSync(file, "utf8")), jsxTrees(original));
  }
});

test("actual Download preserves source preview; voice and music toggles still respond afterwards", async () => {
  const calls: string[] = [];
  const audio = { currentTime: 0, volume: 1, pause: () => calls.push("pause"), play: async () => { calls.push("play"); } };
  const state = { voice: true, music: false, volume: 0.25, subtitle: true };
  const scope: Record<string, unknown> = {
    activeVideoUrl: "/generated-videos/source.mp4", videoUrl: "/generated-videos/source.mp4", finalVideoUrl: "",
    downloading: false, audioUrl: "audio", subtitles: [], timeline: [],
    subtitlesEnabled: true, musicEnabled: false, musicVolume: 0.25,
    voiceoverEnabled: true, audioRef: { current: audio },
    videoRef: { current: { currentTime: 3, volume: 0.7, muted: false, paused: false, ended: false } },
    setVideoUrl: () => assert.fail("Download changed source preview"),
    setFinalVideoUrl: () => assert.fail("Download switched preview to final MP4"),
    setDownloading: noop, setPublishStatus: noop, setDownloadStatus: noop,
    setSubtitlesEnabled: (v: boolean) => { state.subtitle = v; },
    setVoiceoverEnabled: (v: boolean) => { state.voice = v; },
    setMusicEnabled: (v: boolean) => { state.music = v; },
    setMusicVolume: (v: number) => { state.volume = v; },
    backgroundMusicPercentToVolume,
    persistBackgroundMusicSettings: async () => {}, persistBackgroundMusicSession: noop,
    fetch: async (url: string, init: RequestInit) => {
      calls.push(url);
      if (url === "/api/render") return Response.json({ finalVideoUrl: "/final-videos/export.mp4" });
      assert.equal(JSON.parse(String(init.body)).videoUrl, "/final-videos/export.mp4");
      return new Response("fixture MP4");
    },
    URL: { createObjectURL: () => "blob:fixture", revokeObjectURL: noop },
    document: { createElement: () => ({ click: () => calls.push("download-click") }), body: { appendChild: noop, removeChild: noop } },
    console: { error: (error: unknown) => assert.fail(String(error)) },
  };
  const file = "app/studio/page.tsx";
  const download = pageHandler(file, "downloadVideo", scope);
  await download.invoke();
  assert.ok(calls.includes("download-click"));
  assert.equal(download.context.activeVideoUrl, "/generated-videos/source.mp4");
  assert.equal(download.context.finalVideoUrl, "");
  await pageHandler(file, "toggleVoiceover", scope).invoke();
  assert.equal(state.voice, false);
  scope.voiceoverEnabled = false;
  await pageHandler(file, "toggleVoiceover", scope).invoke();
  assert.equal(state.voice, true);
  assert.ok(calls.includes("play"));
  assert.equal(audio.currentTime, 3);
  await pageHandler(file, "toggleMusic", scope).invoke();
  assert.equal(state.music, true);
  await pageHandler(file, "changeMusicVolume", scope).invoke("40");
  assert.equal(state.volume, 0.4);
  subtitleClick(file, scope);
  assert.equal(state.subtitle, false);
  scope.subtitlesEnabled = false;
  subtitleClick(file, scope);
  assert.equal(state.subtitle, true);
});
