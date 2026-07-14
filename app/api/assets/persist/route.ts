import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

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

    const response = await fetch(sourceUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to download remote asset.",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
    console.error("Persist asset error:", error);

    return NextResponse.json(
      { error: "Failed to persist asset." },
      { status: 500 }
    );
  }
}