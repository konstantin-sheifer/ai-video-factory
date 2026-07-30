import { readFile, realpath, stat } from "fs/promises";
import path from "path";
import { fetchSafeMedia } from "@/lib/security/media-policy";

const FALLBACK_FILE_NAME = "ai-video-factory-video.mp4";

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

export class DownloadProviderError extends Error {
  readonly status: 400 | 404;

  constructor(message: string, status: 400 | 404) {
    super(message);
    this.name = "DownloadProviderError";
    this.status = status;
  }
}

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
    fileName: sanitizeFileName(input.fileName),
    blob,
  };
}

function isLocalPublicVideo(videoUrl: string) {
  return (
    videoUrl.startsWith("/") ||
    videoUrl.startsWith("\\") ||
    videoUrl.includes("\\") ||
    path.win32.isAbsolute(videoUrl)
  );
}

async function readLocalPublicVideo(videoUrl: string) {
  const decodedPath = decodeLocalPath(videoUrl);
  const allowedDirectories = [
    {
      urlPrefix: "/generated-videos/",
      basePath: path.resolve(process.cwd(), "public", "generated-videos"),
    },
    {
      urlPrefix: "/final-videos/",
      basePath: path.resolve(process.cwd(), "public", "final-videos"),
    },
  ];

  const allowedDirectory = allowedDirectories.find(({ urlPrefix }) =>
    decodedPath.startsWith(urlPrefix)
  );

  if (!allowedDirectory) {
    throw new DownloadProviderError("Invalid local video path.", 400);
  }

  const relativePath = decodedPath.slice(allowedDirectory.urlPrefix.length);

  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new DownloadProviderError("Invalid local video path.", 400);
  }

  const resolvedPath = path.resolve(allowedDirectory.basePath, relativePath);

  if (!isStrictlyContained(allowedDirectory.basePath, resolvedPath)) {
    throw new DownloadProviderError("Invalid local video path.", 400);
  }

  try {
    const [realBasePath, realFilePath, fileStats] = await Promise.all([
      realpath(allowedDirectory.basePath),
      realpath(resolvedPath),
      stat(resolvedPath),
    ]);

    if (
      !isStrictlyContained(realBasePath, realFilePath) ||
      !fileStats.isFile()
    ) {
      throw new DownloadProviderError("Invalid local video path.", 400);
    }

    const buffer = await readFile(realFilePath);

    return new Blob([buffer], {
      type: "video/mp4",
    });
  } catch (error) {
    if (error instanceof DownloadProviderError) {
      throw error;
    }

    throw new DownloadProviderError("Video file not found.", 404);
  }
}

function decodeLocalPath(videoUrl: string) {
  if (videoUrl.includes("\0") || videoUrl.includes("\\")) {
    throw new DownloadProviderError("Invalid local video path.", 400);
  }

  try {
    const decodedPath = decodeURIComponent(videoUrl.split(/[?#]/, 1)[0]);

    if (decodedPath.includes("\0") || decodedPath.includes("\\")) {
      throw new DownloadProviderError("Invalid local video path.", 400);
    }

    return decodedPath;
  } catch (error) {
    if (error instanceof DownloadProviderError) {
      throw error;
    }

    throw new DownloadProviderError("Invalid local video path.", 400);
  }
}

function isStrictlyContained(basePath: string, targetPath: string) {
  const relativePath = path.relative(basePath, targetPath);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function sanitizeFileName(fileName?: string) {
  const candidate = (fileName || FALLBACK_FILE_NAME)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\\/g, "/");
  const baseName = path.posix.basename(candidate);
  const safeName = baseName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);

  return safeName || FALLBACK_FILE_NAME;
}

async function fetchRemoteVideo(videoUrl: string) {
  const { buffer, contentType } = await fetchSafeMedia(videoUrl);

  return new Blob([Uint8Array.from(buffer)], {
    type: contentType || "video/mp4",
  });
}
