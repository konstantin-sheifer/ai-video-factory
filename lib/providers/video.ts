import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import RunwayML from "@runwayml/sdk";

export type VideoProviderResult = {
  provider: "mock" | "runway";
  mock: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  taskId: string;
  videoUrl: string;
  originalVideoUrl?: string;
};

const MOCK_VIDEOS = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
  "https://media.w3.org/2010/05/bunny/trailer.mp4",
];

export async function createVideo(prompt: string): Promise<VideoProviderResult> {
  const provider = process.env.VIDEO_PROVIDER || "mock";

  console.log("VIDEO PROVIDER:", provider);

  if (provider === "mock") {
    return createMockVideo();
  }

  if (provider === "runway") {
    return createRunwayVideo(prompt);
  }

  throw new Error(`Unsupported video provider: ${provider}`);
}

function createMockVideo(): VideoProviderResult {
  const index = Math.floor(Math.random() * MOCK_VIDEOS.length);

  console.log("MOCK VIDEO USED:", MOCK_VIDEOS[index]);

  return {
    provider: "mock",
    mock: true,
    status: "SUCCEEDED",
    taskId: `mock-video-task-${Date.now()}-${index}`,
    videoUrl: MOCK_VIDEOS[index],
  };
}

async function createRunwayVideo(prompt: string): Promise<VideoProviderResult> {
  console.log("RUNWAY FUNCTION STARTED");
  console.log("PROMPT:", prompt);

  if (!process.env.RUNWAY_API_KEY) {
    throw new Error("RUNWAY_API_KEY is missing.");
  }

  const client = new RunwayML({
    apiKey: process.env.RUNWAY_API_KEY,
  });

  console.log("RUNWAY TEXT TO VIDEO TASK CREATE STARTED");
  console.log("RUNWAY TEXT MODEL: gen4.5");

  const task = await client.textToVideo
    .create({
      model: "gen4.5",
      promptText: prompt,
      ratio: "720:1280",
      duration: 10,
    })
    .waitForTaskOutput();

  console.log("RUNWAY TASK FINISHED:", task.id);
  console.log("RUNWAY TASK OUTPUT:", task.output);

  const runwayVideoUrl = Array.isArray(task.output) ? String(task.output[0] || "") : "";

  if (!runwayVideoUrl) {
    throw new Error("Runway finished, but no video URL was returned.");
  }

  const persistedVideoUrl = await persistRemoteVideo(runwayVideoUrl, task.id);

  return {
    provider: "runway",
    mock: false,
    status: "SUCCEEDED",
    taskId: task.id,
    videoUrl: persistedVideoUrl,
    originalVideoUrl: runwayVideoUrl,
  };
}

async function persistRemoteVideo(remoteUrl: string, taskId: string) {
  console.log("PERSISTING RUNWAY VIDEO:", remoteUrl);

  const response = await fetch(remoteUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to persist Runway video. Status: ${response.status}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputDir = path.join(process.cwd(), "public", "generated-videos");
  await mkdir(outputDir, { recursive: true });

  const safeTaskId = taskId.replace(/[^a-zA-Z0-9._-]/g, "");
  const fileName = `runway-${safeTaskId || randomUUID()}-${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, fileName);

  await writeFile(outputPath, buffer);

  const localUrl = `/generated-videos/${fileName}`;

  console.log("RUNWAY VIDEO PERSISTED:", localUrl);
  console.log("RUNWAY VIDEO SIZE:", buffer.length);

  return localUrl;
}