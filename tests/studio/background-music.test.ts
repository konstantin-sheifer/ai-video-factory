import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  backgroundMusicPercentToVolume,
  DEFAULT_BACKGROUND_MUSIC_VOLUME,
  normalizeBackgroundMusicVolume,
} from "../../lib/studio/background-music";
import { renderVideo } from "../../lib/providers/render";

test("background music volume uses a clamped normalized model", () => {
  assert.equal(DEFAULT_BACKGROUND_MUSIC_VOLUME, 0.25);
  assert.equal(normalizeBackgroundMusicVolume(-1), 0);
  assert.equal(normalizeBackgroundMusicVolume(2), 1);
  assert.equal(normalizeBackgroundMusicVolume(Number.NaN), 0.25);
  assert.equal(backgroundMusicPercentToVolume("40"), 0.4);
  assert.equal(backgroundMusicPercentToVolume("-10"), 0);
  assert.equal(backgroundMusicPercentToVolume("250"), 1);
});

test("mock render preserves enabled state and selected volume", async () => {
  const previousProvider = process.env.RENDER_PROVIDER;
  process.env.RENDER_PROVIDER = "mock";

  try {
    const result = await renderVideo({
      videoUrl: "/generated-videos/example.mp4",
      backgroundMusicEnabled: true,
      backgroundMusicVolume: 0.42,
    });
    assert.equal(result.metadata.backgroundMusicEnabled, true);
    assert.equal(result.metadata.backgroundMusicVolume, 0.42);

    const disabledResult = await renderVideo({
      videoUrl: "/generated-videos/example.mp4",
      backgroundMusicEnabled: false,
      backgroundMusicVolume: 4,
    });
    assert.equal(disabledResult.metadata.backgroundMusicEnabled, false);
    assert.equal(disabledResult.metadata.backgroundMusicVolume, 1);
  } finally {
    if (previousProvider === undefined) delete process.env.RENDER_PROVIDER;
    else process.env.RENDER_PROVIDER = previousProvider;
  }
});

test("Studio exposes volume only when music is enabled and preserves preview separation", async () => {
  const studio = await readFile("app/studio/page.tsx", "utf8");
  assert.match(studio, /musicEnabled \? \(/);
  assert.match(studio, /aria-label="Background music volume"/);
  assert.match(studio, /aria-pressed=\{musicEnabled\}/);
  assert.match(studio, /ring-white\/30/);
  assert.match(studio, /bg-cyan-400 ring-cyan-400/);
  assert.match(studio, /backgroundMusicVolume: musicVolume/g);
  assert.match(studio, /settingsJson/);
  assert.match(studio, /persistBackgroundMusicSettings/);
  assert.match(studio, /fetch\("\/api\/projects"/);
  assert.match(
    studio,
    /const isFinalRenderedVideo = activeVideoUrl\.startsWith\("\/final-videos\/"\)/
  );
  assert.match(
    studio,
    /const shouldUseExternalAudio = Boolean\(audioUrl\) && !isFinalRenderedVideo/
  );
});

test("render route normalizes untrusted volume before provider execution", async () => {
  const route = await readFile("app/api/render/route.ts", "utf8");
  assert.match(route, /normalizeBackgroundMusicVolume\(/);
  assert.match(route, /body\.backgroundMusicVolume/);
});
