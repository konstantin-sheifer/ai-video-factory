import { NextResponse } from "next/server";
import {
  getProjectById,
  getProjectByIdForUser,
} from "@/lib/storage/projects";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { internalUserId } = await requireAppUser();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required." },
        { status: 400 }
      );
    }

    const project = await getProjectByIdForUser(id, internalUserId);

    if (!project) {
      const existingProject = await getProjectById(id);

      if (existingProject) {
        return NextResponse.json(
          { error: "You do not have permission to access this project." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      project,
    });
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Failed to load project." },
      { status: 500 }
    );
  }
}
