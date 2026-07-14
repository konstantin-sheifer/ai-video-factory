import { NextResponse } from "next/server";
import { getProjects, saveProject } from "@/lib/storage/projects";

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
    const body = (await request.json()) as ProjectRequest;

    const project = await saveProject({
      id: body.id,
      userId: body.userId,
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
    });

    const provider = getProjectStorageProvider();

    return NextResponse.json({
      provider: provider === "prisma" ? "prisma-storage" : "mock-storage",
      mock: provider !== "prisma",
      status: "SAVED",
      project,
    });
  } catch (error) {
    console.error("Project save error:", error);

    return NextResponse.json(
      { error: "Failed to save project." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projects = await getProjects();
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
    console.error("Projects load error:", error);

    return NextResponse.json(
      { error: "Failed to load projects." },
      { status: 500 }
    );
  }
}
