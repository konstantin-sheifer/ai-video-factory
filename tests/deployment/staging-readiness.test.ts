import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { renderVideo } from "../../lib/providers/render";
import { createSubtitles } from "../../lib/providers/subtitles";
import { createVideo } from "../../lib/providers/video";
import { createVoice } from "../../lib/providers/voice";

const MOCK_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

test("Render uses origin-relative Clerk routes and preserves protected returns", async () => {
  const [manifest, proxy, signInPage, signUpPage, clientRedirect] = await Promise.all([
    readFile(path.join(process.cwd(), "render.yaml"), "utf8"),
    readFile(path.join(process.cwd(), "proxy.ts"), "utf8"),
    readFile(
      path.join(process.cwd(), "app", "sign-in", "[[...sign-in]]", "page.tsx"),
      "utf8"
    ),
    readFile(
      path.join(process.cwd(), "app", "sign-up", "[[...sign-up]]", "page.tsx"),
      "utf8"
    ),
    readFile(
      path.join(process.cwd(), "app", "components", "auth-session-redirect.tsx"),
      "utf8"
    ),
  ]);

  assert.match(
    manifest,
    /NEXT_PUBLIC_CLERK_SIGN_IN_URL\s+value: \/sign-in/
  );
  assert.match(
    manifest,
    /NEXT_PUBLIC_CLERK_SIGN_UP_URL\s+value: \/sign-up/
  );
  assert.match(
    manifest,
    /NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL\s+value: \/dashboard/
  );
  assert.match(
    manifest,
    /NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL\s+value: \/dashboard/
  );
  assert.doesNotMatch(manifest, /localhost:3000/);
  assert.doesNotMatch(manifest, /aivf-web\.onrender\.com/);
  assert.match(proxy, /"\/loading\(\.\*\)"/);
  assert.match(proxy, /await auth\.protect\(\)/);
  assert.match(signInPage, /const \{ userId \} = await auth\(\)/);
  assert.match(signInPage, /if \(userId\) \{\s+redirect\("\/dashboard"\)/);
  assert.match(signInPage, /<SignIn/);
  assert.match(signInPage, /<AuthSessionRedirect \/>/);
  assert.match(signUpPage, /const \{ userId \} = await auth\(\)/);
  assert.match(signUpPage, /if \(userId\) \{\s+redirect\("\/dashboard"\)/);
  assert.match(signUpPage, /<SignUp/);
  assert.match(signUpPage, /<AuthSessionRedirect \/>/);
  assert.match(clientRedirect, /const \{ isLoaded, isSignedIn \} = useAuth\(\)/);
  assert.match(clientRedirect, /router\.replace\(getAuthenticatedDestination/);
  assert.match(clientRedirect, /getAuthenticatedDestination\(window\.location\)/);
});

test("explicit staging providers preserve mock contracts without media writes", async () => {
  const previousEnvironment = {
    VIDEO_PROVIDER: process.env.VIDEO_PROVIDER,
    VOICE_PROVIDER: process.env.VOICE_PROVIDER,
    SUBTITLE_PROVIDER: process.env.SUBTITLE_PROVIDER,
    RENDER_PROVIDER: process.env.RENDER_PROVIDER,
  };

  process.env.VIDEO_PROVIDER = "mock";
  process.env.VOICE_PROVIDER = "mock";
  process.env.SUBTITLE_PROVIDER = "mock";
  process.env.RENDER_PROVIDER = "mock";

  const generatedDirectory = path.join(process.cwd(), "public", "generated-videos");
  const finalDirectory = path.join(process.cwd(), "public", "final-videos");
  const beforeGenerated = await listDirectory(generatedDirectory);
  const beforeFinal = await listDirectory(finalDirectory);

  try {
    const video = await createVideo("staging fixture prompt");
    const voice = await createVoice("staging fixture voiceover");
    const subtitles = await createSubtitles("A stable staging subtitle.");
    const render = await renderVideo({
      videoUrl: video.videoUrl,
      audioUrl: voice.audioUrl,
      subtitles: subtitles.subtitles,
    });

    assert.equal(video.provider, "mock");
    assert.equal(video.mock, true);
    assert.equal(video.videoUrl, MOCK_VIDEO_URL);
    assert.equal(voice.provider, "mock");
    assert.equal(voice.mock, true);
    assert.equal(subtitles.provider, "mock");
    assert.equal(subtitles.mock, true);
    assert.equal(render.provider, "mock");
    assert.equal(render.mock, true);
    assert.equal(render.finalVideoUrl, MOCK_VIDEO_URL);
    assert.deepEqual(await listDirectory(generatedDirectory), beforeGenerated);
    assert.deepEqual(await listDirectory(finalDirectory), beforeFinal);
  } finally {
    restoreEnvironment(previousEnvironment);
  }
});

async function listDirectory(directory: string) {
  try {
    return (await readdir(directory)).sort();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

function restoreEnvironment(environment: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
