import { NextResponse } from "next/server";
import {
  getGenerationsByProjectId,
  saveGeneration,
} from "@/lib/storage/generations";

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
    const body = (await request.json()) as GenerationRequest;

    const generation = await saveGeneration({
      userId: body.userId,
      projectId: body.projectId,
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
    console.error("Generations POST route error:", error);

    return NextResponse.json(
      { error: "Failed to save generation." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const generations = await getGenerationsByProjectId(projectId);

    return NextResponse.json({
      provider: "prisma-storage",
      mock: false,
      projectId,
      generations,
    });
  } catch (error) {
    console.error("Generations GET route error:", error);

    return NextResponse.json(
      { error: "Failed to load generations." },
      { status: 500 }
    );
  }
}