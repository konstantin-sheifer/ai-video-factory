import { NextResponse } from "next/server";
import {
  getProjectsByUserId,
  saveProject,
  updateProjectForUser,
  type StoredProject,
} from "@/lib/storage/projects";
import {
  AppAuthenticationError,
  requireAppUser,
} from "@/lib/auth/require-app-user";

type ProjectStatus = "draft" | "rendering" | "completed" | "published";

type ProjectRequest = {
  id?: string;
  userId?: string;
  title?: string;
  idea?: string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  status?: ProjectStatus;
  platforms?: string[];
  scriptJson?: unknown;
  timelineJson?: unknown;
  subtitlesJson?: unknown;
  settingsJson?: unknown;
};

type ProjectListItem = {
  id?: string;
  userId?: string;
  title?: string;
  idea?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status?: ProjectStatus;
  platforms?: string[];
  createdAt?: string;
  updatedAt?: string;
};

function getProjectStorageProvider() {
  return process.env.PROJECT_STORAGE_PROVIDER || "mock";
}

export async function POST(request: Request) {
  try {
    const { internalUserId } = await requireAppUser();
    const body = (await request.json()) as ProjectRequest;

    const projectInput = {
      title: body.title,
      idea: body.idea,
      videoUrl: body.videoUrl,
      audioUrl: body.audioUrl,
      thumbnailUrl: body.thumbnailUrl,
      status: body.status,
      platforms: body.platforms,
      scriptJson: body.scriptJson,
      timelineJson: body.timelineJson,
      subtitlesJson: body.subtitlesJson,
      settingsJson: body.settingsJson,
    };

    if (body.id) {
      const result = await updateProjectForUser(
        body.id,
        internalUserId,
        projectInput
      );

      if (result.status === "not_found") {
        return NextResponse.json(
          { error: "Project not found." },
          { status: 404 }
        );
      }

      if (result.status === "forbidden") {
        return NextResponse.json(
          { error: "You do not have permission to modify this project." },
          { status: 403 }
        );
      }

      return createSavedProjectResponse(result.project);
    }

    const project = await saveProject({
      ...projectInput,
      userId: internalUserId,
    });

    return createSavedProjectResponse(project);
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Project save error:", error);

    return NextResponse.json(
      { error: "Failed to save project." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { internalUserId } = await requireAppUser();
    const projects = await getProjectsByUserId(internalUserId);
    const provider = getProjectStorageProvider();

    const projectList: ProjectListItem[] = projects.map((project) => ({
      id: project.id,
      userId: project.userId,
      title: project.title,
      idea: project.idea,
      videoUrl: project.videoUrl,
      thumbnailUrl: project.thumbnailUrl,
      status: project.status,
      platforms: project.platforms,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return NextResponse.json({
      provider: provider === "prisma" ? "prisma-storage" : "mock-storage",
      mock: provider !== "prisma",
      total: projectList.length,
      projects: projectList,
    });
  } catch (error) {
    if (error instanceof AppAuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Projects load error:", error);

    return NextResponse.json(
      { error: "Failed to load projects." },
      { status: 500 }
    );
  }
}

function createSavedProjectResponse(project: StoredProject) {
  const provider = getProjectStorageProvider();

  return NextResponse.json({
    provider: provider === "prisma" ? "prisma-storage" : "mock-storage",
    mock: provider !== "prisma",
    status: "SAVED",
    project,
  });
}
