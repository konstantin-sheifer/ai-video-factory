import type { Prisma } from "@prisma/client";
import {
  JobCancellationSignal,
  JobHandlerFailure,
  type JobHandler,
} from "../job-handler";

type HandlerInput = {
  simulateFailure?: boolean;
  delayMs?: number;
};

/**
 * Deterministic, no-cost proof handler. It performs no provider or network work.
 */
export const metadataPreparationHandler: JobHandler = async ({
  job,
  signal,
  checkpoint,
}) => {
  const input = readInput(job.inputJson);

  await checkpoint(20);
  await wait(Math.min(Math.max(input.delayMs ?? 0, 0), 2_000), signal);
  await checkpoint(60);

  if (input.simulateFailure) {
    throw new JobHandlerFailure({
      category: "verification",
      code: "simulated_failure",
      message: "The deterministic verification failure was requested.",
      retryable: true,
      retryDelayMs: 1_000,
    });
  }

  if (signal.aborted) {
    throw new JobCancellationSignal();
  }

  await checkpoint(90);

  return {
    prepared: true,
    stageKey: job.stageKey,
    revision: job.revision,
  } satisfies Prisma.InputJsonObject;
};

function readInput(value: Prisma.JsonValue | null): HandlerInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return {
    simulateFailure:
      typeof value.simulateFailure === "boolean"
        ? value.simulateFailure
        : undefined,
    delayMs: typeof value.delayMs === "number" ? value.delayMs : undefined,
  };
}

async function wait(durationMs: number, signal: AbortSignal): Promise<void> {
  if (durationMs === 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, durationMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new JobCancellationSignal());
      },
      { once: true }
    );
  });
}
