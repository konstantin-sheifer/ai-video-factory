import {
  QueueValidationError,
} from "./errors";
import type {
  JobQueue,
  QueueDelivery,
  QueueReference,
  QueueSubmission,
} from "./contracts";

type StoredDelivery = QueueDelivery & {
  deduplicationKey: string;
  scheduledFor: Date;
  cancelled: boolean;
};

/**
 * Explicit test/development transport. It is process-local and must never be
 * treated as a production queue.
 */
export class InMemoryJobQueue implements JobQueue {
  private readonly deliveries = new Map<string, StoredDelivery>();
  private readonly referencesByDeduplicationKey = new Map<string, string>();
  private closed = false;

  constructor(private readonly queueName = "in-memory-test") {}

  async enqueue(submission: QueueSubmission): Promise<QueueReference> {
    this.assertOpen();
    validateSubmission(submission);

    const existingReference =
      this.referencesByDeduplicationKey.get(submission.deduplicationKey);
    if (existingReference) {
      const existing = this.deliveries.get(existingReference);
      if (existing && !existing.cancelled) {
        return {
          id: existing.referenceId,
          queueName: this.queueName,
          deduplicated: true,
          scheduledFor: existing.scheduledFor,
        };
      }
    }

    const referenceId = crypto.randomUUID();
    const scheduledFor = submission.runAt ?? new Date();
    this.deliveries.set(referenceId, {
      referenceId,
      jobId: submission.jobId,
      attemptKey: submission.deduplicationKey,
      deduplicationKey: submission.deduplicationKey,
      scheduledFor,
      cancelled: false,
    });
    this.referencesByDeduplicationKey.set(
      submission.deduplicationKey,
      referenceId
    );

    return {
      id: referenceId,
      queueName: this.queueName,
      deduplicated: false,
      scheduledFor,
    };
  }

  async cancel(referenceId: string): Promise<boolean> {
    this.assertOpen();
    const delivery = this.deliveries.get(referenceId);

    if (!delivery || delivery.cancelled) {
      return false;
    }

    delivery.cancelled = true;
    this.referencesByDeduplicationKey.delete(delivery.deduplicationKey);
    return true;
  }

  takeReady(now = new Date()): QueueDelivery[] {
    this.assertOpen();
    const ready = [...this.deliveries.values()]
      .filter(
        (delivery) =>
          !delivery.cancelled &&
          delivery.scheduledFor.getTime() <= now.getTime()
      )
      .sort(
        (left, right) =>
          left.scheduledFor.getTime() - right.scheduledFor.getTime()
      );

    for (const delivery of ready) {
      this.deliveries.delete(delivery.referenceId);
      this.referencesByDeduplicationKey.delete(delivery.deduplicationKey);
    }

    return ready.map(({ referenceId, jobId, attemptKey }) => ({
      referenceId,
      jobId,
      attemptKey,
    }));
  }

  async close(): Promise<void> {
    this.closed = true;
    this.deliveries.clear();
    this.referencesByDeduplicationKey.clear();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new QueueValidationError("The queue has already been closed.");
    }
  }
}

function validateSubmission(submission: QueueSubmission): void {
  if (!submission.jobId.trim()) {
    throw new QueueValidationError("A durable job ID is required.");
  }
  if (!submission.deduplicationKey.trim()) {
    throw new QueueValidationError("A deduplication key is required.");
  }
  if (
    submission.runAt &&
    Number.isNaN(submission.runAt.getTime())
  ) {
    throw new QueueValidationError("The scheduled delivery time is invalid.");
  }
}
