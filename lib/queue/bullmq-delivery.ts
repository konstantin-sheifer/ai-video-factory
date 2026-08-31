import { QueueValidationError } from "./errors";
import type { QueueDelivery } from "./contracts";

export const BULLMQ_DELIVERY_VERSION = 1;
export const BULLMQ_JOB_NAME = "durable-generation-job";

export type BullMqDeliveryPayload = {
  version: number;
  jobId: string;
  attemptKey: string;
};

export function serializeDelivery(
  jobId: string,
  attemptKey: string
): BullMqDeliveryPayload {
  if (!jobId.trim() || !attemptKey.trim()) {
    throw new QueueValidationError(
      "A durable job ID and attempt key are required."
    );
  }
  return { version: BULLMQ_DELIVERY_VERSION, jobId, attemptKey };
}

export function deserializeDelivery(
  referenceId: string | undefined,
  value: unknown
): QueueDelivery {
  if (
    !referenceId ||
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== BULLMQ_DELIVERY_VERSION ||
    !("jobId" in value) ||
    typeof value.jobId !== "string" ||
    !value.jobId.trim() ||
    !("attemptKey" in value) ||
    typeof value.attemptKey !== "string" ||
    !value.attemptKey.trim()
  ) {
    throw new QueueValidationError("The queue delivery payload is invalid.");
  }

  return {
    referenceId,
    jobId: value.jobId,
    attemptKey: value.attemptKey,
  };
}
