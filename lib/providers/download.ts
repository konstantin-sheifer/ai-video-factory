import { readFile } from "fs/promises";
import path from "path";

export type DownloadProviderInput = {
  videoUrl: string;
  fileName?: string;
};

export type DownloadProviderResult = {
  provider: "mock" | "storage";
  mock: boolean;
  status: "SUCCEEDED" | "FAILED";
  fileName: string;
  blob: Blob;
};

export async function downloadVideo(
  input: DownloadProviderInput
): Promise<DownloadProviderResult> {
  const provider = process.env.DOWNLOAD_PROVIDER || "mock";

  if (provider === "mock") {
    return mockDownload(input);
  }

  if (provider === "storage") {
    return storageDownload(input);
  }

  throw new Error(`Unsupported download provider: ${provider}`);
}

async function mockDownload(
  input: DownloadProviderInput
): Promise<DownloadProviderResult> {
  return downloadFromSource(input, "mock", true);
}

async function storageDownload(
  input: DownloadProviderInput
): Promise<DownloadProviderResult> {
  return downloadFromSource(input, "storage", false);
}

async function downloadFromSource(
  input: DownloadProviderInput,
  provider: "mock" | "storage",
  mock: boolean
): Promise<DownloadProviderResult> {
  const blob = isLocalPublicVideo(input.videoUrl)
    ? await readLocalPublicVideo(input.videoUrl)
    : await fetchRemoteVideo(input.videoUrl);

  return {
    provider,
    mock,
    status: "SUCCEEDED",
    fileName: input.fileName || "ai-video-factory-video.mp4",
    blob,
  };
}

function isLocalPublicVideo(videoUrl: string) {
  return (
    videoUrl.startsWith("/generated-videos/") ||
    videoUrl.startsWith("/final-videos/")
  );
}

async function readLocalPublicVideo(videoUrl: string) {
  const cleanPath = videoUrl.replace(/^\/+/, "");

  if (
    !cleanPath.startsWith("generated-videos/") &&
    !cleanPath.startsWith("final-videos/")
  ) {
    throw new Error("Invalid local video path.");
  }

  const filePath = path.join(process.cwd(), "public", cleanPath);
  const buffer = await readFile(filePath);

  return new Blob([buffer], {
    type: "video/mp4",
  });
}

async function fetchRemoteVideo(videoUrl: string) {
  const response = await fetch(videoUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch video file. Status: ${response.status}`);
  }

  return response.blob();
}
