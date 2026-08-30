import { NextResponse } from "next/server";
import { renderVideo } from "@/lib/providers/render";
import { SafeMediaError } from "@/lib/security/media-policy";
import { normalizeBackgroundMusicVolume } from "@/lib/studio/background-music";

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
  backgroundMusicVolume?: number;
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
      backgroundMusicVolume: normalizeBackgroundMusicVolume(
        body.backgroundMusicVolume
      ),
      renderStyle: body.renderStyle,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SafeMediaError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Render route error:", error);

    return NextResponse.json(
      { error: "Failed to render final video." },
      { status: 500 }
    );
  }
}
