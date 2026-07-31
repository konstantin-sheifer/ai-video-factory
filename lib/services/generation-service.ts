import "server-only";

import {
  ExecutionMode,
  GenerationStage,
  GenerationStatus,
  Prisma,
  type Generation,
} from "@prisma/client";
import {
  assertGenerationTransition,
  isTerminalGenerationState,
  LifecycleConflictError,
  LifecycleResourceNotFoundError,
  LifecycleValidationError,
  sanitizeFailure,
  sanitizeLifecycleReason,
  validateProgress,
  type FailureInput,
} from "@/lib/domain/generation-lifecycle";
import { GenerationRepository } from "@/lib/repositories/generation-repository";

const METADATA_FIELDS = [
  "inputJson",
  "productionPackageJson",
  "aiBrainVersionJson",
  "promptVersionJson",
  "decisionSummaryJson",
  "qualitySummaryJson",
  "revisionMetadataJson",
  "providerConfigJson",
] as const;

export type GenerationMetadataField = (typeof METADATA_FIELDS)[number];

export type CreateGenerationInput = {
  userId: string;
  projectId?: string;
  idea: string;
  prompt: string;
  idempotencyKey?: string;
  status?: GenerationStatus;
  currentStage?: GenerationStage;
  progress?: number;
  inputJson?: Prisma.InputJsonValue;
  videoProvider?: string;
  voiceProvider?: string;
  renderProvider?: string;
  mode?: ExecutionMode;
  architectureVersion?: string;
  videoUrl?: string;
  audioUrl?: string;
  finalVideoUrl?: string;
  errorMessage?: string;
};

export class GenerationService {
  constructor(
    private readonly generations: GenerationRepository =
      new GenerationRepository()
  ) {}

