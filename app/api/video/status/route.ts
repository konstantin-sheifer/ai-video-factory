import { NextResponse } from "next/server";

type VideoStatusRequest = {
  taskId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VideoStatusRequest;
    const taskId = body.taskId?.trim();

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

    const response = await fetch(
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

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return NextResponse.json(
        {
          error: data,
        },
        {
          status: 500,
        }
      );
    }

    const videoUrl =
      data.output?.[0] ||
      data.output?.videoUrl ||
      data.videoUrl ||
      "";

    return NextResponse.json({
      mock: false,
      status: data.status,
      taskId: data.id || taskId,
      videoUrl,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to check video status.",
      },
      {
        status: 500,
      }
    );
  }
}