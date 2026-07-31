import { prisma } from "@/lib/prisma";
import { generationService } from "@/lib/services/generation-service";
import {
  ExecutionMode,
  GenerationStatus as DurableGenerationStatus,
} from "@prisma/client";

export type GenerationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type StoredGeneration = {
  id: string;
  userId?: string;
  projectId?: string;
  idea: string;
  prompt: string;
  status: GenerationStatus;
  videoProvider: string;
  voiceProvider: string;
  renderProvider: string;
  videoUrl: string;
  audioUrl: string;
  finalVideoUrl: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveGenerationInput = {
  userId?: string;
  projectId?: string;
  idea?: string;
  prompt?: string;
  status?: GenerationStatus;
  videoProvider?: string;
  voiceProvider?: string;
  renderProvider?: string;
  videoUrl?: string;
  audioUrl?: string;
  finalVideoUrl?: string;
  errorMessage?: string;
};

export async function saveGeneration(
  input: SaveGenerationInput
): Promise<StoredGeneration> {
  if (!input.userId) {
    throw new Error(
      "The generation compatibility adapter requires an authenticated owner."
    );
  }

  const generation = await generationService.createGeneration({
    userId: input.userId,
    projectId: input.projectId,
    idea: input.idea || "",
    prompt: input.prompt || "",
    status: toDurableStatus(input.status || "completed"),
    progress: input.status && input.status !== "completed" ? 0 : 100,
    videoProvider: input.videoProvider || "mock",
    voiceProvider: input.voiceProvider || "mock",
    renderProvider: input.renderProvider || "mock",
    videoUrl: input.videoUrl || "",
    audioUrl: input.audioUrl || "",
    finalVideoUrl: input.finalVideoUrl || "",
    errorMessage: input.errorMessage || "",
    mode: ExecutionMode.legacy,
    architectureVersion: "backend-v1-compat",
  });

  return normalizeGeneration(generation);
}

export async function getGenerationsByProjectId(
  projectId: string
): Promise<StoredGeneration[]> {
  const generations = await prisma.generation.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return generations.map(normalizeGeneration);
}

export async function getGenerationsByProjectIdForUser(
  projectId: string,
  userId: string
): Promise<StoredGeneration[]> {
  const generations = await prisma.generation.findMany({
    where: {
      projectId,
      project: {
        is: {
          userId,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return generations.map(normalizeGeneration);
}

export async function updateGenerationStatus(
  id: string,
  userId: string,
  status: GenerationStatus,
  data?: {
    videoUrl?: string;
    audioUrl?: string;
    finalVideoUrl?: string;
    errorMessage?: string;
  }
): Promise<StoredGeneration> {
  const generation =
    status === "failed"
      ? await generationService.failGeneration(id, userId, {
          category: "legacy",
          message: data?.errorMessage || "Generation processing failed.",
          retryable: false,
        })
      : await generationService.transitionGenerationState(
          id,
          userId,
          toDurableStatus(status),
          data
        );

  return normalizeGeneration(generation);
}

function normalizeGeneration(generation: {
  id: string;
  userId: string | null;
  projectId: string | null;
  idea: string;
  prompt: string;
  status: string;
  videoProvider: string;
  voiceProvider: string;
  renderProvider: string;
  videoUrl: string | null;
  audioUrl: string | null;
  finalVideoUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): StoredGeneration {
  return {
    id: generation.id,
    userId: generation.userId || undefined,
    projectId: generation.projectId || undefined,
    idea: generation.idea,
    prompt: generation.prompt,
    status: normalizeGenerationStatus(generation.status),
    videoProvider: generation.videoProvider,
    voiceProvider: generation.voiceProvider,
    renderProvider: generation.renderProvider,
    videoUrl: generation.videoUrl || "",
    audioUrl: generation.audioUrl || "",
    finalVideoUrl: generation.finalVideoUrl || "",
    errorMessage: generation.errorMessage || "",
    createdAt: generation.createdAt.toISOString(),
    updatedAt: generation.updatedAt.toISOString(),
  };
}

function normalizeGenerationStatus(status: string): GenerationStatus {
  if (
    status === "queued" ||
    status === "processing" ||
    status === "completed" ||
    status === "failed"
  ) {
    return status;
  }

  return "completed";
}

function toDurableStatus(status: GenerationStatus): DurableGenerationStatus {
  switch (status) {
    case "queued":
      return DurableGenerationStatus.queued;
    case "processing":
      return DurableGenerationStatus.processing;
    case "failed":
      return DurableGenerationStatus.failed;
    case "completed":
      return DurableGenerationStatus.completed;
  }
}
