import type {
  GenerationJobStatus,
  GenerationStatus,
  Prisma,
} from "@prisma/client";

export class LifecycleValidationError extends Error {
  readonly code = "LIFECYCLE_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "LifecycleValidationError";
  }
}

export class LifecycleResourceNotFoundError extends Error {
  readonly code = "LIFECYCLE_RESOURCE_NOT_FOUND";

  constructor(resource: "generation" | "job" | "project") {
    const label =
      resource === "generation"
        ? "Generation"
        : resource === "project"
          ? "Project"
          : "Job";
    super(`${label} not found.`);
    this.name = "LifecycleResourceNotFoundError";
  }
}

export class LifecycleConflictError extends Error {
  readonly code = "LIFECYCLE_CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "LifecycleConflictError";
  }
}

const TERMINAL_GENERATION_STATES = new Set<GenerationStatus>([
  "completed",
  "cancelled",
  "failed",
]);

const ACTIVE_GENERATION_STATES = [
  "planning",
  "processing",
  "generating_video",
  "generating_voice",
  "creating_subtitles",
  "rendering",
  "finalizing",
  "retrying",
] as const satisfies readonly GenerationStatus[];

const generationTransitions: Record<
  GenerationStatus,
  ReadonlySet<GenerationStatus>
> = {
  queued: new Set([
    "planning",
    "processing",
    "cancelling",
    "cancelled",
    "failed",
  ]),
  planning: activeGenerationTargets("planning"),
  processing: activeGenerationTargets("processing"),
  generating_video: activeGenerationTargets("generating_video"),
  generating_voice: activeGenerationTargets("generating_voice"),
  creating_subtitles: activeGenerationTargets("creating_subtitles"),
  rendering: activeGenerationTargets("rendering"),
  finalizing: new Set(["completed", "retrying", "cancelling", "cancelled", "failed"]),
  retrying: activeGenerationTargets("retrying"),
  cancelling: new Set(["cancelled", "failed"]),
  completed: new Set(),
  cancelled: new Set(),
  failed: new Set(),
};

const jobTransitions: Record<
  GenerationJobStatus,
  ReadonlySet<GenerationJobStatus>
> = {
  queued: new Set(["claimed", "failed", "dead_letter", "cancelling", "cancelled"]),
  claimed: new Set(["queued", "running", "failed", "dead_letter", "cancelling", "cancelled"]),
  running: new Set([
    "waiting_provider",
    "succeeded",
    "failed",
    "dead_letter",
    "cancelling",
    "cancelled",
  ]),
  waiting_provider: new Set([
    "queued",
    "succeeded",
    "failed",
    "dead_letter",
    "cancelling",
    "cancelled",
  ]),
  retry_scheduled: new Set(["queued", "cancelling", "cancelled"]),
  cancelling: new Set(["cancelled", "failed", "dead_letter"]),
  succeeded: new Set(),
  failed: new Set(["retry_scheduled"]),
  dead_letter: new Set(),
  cancelled: new Set(),
};

function activeGenerationTargets(
  current: GenerationStatus
): ReadonlySet<GenerationStatus> {
  return new Set([
    ...ACTIVE_GENERATION_STATES.filter((status) => status !== current),
    "completed",
    "cancelling",
    "cancelled",
    "failed",
  ]);
}

export function assertGenerationTransition(
  current: GenerationStatus,
  next: GenerationStatus
): void {
  assertTransition("Generation", current, next, generationTransitions[current]);
}

export function assertJobTransition(
  current: GenerationJobStatus,
  next: GenerationJobStatus
): void {
  assertTransition("Generation job", current, next, jobTransitions[current]);
}

function assertTransition<T extends string>(
  resource: string,
  current: T,
  next: T,
  allowed: ReadonlySet<T>
): void {
  if (current === next) {
    throw new LifecycleValidationError(
      `${resource} is already in the ${current} state.`
    );
  }

  if (!allowed.has(next)) {
    throw new LifecycleValidationError(
      `${resource} cannot transition from ${current} to ${next}.`
    );
  }
}

export function isTerminalGenerationState(status: GenerationStatus): boolean {
  return TERMINAL_GENERATION_STATES.has(status);
}

export function validateProgress(
  progress: number,
  currentProgress?: number
): number {
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new LifecycleValidationError(
      "Progress must be an integer between 0 and 100."
    );
  }

  if (currentProgress !== undefined && progress < currentProgress) {
    throw new LifecycleValidationError("Progress cannot move backwards.");
  }

  return progress;
}

export type FailureInput = {
  category: string;
  code?: string;
  message: string;
  retryable: boolean;
  providerDetails?: {
    provider?: string;
    statusCode?: number;
    providerCode?: string;
    operationState?: string;
    retryAfterMs?: number;
  };
};

export type SanitizedFailure = {
  category: string;
  code: string | null;
  message: string;
  retryable: boolean;
  providerDetails: Prisma.InputJsonValue | null;
};

export function sanitizeFailure(input: FailureInput): SanitizedFailure {
  const category = sanitizeLabel(input.category, "unclassified");
  const code = input.code ? sanitizeLabel(input.code, "unknown") : null;
  const message = sanitizeFailureMessage(input.message);
  const details = input.providerDetails;

  if (!details) {
    return {
      category,
      code,
      message,
      retryable: input.retryable,
      providerDetails: null,
    };
  }

  const safeDetails: Record<string, string | number> = {};

  if (details.provider) {
    safeDetails.provider = sanitizeLabel(details.provider, "provider");
  }
  if (
    Number.isInteger(details.statusCode) &&
    details.statusCode !== undefined &&
    details.statusCode >= 100 &&
    details.statusCode <= 599
  ) {
    safeDetails.statusCode = details.statusCode;
  }
  if (details.providerCode) {
    safeDetails.providerCode = sanitizeLabel(details.providerCode, "unknown");
  }
  if (details.operationState) {
    safeDetails.operationState = sanitizeLabel(
      details.operationState,
      "unknown"
    );
  }
  if (
    Number.isInteger(details.retryAfterMs) &&
    details.retryAfterMs !== undefined &&
    details.retryAfterMs >= 0
  ) {
    safeDetails.retryAfterMs = details.retryAfterMs;
  }

  return {
    category,
    code,
    message,
    retryable: input.retryable,
    providerDetails:
      Object.keys(safeDetails).length > 0
        ? (safeDetails as Prisma.InputJsonObject)
        : null,
  };
}

export function sanitizeLifecycleReason(
  value: string,
  fallback: string
): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  return cleaned || fallback;
}

function sanitizeLabel(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 100);

  return cleaned || fallback;
}

function sanitizeFailureMessage(value: string): string {
  const cleaned = sanitizeLifecycleReason(
    value,
    "Generation processing failed."
  )
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi, "[redacted-credential]")
    .replace(/\b(?:sk|rk|pk)-[a-zA-Z0-9_-]{8,}\b/g, "[redacted-credential]")
    .replace(/[A-Za-z]:\\[^\s]+/g, "[redacted-path]")
    .replace(/(?:\/[a-zA-Z0-9._-]+){2,}/g, "[redacted-path]")
    .replace(/\b(?:request[_ -]?id|request|req)[=: ]+\S+/gi, "[redacted-id]");

  return cleaned.slice(0, 500);
}
