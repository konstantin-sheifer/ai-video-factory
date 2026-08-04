import type {
  JobQueue,
  QueueReference,
  QueueSubmission,
} from "./contracts";
import { QueueUnavailableError } from "./errors";

export class DisabledJobQueue implements JobQueue {
  async enqueue(submission: QueueSubmission): Promise<QueueReference> {
    void submission;
    throw new QueueUnavailableError(
      "Durable queue infrastructure is disabled."
    );
  }

  async cancel(referenceId: string): Promise<boolean> {
    void referenceId;
    return false;
  }

  async close(): Promise<void> {}
}
