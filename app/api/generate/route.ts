import { NextResponse } from "next/server";
import { z } from "zod";

const GenerateRequestSchema = z.object({
  idea: z.string().min(3).max(1000),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = GenerateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid video idea." },
      { status: 400 }
    );
  }

  const { idea } = parsed.data;

  const video = {
    title: createTitle(idea),
    idea,
    script: createScript(idea),
    status: "ready" as const,
    videoUrl: "/mock/sample-video.mp4",
  };

  return NextResponse.json({ video });
}

function createTitle(idea: string) {
  const cleanIdea = idea.trim();

  if (cleanIdea.length <= 52) {
    return cleanIdea;
  }

  return `${cleanIdea.slice(0, 52)}...`;
}

function createScript(idea: string) {
  return `Hook: ${idea}

Scene 1: Open with a cinematic close-up that immediately creates curiosity.

Scene 2: Build emotional tension with fast cuts, bold captions, and a clear visual transformation.

Scene 3: Deliver the payoff with a memorable final line designed for short-form retention.

CTA: Follow for more AI-generated stories.`;
}