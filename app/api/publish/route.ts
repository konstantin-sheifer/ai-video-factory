import { NextResponse } from "next/server";
import { publishVideo } from "@/lib/providers/publish";

type PublishRequest = {
  videoUrl?: string;
  platforms?: string[];
  caption?: string;
  projectId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublishRequest;

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required." },
        { status: 400 }
      );
    }

    if (!body.platforms?.length) {
      return NextResponse.json(
        { error: "At least one platform is required." },
        { status: 400 }
      );
    }

    const result = await publishVideo({
      videoUrl: body.videoUrl,
      platforms: body.platforms,
      caption: body.caption,
      projectId: body.projectId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Publish route error:", error);

    return NextResponse.json(
      { error: "Failed to publish video." },
      { status: 500 }
    );
  }
}