import { execFile } from "child_process";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

export type SubtitleItem = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

export type TimelineItem = {
  id?: number;
  scene?: number;
  start: number;
  end: number;
  duration?: number;
  visual?: string;
  voiceover?: string;
  subtitle?: string;
};

export type RenderProviderInput = {
  videoUrl: string;
  audioUrl?: string;
  subtitles?: SubtitleItem[];
  timeline?: TimelineItem[];
  subtitlesEnabled?: boolean;
  backgroundMusicEnabled?: boolean;
  renderStyle?: "cinematic" | "viral" | "kids" | "dramatic";
};

export type RenderProviderResult = {
  provider: "mock" | "remotion" | "ffmpeg";
  mock: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  renderId: string;
  renderStyle: string;
  finalVideoUrl: string;
  metadata: {
    videoUrl: string;
    audioUrl: string;
    subtitlesEnabled: boolean;
    backgroundMusicEnabled: boolean;
    subtitlesCount: number;
    timelineCount: number;
    estimatedDuration: number;
    format: "mp4";
    resolution: "720x1280";
  };
  message?: string;
};

const execFileAsync = promisify(execFile);

const SUBTITLE_DELAY_SECONDS = 0.45;

export async function renderVideo(
  input: RenderProviderInput
): Promise<RenderProviderResult> {
  const provider = process.env.RENDER_PROVIDER || "ffmpeg";

  if (provider === "mock") {
    return createMockRender(input);
  }

  if (provider === "remotion") {
    return createRemotionRender(input);
  }

  if (provider === "ffmpeg") {
    return createFfmpegRender(input);
  }

  throw new Error(`Unsupported render provider: ${provider}`);
}

function createMockRender(input: RenderProviderInput): RenderProviderResult {
  return {
    provider: "mock",
    mock: true,
    status: "SUCCEEDED",
    ...createRenderPayload(input, input.videoUrl),
  };
}

function createRemotionRender(input: RenderProviderInput): RenderProviderResult {
  return {
    provider: "remotion",
    mock: true,
    status: "PENDING",
    message: "Remotion render provider is prepared but not connected yet.",
    ...createRenderPayload(input, input.videoUrl),
  };
}

async function createFfmpegRender(
  input: RenderProviderInput
): Promise<RenderProviderResult> {
  const renderId = crypto.randomUUID();
  const resolvedFfmpegPath = getFfmpegPath();

  const videoFilePath = await resolveAssetToFile(input.videoUrl, "video", renderId);
  const audioFilePath = input.audioUrl
    ? await resolveAssetToFile(input.audioUrl, "audio", renderId)
    : "";

  const outputDir = path.join(process.cwd(), "public", "final-videos");
  await mkdir(outputDir, { recursive: true });

  const outputFileName = `final-${renderId}-${Date.now()}.mp4`;
  const outputFilePath = path.join(outputDir, outputFileName);

  const shouldBurnSubtitles =
    input.subtitlesEnabled !== false && Boolean(input.subtitles?.length);

  const subtitlesFilterPath = shouldBurnSubtitles
    ? await writeAssSubtitlesToProjectFile(input.subtitles || [], renderId)
    : "";

  const args = buildFfmpegArgs({
    videoFilePath,
    audioFilePath,
    subtitlesFilterPath,
    outputFilePath,
  });

  console.log("FFMPEG PATH:", resolvedFfmpegPath);
  console.log("FFMPEG VIDEO INPUT:", videoFilePath);
  console.log("FFMPEG AUDIO INPUT:", audioFilePath || "none");
  console.log("FFMPEG SUBTITLES FILTER:", subtitlesFilterPath || "none");
  console.log("FFMPEG OUTPUT:", outputFilePath);

  await execFileAsync(resolvedFfmpegPath, args);

  const finalVideoUrl = `/final-videos/${outputFileName}`;

  console.log("FINAL VIDEO RENDERED:", finalVideoUrl);

  return {
    provider: "ffmpeg",
    mock: false,
    status: "SUCCEEDED",
    ...createRenderPayload(input, finalVideoUrl, renderId),
    message: shouldBurnSubtitles
      ? "Final MP4 rendered with voiceover audio and burned subtitles."
      : "Final MP4 rendered with voiceover audio.",
  };
}

function buildFfmpegArgs({
  videoFilePath,
  audioFilePath,
  subtitlesFilterPath,
  outputFilePath,
}: {
  videoFilePath: string;
  audioFilePath: string;
  subtitlesFilterPath: string;
  outputFilePath: string;
}) {
  const args = ["-y", "-i", videoFilePath];

  if (audioFilePath) {
    args.push("-i", audioFilePath);
  }

  if (audioFilePath) {
    args.push("-map", "0:v:0", "-map", "1:a:0");
  } else {
    args.push("-map", "0:v:0");
  }

  if (subtitlesFilterPath) {
    args.push("-vf", `ass=${subtitlesFilterPath}`);
    args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18");
  } else {
    args.push("-c:v", "copy");
  }

  if (audioFilePath) {
    args.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  }

  args.push("-movflags", "+faststart", outputFilePath);

  return args;
}

function getFfmpegPath() {
  const directPath = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  );

  if (existsSync(directPath)) {
    return directPath;
  }

  throw new Error(`ffmpeg executable was not found. Checked: ${directPath}`);
}

