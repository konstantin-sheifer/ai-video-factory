import { NextResponse } from "next/server";
import { getProjectById } from "@/lib/storage/projects";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      project,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load project." },
      { status: 500 }
    );
  }
}