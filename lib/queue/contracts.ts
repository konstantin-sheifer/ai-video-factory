export type QueueSubmission = {
  jobId: string;
  deduplicationKey: string;
  runAt?: Date;
};

export type QueueReference = {
  id: string;
  queueName: string;
  deduplicated: boolean;
  scheduledFor: Date;
};

export type QueueDelivery = {
  referenceId: string;
  jobId: string;
  attemptKey: string;
};

export interface JobQueue {
  enqueue(submission: QueueSubmission): Promise<QueueReference>;
  cancel(referenceId: string): Promise<boolean>;
  close(): Promise<void>;
}

export interface QueueConsumer {
  start(
    handler: (delivery: QueueDelivery) => Promise<void>
  ): Promise<void>;
  close(): Promise<void>;
}
