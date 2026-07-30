import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  fetchSafeMedia,
  SafeMediaError,
} from "@/lib/security/media-policy";

type PersistRequest = {
  url?: string;
  fileName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PersistRequest;

    const sourceUrl = String(body.url || "").trim();

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Missing video URL." },
        { status: 400 }
      );
    }

    const { buffer } = await fetchSafeMedia(sourceUrl);

    const safeFileName =
      body.fileName?.replace(/[^a-zA-Z0-9._-]/g, "") ||
      `video-${Date.now()}.mp4`;

    const finalFileName = safeFileName.endsWith(".mp4")
      ? safeFileName
      : `${safeFileName}.mp4`;

    const outputDir = path.join(process.cwd(), "public", "generated-videos");
    await mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, finalFileName);
    await writeFile(outputPath, buffer);

    return NextResponse.json({
      status: "SAVED",
      url: `/generated-videos/${finalFileName}`,
      fileName: finalFileName,
      size: buffer.length,
    });
  } catch (error) {
    if (error instanceof SafeMediaError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Persist asset error:", error);

    return NextResponse.json(
      { error: "Failed to persist asset." },
      { status: 500 }
    );
  }
}
