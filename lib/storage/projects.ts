import { prisma } from "@/lib/prisma";

export type ProjectStatus = "draft" | "rendering" | "completed" | "published";

export type StoredProject = {
  id: string;
  userId?: string;
  title: string;
  idea: string;
  videoUrl: string;
  audioUrl: string;
  thumbnailUrl: string;
  status: ProjectStatus;
  platforms: string[];
  scriptJson?: unknown;
  timelineJson?: unknown;
  subtitlesJson?: unknown;
  settingsJson?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SaveProjectInput = {
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

const mockProjectStore = new Map<string, StoredProject>();

function getStorageProvider() {
  return process.env.PROJECT_STORAGE_PROVIDER || "mock";
}

export async function saveProject(
  input: SaveProjectInput
): Promise<StoredProject> {
  const provider = getStorageProvider();

  if (provider === "prisma") {
    return saveProjectWithPrisma(input);
  }

  return saveProjectWithMock(input);
}

export async function getProjects(): Promise<StoredProject[]> {
  const provider = getStorageProvider();

  if (provider === "prisma") {
    return getProjectsWithPrisma();
  }

  return Array.from(mockProjectStore.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getProjectById(
  id: string
): Promise<StoredProject | null> {
  const provider = getStorageProvider();

  if (provider === "prisma") {
    return getProjectByIdWithPrisma(id);
  }

  return mockProjectStore.get(id) || null;
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  platforms?: string[]
): Promise<StoredProject | null> {
  const provider = getStorageProvider();

  if (provider === "prisma") {
    return updateProjectStatusWithPrisma(id, status, platforms);
  }

  const existingProject = mockProjectStore.get(id);

  if (!existingProject) {
    return null;
  }

  const updatedProject: StoredProject = {
    ...existingProject,
    status,
    platforms: platforms || existingProject.platforms,
    updatedAt: new Date().toISOString(),
  };

  mockProjectStore.set(id, updatedProject);

  return updatedProject;
}

async function saveProjectWithMock(
  input: SaveProjectInput
): Promise<StoredProject> {
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();

  const existingProject = mockProjectStore.get(id);

  const project: StoredProject = {
    id,
    userId: input.userId || existingProject?.userId || "mock-user",
    title: input.title || existingProject?.title || "Untitled AI Video",
    idea: input.idea || existingProject?.idea || "",
    videoUrl: input.videoUrl || existingProject?.videoUrl || "",
    audioUrl: input.audioUrl || existingProject?.audioUrl || "",
    thumbnailUrl:
      input.thumbnailUrl ||
      existingProject?.thumbnailUrl ||
      input.videoUrl ||
      existingProject?.videoUrl ||
      "",
    status: input.status || existingProject?.status || "completed",
    platforms: input.platforms || existingProject?.platforms || [],
    scriptJson: input.scriptJson ?? existingProject?.scriptJson,
    timelineJson: input.timelineJson ?? existingProject?.timelineJson,
    subtitlesJson: input.subtitlesJson ?? existingProject?.subtitlesJson,
    settingsJson: input.settingsJson ?? existingProject?.settingsJson,
    createdAt: existingProject?.createdAt || now,
    updatedAt: now,
  };

  mockProjectStore.set(project.id, project);

  return project;
}

async function saveProjectWithPrisma(
  input: SaveProjectInput
): Promise<StoredProject> {
  const cleanVideoUrl = input.videoUrl?.trim() || "";
  const cleanIdea = input.idea?.trim() || "";

  const data = {
    title: input.title || "Untitled AI Video",
    idea: cleanIdea,
    videoUrl: cleanVideoUrl,
    audioUrl: input.audioUrl || "",
    thumbnailUrl: input.thumbnailUrl || cleanVideoUrl || "",
    status: input.status || "completed",
    platforms: input.platforms || [],
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.scriptJson !== undefined ? { scriptJson: input.scriptJson } : {}),
    ...(input.timelineJson !== undefined
      ? { timelineJson: input.timelineJson }
      : {}),
    ...(input.subtitlesJson !== undefined
      ? { subtitlesJson: input.subtitlesJson }
      : {}),
    ...(input.settingsJson !== undefined
      ? { settingsJson: input.settingsJson }
      : {}),
  } as any;

  if (input.id) {
    const existingById = await prisma.project.findUnique({
      where: {
        id: input.id,
      },
    });

    if (existingById) {
      const project = await prisma.project.update({
        where: {
          id: input.id,
        },
        data,
      });

      return normalizePrismaProject(project);
    }

    const project = await prisma.project.create({
      data: {
        id: input.id,
        ...data,
      },
    });

    return normalizePrismaProject(project);
  }

  const project = await prisma.project.create({
    data,
  });

  return normalizePrismaProject(project);
}

async function getProjectsWithPrisma(): Promise<StoredProject[]> {
  const projects = await prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return projects.map(normalizePrismaProject);
}

async function getProjectByIdWithPrisma(
  id: string
): Promise<StoredProject | null> {
  const project = await prisma.project.findUnique({
    where: {
      id,
    },
  });

  if (!project) {
    return null;
  }

  return normalizePrismaProject(project);
}

async function updateProjectStatusWithPrisma(
  id: string,
  status: ProjectStatus,
  platforms?: string[]
): Promise<StoredProject | null> {
  const project = await prisma.project.update({
    where: {
      id,
    },
    data: {
      status,
      ...(platforms ? { platforms } : {}),
    },
  });

  return normalizePrismaProject(project);
}

function normalizePrismaProject(project: {
  id: string;
  userId: string | null;
  title: string;
  idea: string;
  videoUrl: string;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  platforms: string[];
  scriptJson?: unknown;
  timelineJson?: unknown;
  subtitlesJson?: unknown;
  settingsJson?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): StoredProject {
  return {
    id: project.id,
    userId: project.userId || undefined,
    title: project.title,
    idea: project.idea,
    videoUrl: project.videoUrl,
    audioUrl: project.audioUrl || "",
    thumbnailUrl: project.thumbnailUrl || project.videoUrl || "",
    status: normalizeProjectStatus(project.status),
    platforms: project.platforms || [],
    scriptJson: project.scriptJson,
    timelineJson: project.timelineJson,
    subtitlesJson: project.subtitlesJson,
    settingsJson: project.settingsJson,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function normalizeProjectStatus(status: string): ProjectStatus {
  if (
    status === "draft" ||
    status === "rendering" ||
    status === "completed" ||
    status === "published"
  ) {
    return status;
  }

  return "completed";
}
