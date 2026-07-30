import { NextResponse } from "next/server";
import { createVideo } from "@/lib/providers/video";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

type VideoBrief = {
  idea?: string;
  sceneVisual?: string;
};

type VideoRequest = {
  prompt?: string;
  brief?: VideoBrief;
};

const MAX_RUNWAY_PROMPT_LENGTH = 2500;

export async function POST(request: Request) {
  try {
    await requireAppUser();

    const body = (await request.json()) as VideoRequest;
    const prompt = getFinalPrompt(body);

    if (!prompt) {
      return NextResponse.json(
        { error: "Video prompt is required." },
        { status: 400 }
      );
    }

    const safePrompt = limitPrompt(prompt);

    console.log("FINAL AI BRAIN RUNWAY PROMPT:", safePrompt);

    const result = await createVideo(safePrompt);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Video route error:", error);

    return NextResponse.json(
      { error: "Failed to create video." },
      { status: 500 }
    );
  }
}

function getFinalPrompt(body: VideoRequest) {
  const directPrompt = cleanText(body.prompt || "");

  if (directPrompt) {
    return directPrompt;
  }

  const aiBrainPrompt = cleanText(body.brief?.sceneVisual || "");

  if (aiBrainPrompt) {
    return aiBrainPrompt;
  }

  return cleanText(body.brief?.idea || "");
}

function limitPrompt(prompt: string) {
  const clean = cleanText(prompt);

  if (clean.length <= MAX_RUNWAY_PROMPT_LENGTH) {
    return clean;
  }

  return clean.slice(0, MAX_RUNWAY_PROMPT_LENGTH).trim();
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