function createRenderPayload(
  input: RenderProviderInput,
  finalVideoUrl: string,
  existingRenderId?: string
) {
  return {
    renderId: existingRenderId || crypto.randomUUID(),
    renderStyle: input.renderStyle || "viral",
    finalVideoUrl,
    metadata: createMetadata(input),
  };
}

function createMetadata(input: RenderProviderInput) {
  return {
    videoUrl: input.videoUrl,
    audioUrl: input.audioUrl || "",
    subtitlesEnabled: input.subtitlesEnabled ?? true,
    backgroundMusicEnabled: input.backgroundMusicEnabled ?? true,
    subtitlesCount: input.subtitles?.length || 0,
    timelineCount: input.timeline?.length || 0,
    estimatedDuration: getEstimatedDuration(input),
    format: "mp4" as const,
    resolution: "720x1280" as const,
  };
}

function getEstimatedDuration(input: RenderProviderInput) {
  if (input.timeline?.length) {
    return Math.max(...input.timeline.map((item) => item.end));
  }

  if (input.subtitles?.length) {
    return Math.max(...input.subtitles.map((item) => item.end));
  }

  return 10;
}

async function resolveAssetToFile(
  assetUrl: string,
  kind: "video" | "audio",
  renderId: string
) {
  const cleanUrl = assetUrl.trim();

  if (!cleanUrl) {
    throw new Error(`Missing ${kind} URL.`);
  }

  if (cleanUrl.startsWith("/")) {
    const publicPath = cleanUrl.replace(/^\/+/, "");
    const filePath = path.join(process.cwd(), "public", publicPath);

    await readFile(filePath);
    return filePath;
  }

  if (cleanUrl.startsWith("data:")) {
    return writeDataUrlToTempFile(cleanUrl, kind, renderId);
  }

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return downloadRemoteAssetToTempFile(cleanUrl, kind, renderId);
  }

  throw new Error(`Unsupported ${kind} URL format.`);
}

async function writeDataUrlToTempFile(
  dataUrl: string,
  kind: "video" | "audio",
  renderId: string
) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error(`Invalid ${kind} data URL.`);
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = getExtensionFromMimeType(mimeType, kind);
  const buffer = Buffer.from(base64, "base64");

  const tempDir = path.join(os.tmpdir(), "ai-video-factory-renders");
  await mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, `${kind}-${renderId}-${Date.now()}.${extension}`);
  await writeFile(filePath, buffer);

  return filePath;
}

async function downloadRemoteAssetToTempFile(
  remoteUrl: string,
  kind: "video" | "audio",
  renderId: string
) {
  const response = await fetch(remoteUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download ${kind} asset. Status: ${response.status}`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const extension = getExtensionFromMimeType(contentType, kind);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tempDir = path.join(os.tmpdir(), "ai-video-factory-renders");
  await mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, `${kind}-${renderId}-${Date.now()}.${extension}`);
  await writeFile(filePath, buffer);

  return filePath;
}

async function writeAssSubtitlesToProjectFile(
  subtitles: SubtitleItem[],
  renderId: string
) {
  const subtitleDir = path.join(process.cwd(), "public", "render-subtitles");
  await mkdir(subtitleDir, { recursive: true });

  const fileName = `subtitles-${renderId}-${Date.now()}.ass`;
  const filePath = path.join(subtitleDir, fileName);
  const content = createAssSubtitles(subtitles);

  await writeFile(filePath, content, "utf8");

  return `public/render-subtitles/${fileName}`;
}

function createAssSubtitles(subtitles: SubtitleItem[]) {
  const sortedSubtitles = [...subtitles]
    .filter((subtitle) => subtitle.text?.trim())
    .sort((a, b) => a.start - b.start);

  const events = sortedSubtitles
    .map((subtitle) => {
      const start = formatAssTime(Math.max(0, subtitle.start + SUBTITLE_DELAY_SECONDS));
      const end = formatAssTime(
        Math.max(
          subtitle.start + SUBTITLE_DELAY_SECONDS + 0.5,
          subtitle.end + SUBTITLE_DELAY_SECONDS
        )
      );
      const text = wrapSubtitleForAss(escapeAssText(subtitle.text));

      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,42,&H00FFFFFF,&H00FFFFFF,&H99000000,&H99000000,-1,0,0,0,100,100,0,0,1,4,1,2,90,90,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;
}

function formatAssTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds % 1) * 100);

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}.${String(centiseconds).padStart(2, "0")}`;
}

function escapeAssText(text: string) {
  return text
    .replace(/\r?\n/g, "\\N")
    .replace(/[{}]/g, "")
    .trim();
}

function wrapSubtitleForAss(text: string) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= 4) {
    return text;
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > 18) {
      if (current) {
        lines.push(current);
      }

      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3).join("\\N");
}

function getExtensionFromMimeType(mimeType: string, kind: "video" | "audio") {
  const lowerMimeType = mimeType.toLowerCase();

  if (lowerMimeType.includes("mpeg")) return "mp3";
  if (lowerMimeType.includes("wav")) return "wav";
  if (lowerMimeType.includes("ogg")) return "ogg";
  if (lowerMimeType.includes("webm")) return "webm";
  if (lowerMimeType.includes("mp4")) return "mp4";

  return kind === "audio" ? "mp3" : "mp4";
}
