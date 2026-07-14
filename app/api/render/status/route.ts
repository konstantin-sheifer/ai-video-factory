import { NextResponse } from "next/server";

type RenderStatusRequest = {
  renderId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RenderStatusRequest;
    const renderId = body.renderId?.trim();

    if (!renderId) {
      return NextResponse.json(
        { error: "Render ID is required." },
        { status: 400 }
      );
    }

    const provider = process.env.RENDER_PROVIDER || "mock";

    if (provider === "mock") {
      return NextResponse.json({
        provider: "mock",
        mock: true,
        renderId,
        status: "SUCCEEDED",
        progress: 100,
        message: "Mock render completed.",
      });
    }

    if (provider === "remotion") {
      return NextResponse.json({
        provider: "remotion",
        mock: true,
        renderId,
        status: "PENDING",
        progress: 35,
        message:
          "Remotion render status polling is prepared but not connected yet.",
      });
    }

    return NextResponse.json(
      { error: `Unsupported render provider: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Render status route error:", error);

    return NextResponse.json(
      { error: "Failed to check render status." },
      { status: 500 }
    );
  }
}