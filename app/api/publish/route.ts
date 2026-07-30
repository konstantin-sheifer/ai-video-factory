import { NextResponse } from "next/server";
import { publishVideo } from "@/lib/providers/publish";
import {
  getProjectById,
  getProjectByIdForUser,
} from "@/lib/storage/projects";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

type PublishRequest = {
  videoUrl?: string;
  platforms?: unknown;
  caption?: string;
  projectId?: string;
};

const supportedPlatforms = new Set([
  "TikTok",
  "YouTube Shorts",
  "Instagram Reels",
]);

export async function POST(request: Request) {
  try {
    const { internalUserId } = await requireAppUser();
    const body = (await request.json()) as PublishRequest;
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const project = await getProjectByIdForUser(projectId, internalUserId);

    if (!project) {
      const existingProject = await getProjectById(projectId);

      if (existingProject) {
        return NextResponse.json(
          { error: "You do not have permission to publish this project." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    const publishUrl = project.videoUrl.trim();

    if (!publishUrl) {
      return NextResponse.json(
        { error: "Project does not have a publishable video." },
        { status: 400 }
      );
    }

    const platforms = validatePlatforms(body.platforms);

    if (!platforms) {
      return NextResponse.json(
        { error: "Platforms must be unique supported platform names." },
        { status: 400 }
      );
    }

    if (process.env.PUBLISH_PROVIDER === "real") {
      return NextResponse.json(
        { error: "Real publishing is not available." },
        { status: 503 }
      );
    }

    const result = await publishVideo({
      videoUrl: publishUrl,
      platforms,
      caption: body.caption,
      projectId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Publish route error:", error);

    return NextResponse.json(
      { error: "Failed to publish video." },
      { status: 500 }
    );
  }
}

function validatePlatforms(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  if (
    !value.every(
      (platform) =>
        typeof platform === "string" &&
        platform.length > 0 &&
        supportedPlatforms.has(platform)
    )
  ) {
    return null;
  }

  return new Set(value).size === value.length ? value : null;
}