  async createGeneration(input: CreateGenerationInput): Promise<Generation> {
    assertOwner(input.userId);
    const idempotencyKey = input.idempotencyKey?.trim() || undefined;

    if (input.projectId) {
      const ownsProject = await this.generations.ownsProject(
        input.projectId,
        input.userId
      );

      if (!ownsProject) {
        throw new LifecycleResourceNotFoundError("project");
      }
    }

    if (idempotencyKey) {
      const existing = await this.generations.findOwnedByIdempotencyKey(
        input.userId,
        idempotencyKey
      );

      if (existing) {
        return existing;
      }
    }

    const status = input.status ?? GenerationStatus.queued;
    const progress = validateProgress(
      status === GenerationStatus.completed ? 100 : (input.progress ?? 0)
    );
    const now = new Date();

    try {
      return await this.generations.create({
        userId: input.userId,
        projectId: input.projectId,
        idea: input.idea,
        prompt: input.prompt,
        idempotencyKey,
        status,
        currentStage:
          input.currentStage ??
          (status === GenerationStatus.completed
            ? GenerationStage.completed
            : GenerationStage.intake),
        progress,
        inputJson: input.inputJson,
        videoProvider: input.videoProvider ?? "mock",
        voiceProvider: input.voiceProvider ?? "mock",
        renderProvider: input.renderProvider ?? "mock",
        mode: input.mode ?? ExecutionMode.legacy,
        architectureVersion: input.architectureVersion ?? "backend-v2",
        videoUrl: input.videoUrl,
        audioUrl: input.audioUrl,
        finalVideoUrl: input.finalVideoUrl,
        errorMessage: input.errorMessage,
        startedAt:
          status === GenerationStatus.queued ||
          status === GenerationStatus.cancelled
            ? undefined
            : now,
        completedAt: status === GenerationStatus.completed ? now : undefined,
        failedAt: status === GenerationStatus.failed ? now : undefined,
        cancelledAt: status === GenerationStatus.cancelled ? now : undefined,
      });
    } catch (error) {
      if (idempotencyKey && isUniqueConstraintError(error)) {
        const existing = await this.generations.findOwnedByIdempotencyKey(
          input.userId,
          idempotencyKey
        );

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async loadGeneration(id: string, userId: string): Promise<Generation> {
    assertOwner(userId);
    const generation = await this.generations.findOwned(id, userId);

    if (!generation) {
      throw new LifecycleResourceNotFoundError("generation");
    }

    return generation;
  }

  async updateGenerationProgress(
    id: string,
    userId: string,
    progress: number
  ): Promise<Generation> {
    const generation = await this.loadGeneration(id, userId);

    if (isTerminalGenerationState(generation.status)) {
      throw new LifecycleValidationError(
        `Progress cannot change after generation is ${generation.status}.`
      );
    }

    validateProgress(progress, generation.progress);
    return this.updateOrThrow(generation, { progress });
  }

  async transitionGenerationState(
    id: string,
    userId: string,
    status: GenerationStatus,
    options: {
      currentStage?: GenerationStage;
      progress?: number;
      videoUrl?: string;
      audioUrl?: string;
      finalVideoUrl?: string;
      errorMessage?: string;
    } = {}
  ): Promise<Generation> {
    const generation = await this.loadGeneration(id, userId);

    if (generation.status === status) {
      return generation;
    }

    assertGenerationTransition(generation.status, status);

    if (options.progress !== undefined) {
      validateProgress(options.progress, generation.progress);
    }

    const now = new Date();

    return this.updateOrThrow(generation, {
      status,
      currentStage: options.currentStage,
      progress:
        status === GenerationStatus.completed ? 100 : options.progress,
      videoUrl: options.videoUrl,
      audioUrl: options.audioUrl,
      finalVideoUrl: options.finalVideoUrl,
      errorMessage: options.errorMessage,
      startedAt:
        generation.startedAt ??
        (status !== GenerationStatus.queued ? now : undefined),
      completedAt: status === GenerationStatus.completed ? now : undefined,
      failedAt: status === GenerationStatus.failed ? now : undefined,
      cancelledAt: status === GenerationStatus.cancelled ? now : undefined,
    });
  }

  async cancelGeneration(
    id: string,
    userId: string,
    reason: string
  ): Promise<Generation> {
    const generation = await this.loadGeneration(id, userId);

    if (generation.status === GenerationStatus.cancelled) {
      return generation;
    }

    assertGenerationTransition(
      generation.status,
      GenerationStatus.cancelled
    );
    const now = new Date();

    return this.updateOrThrow(generation, {
      status: GenerationStatus.cancelled,
      cancelRequestedAt: generation.cancelRequestedAt ?? now,
      revisionMetadataJson: mergeJsonObject(
        generation.revisionMetadataJson,
        {
          cancellation: {
            reason: sanitizeLifecycleReason(
              reason,
              "Cancellation requested."
            ),
            requestedAt: (generation.cancelRequestedAt ?? now).toISOString(),
            cancelledAt: now.toISOString(),
          },
        }
      ),
      cancelledAt: now,
    });
  }

  async failGeneration(
    id: string,
    userId: string,
    failure: FailureInput
  ): Promise<Generation> {
    const generation = await this.loadGeneration(id, userId);

    if (generation.status === GenerationStatus.failed) {
      return generation;
    }

    assertGenerationTransition(generation.status, GenerationStatus.failed);
    const sanitized = sanitizeFailure(failure);
    const now = new Date();

    return this.updateOrThrow(generation, {
      status: GenerationStatus.failed,
      failureCode: joinFailureCode(sanitized.category, sanitized.code),
      errorMessage: sanitized.message,
      revisionMetadataJson: mergeJsonObject(
        generation.revisionMetadataJson,
        {
          failure: {
            category: sanitized.category,
            code: sanitized.code,
            retryable: sanitized.retryable,
            occurredAt: now.toISOString(),
            providerDetails: sanitized.providerDetails,
          },
        }
      ),
      failedAt: now,
    });
  }

  async completeGeneration(
    id: string,
    userId: string,
    output: {
      finalVideoUrl: string;
      videoUrl?: string;
      audioUrl?: string;
    }
  ): Promise<Generation> {
    if (!output.finalVideoUrl.trim()) {
      throw new LifecycleValidationError(
        "A final video URL is required to complete a generation."
      );
    }

    return this.transitionGenerationState(
      id,
      userId,
      GenerationStatus.completed,
      {
        currentStage: GenerationStage.completed,
        progress: 100,
        finalVideoUrl: output.finalVideoUrl,
        videoUrl: output.videoUrl,
        audioUrl: output.audioUrl,
      }
    );
  }

  async appendGenerationMetadata(
    id: string,
    userId: string,
    field: GenerationMetadataField,
    metadata: Prisma.InputJsonObject
  ): Promise<Generation> {
    if (!METADATA_FIELDS.includes(field)) {
      throw new LifecycleValidationError(
        "Unsupported generation metadata field."
      );
    }

    const generation = await this.loadGeneration(id, userId);
    const existingValue = generation[field];

    return this.updateOrThrow(generation, {
      [field]: mergeJsonObject(existingValue, metadata),
    });
  }

  private async updateOrThrow(
    generation: Generation,
    data: Prisma.GenerationUpdateManyMutationInput
  ): Promise<Generation> {
    const updated = await this.generations.updateOwned(
      generation.id,
      generation.userId!,
      generation.version,
      data
    );

    if (!updated) {
      throw new LifecycleConflictError(
        "Generation changed during the lifecycle update."
      );
    }

    return updated;
  }
}

function mergeJsonObject(
  existingValue: Prisma.JsonValue | null,
  metadata: Prisma.InputJsonObject
): Prisma.InputJsonObject {
  const existing =
    existingValue &&
    typeof existingValue === "object" &&
    !Array.isArray(existingValue)
      ? (existingValue as Prisma.JsonObject)
      : {};

  return {
    ...existing,
    ...metadata,
  } as Prisma.InputJsonObject;
}

function joinFailureCode(category: string, code: string | null): string {
  return code ? `${category}:${code}` : category;
}

export const generationService = new GenerationService();

function assertOwner(userId: string): void {
  if (!userId.trim()) {
    throw new LifecycleValidationError(
      "An authenticated internal user ID is required."
    );
  }
}

function isUniqueConstraintError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
