import "server-only";

import { createHash } from "node:crypto";
import { Queue, type Job, type JobsOptions } from "bullmq";
import type Redis from "ioredis";
import type {
  JobQueue,
  QueueReference,
  QueueSubmission,
} from "./contracts";
import {
  BULLMQ_JOB_NAME,
  serializeDelivery,
  type BullMqDeliveryPayload,
} from "./bullmq-delivery";
import {
  QueueError,
  QueueUnavailableError,
  QueueValidationError,
} from "./errors";
import {
  closeRedisConnection,
  createRedisConnection,
  verifyRedisConnection,
} from "./redis-connection";
import type { QueueConfiguration } from "./config";

type BullMqJob = Pick<Job<BullMqDeliveryPayload>, "id" | "timestamp" | "delay">;

export interface BullMqQueuePort {
  add(
    name: string,
    data: BullMqDeliveryPayload,
    options: JobsOptions
  ): Promise<BullMqJob>;
  getJob(id: string): Promise<BullMqJob | undefined>;
  remove(id: string): Promise<number>;
  close(): Promise<void>;
}

export class BullMqJobQueue implements JobQueue {
  private closed = false;

  constructor(
    private readonly queueName: string,
    private readonly queue: BullMqQueuePort,
    private readonly connection?: Redis
  ) {}

  async enqueue(submission: QueueSubmission): Promise<QueueReference> {
    this.assertOpen();
    validateSubmission(submission);

    const referenceId = createReferenceId(submission.deduplicationKey);
    const scheduledFor = submission.runAt ?? new Date();

    try {
      const existing = await this.queue.getJob(referenceId);
      if (existing) {
        return {
          id: referenceId,
          queueName: this.queueName,
          deduplicated: true,
          scheduledFor: new Date(existing.timestamp + existing.delay),
        };
      }

      const delay = Math.max(0, scheduledFor.getTime() - Date.now());
      const job = await this.queue.add(
        BULLMQ_JOB_NAME,
        serializeDelivery(submission.jobId, submission.deduplicationKey),
        {
          jobId: referenceId,
          delay,
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      return {
        id: job.id || referenceId,
        queueName: this.queueName,
        deduplicated: job.id !== referenceId,
        scheduledFor,
      };
    } catch (error) {
      throw normalizeQueueError(error);
    }
  }

  async cancel(referenceId: string): Promise<boolean> {
    this.assertOpen();
    if (!referenceId.trim()) {
      throw new QueueValidationError("A queue reference ID is required.");
    }

    try {
      return (await this.queue.remove(referenceId)) === 1;
    } catch (error) {
      throw normalizeQueueError(error);
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.queue.close();
    if (this.connection) await closeRedisConnection(this.connection);
  }

  private assertOpen() {
    if (this.closed) {
      throw new QueueValidationError("The queue has already been closed.");
    }
  }
}

export async function createBullMqJobQueue(
  configuration: QueueConfiguration
): Promise<BullMqJobQueue> {
  if (!configuration.enabled || !configuration.redisUrl) {
    throw new QueueValidationError("The BullMQ queue is not enabled.");
  }

  const connection = createRedisConnection(configuration.redisUrl, "publisher");
  await verifyRedisConnection(connection);
  const queue = new Queue<BullMqDeliveryPayload>(configuration.queueName, {
    connection,
    prefix: configuration.queuePrefix,
  });
  await queue.waitUntilReady();
  return new BullMqJobQueue(configuration.queueName, queue, connection);
}

export function createReferenceId(attemptKey: string): string {
  return `delivery-${createHash("sha256").update(attemptKey).digest("hex")}`;
}

function validateSubmission(submission: QueueSubmission) {
  if (!submission.jobId.trim() || !submission.deduplicationKey.trim()) {
    throw new QueueValidationError(
      "A durable job ID and deduplication key are required."
    );
  }
  if (submission.runAt && Number.isNaN(submission.runAt.getTime())) {
    throw new QueueValidationError("The scheduled delivery time is invalid.");
  }
}

function normalizeQueueError(error: unknown): QueueError {
  if (error instanceof QueueError) return error;
  return new QueueUnavailableError("The durable queue operation failed.");
}
