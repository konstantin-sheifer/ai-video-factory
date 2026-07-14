import { NextResponse } from "next/server";

type Scene = {
  scene?: number;
  visual?: string;
  voiceover?: string;
  subtitle?: string;
};

type TimelineRequest = {
  scenes?: Scene[];
  duration?: string;
};

type TimelineItem = {
  id: number;
  scene: number;
  start: number;
  end: number;
  duration: number;
  visual: string;
  voiceover: string;
  subtitle: string;
};

const DEFAULT_TOTAL_DURATION = 10;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TimelineRequest;
    const scenes = body.scenes || [];

    if (!scenes.length) {
      return NextResponse.json(
        { error: "Scenes are required." },
        { status: 400 }
      );
    }

    const totalDuration = parseDurationInSeconds(body.duration);
    const sceneDuration = totalDuration / scenes.length;

    const timeline: TimelineItem[] = scenes.map((scene, index) => {
      const start = roundTime(index * sceneDuration);
      const end =
        index === scenes.length - 1
          ? totalDuration
          : roundTime((index + 1) * sceneDuration);

      return {
        id: index + 1,
        scene: scene.scene || index + 1,
        start,
        end,
        duration: roundTime(end - start),
        visual: scene.visual || "",
        voiceover: scene.voiceover || "",
        subtitle: scene.subtitle || "",
      };
    });

    return NextResponse.json({
      provider: "timeline",
      mock: false,
      status: "SUCCEEDED",
      totalDuration,
      timeline,
    });
  } catch (error) {
    console.error("Timeline route error:", error);

    return NextResponse.json(
      { error: "Failed to create timeline." },
      { status: 500 }
    );
  }
}

function parseDurationInSeconds(duration?: string) {
  if (!duration) {
    return DEFAULT_TOTAL_DURATION;
  }

  const match = duration.match(/(\d+(?:\.\d+)?)/);
  const parsed = match ? Number(match[1]) : DEFAULT_TOTAL_DURATION;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TOTAL_DURATION;
  }

  return parsed;
}

function roundTime(value: number) {
  return Math.round(value * 100) / 100;
}
