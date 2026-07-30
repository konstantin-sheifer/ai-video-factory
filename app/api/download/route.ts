import { NextResponse } from "next/server";
import {
  DownloadProviderError,
  downloadVideo,
} from "@/lib/providers/download";
import { SafeMediaError } from "@/lib/security/media-policy";

type DownloadRequest = {
  videoUrl?: string;
  fileName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DownloadRequest;

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required." },
        { status: 400 }
      );
    }

    const result = await downloadVideo({
      videoUrl: body.videoUrl,
      fileName: body.fileName,
    });

    return new NextResponse(result.blob, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof DownloadProviderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof SafeMediaError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Download route error:", error);

    return NextResponse.json(
      { error: "Failed to download video." },
      { status: 500 }
    );
  }
}
