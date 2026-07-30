import { NextResponse } from "next/server";
import {
  getGenerationsByProjectIdForUser,
  saveGeneration,
} from "@/lib/storage/generations";
import {
  getProjectById,
  getProjectByIdForUser,
} from "@/lib/storage/projects";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

type GenerationRequest = {
  userId?: string;
  projectId?: string;
  idea?: string;
  prompt?: string;
  status?: "queued" | "processing" | "completed" | "failed";
  videoProvider?: string;
  voiceProvider?: string;
  renderProvider?: string;
  videoUrl?: string;
  audioUrl?: string;
  finalVideoUrl?: string;
  errorMessage?: string;
};

export async function POST(request: Request) {
  try {
    const { internalUserId } = await requireAppUser();
    const body = (await request.json()) as GenerationRequest;
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const authorizationError = await getProjectAuthorizationError(
      projectId,
      internalUserId
    );

    if (authorizationError) {
      return authorizationError;
    }

    const generation = await saveGeneration({
      userId: internalUserId,
      projectId,
      idea: body.idea,
      prompt: body.prompt,
      status: body.status,
      videoProvider: body.videoProvider,
      voiceProvider: body.voiceProvider,
      renderProvider: body.renderProvider,
      videoUrl: body.videoUrl,
      audioUrl: body.audioUrl,
      finalVideoUrl: body.finalVideoUrl,
      errorMessage: body.errorMessage,
    });

    return NextResponse.json({
      provider: "prisma-storage",
      mock: false,
      status: "SAVED",
      generation,
    });
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Generations POST route error:", error);

    return NextResponse.json(
      { error: "Failed to save generation." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { internalUserId } = await requireAppUser();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const authorizationError = await getProjectAuthorizationError(
      projectId,
      internalUserId
    );

    if (authorizationError) {
      return authorizationError;
    }

    const generations = await getGenerationsByProjectIdForUser(
      projectId,
      internalUserId
    );

    return NextResponse.json({
      provider: "prisma-storage",
      mock: false,
      projectId,
      generations,
    });
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Generations GET route error:", error);

    return NextResponse.json(
      { error: "Failed to load generations." },
      { status: 500 }
    );
  }
}

async function getProjectAuthorizationError(
  projectId: string,
  internalUserId: string
): Promise<NextResponse | null> {
  const ownedProject = await getProjectByIdForUser(projectId, internalUserId);

  if (ownedProject) {
    return null;
  }

  const existingProject = await getProjectById(projectId);

  if (existingProject) {
    return NextResponse.json(
      { error: "You do not have permission to access this project." },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { error: "Project not found." },
    { status: 404 }
  );
}
