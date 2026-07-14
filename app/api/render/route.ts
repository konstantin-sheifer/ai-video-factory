import { NextResponse } from "next/server";
import { renderVideo } from "@/lib/providers/render";

type RenderRequest = {
  videoUrl?: string;
  audioUrl?: string;
  subtitles?: {
    id?: number;
    start: number;
    end: number;
    text: string;
  }[];
  timeline?: {
    id?: number;
    scene?: number;
    start: number;
    end: number;
    duration?: number;
    visual?: string;
    voiceover?: string;
    subtitle?: string;
  }[];
  subtitlesEnabled?: boolean;
  backgroundMusicEnabled?: boolean;
  renderStyle?: "cinematic" | "viral" | "kids" | "dramatic";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RenderRequest;

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: "Video URL is required." },
        { status: 400 }
      );
    }

    const result = await renderVideo({
      videoUrl: body.videoUrl,
      audioUrl: body.audioUrl,
      subtitles: body.subtitles,
      timeline: body.timeline,
      subtitlesEnabled: body.subtitlesEnabled,
      backgroundMusicEnabled: body.backgroundMusicEnabled,
      renderStyle: body.renderStyle,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Render route error:", error);

    return NextResponse.json(
      { error: "Failed to render final video." },
      { status: 500 }
    );
  }
}