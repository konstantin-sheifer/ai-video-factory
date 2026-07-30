import { NextResponse } from "next/server";

type VideoStatusRequest = {
  taskId?: string;
};

type RunwayStatusResponse = {
  id?: string;
  status?: string;
  videoUrl?: string;
  output?: string[] | { videoUrl?: string };
};

export async function POST(request: Request) {
  let body: VideoStatusRequest;

  try {
    body = (await request.json()) as VideoStatusRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";

  if (!taskId) {
    return NextResponse.json(
      {
        error: "Task ID is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!process.env.RUNWAY_API_KEY || taskId === "mock-task-id") {
    return NextResponse.json({
      mock: true,
      status: "SUCCEEDED",
      videoUrl:
        "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    });
  }

  let response: Response;

  try {
    response = await fetch(
      `https://api.dev.runwayml.com/v1/tasks/${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
      }
    );
  } catch {
    console.error("Video status provider failure.", {
      category: "provider_unavailable",
    });

    return NextResponse.json(
      { error: "Video provider is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (!response.ok) {
    console.error("Video status provider failure.", {
      category: "upstream_rejected_request",
      statusCode: response.status,
    });

    return NextResponse.json(
      { error: "Video provider request failed." },
      { status: 502 }
    );
  }

  try {
    const data = (await response.json()) as RunwayStatusResponse;
    const videoUrl =
      (Array.isArray(data.output) ? data.output[0] : data.output?.videoUrl) ||
      data.videoUrl ||
      "";

    return NextResponse.json({
      mock: false,
      status: data.status,
      taskId: data.id || taskId,
      videoUrl,
    });
  } catch {
    console.error("Video status route failure.", {
      category: "invalid_provider_response",
    });

    return NextResponse.json(
      {
        error: "Video provider returned an invalid response.",
      },
      {
        status: 502,
      }
    );
  }
}
