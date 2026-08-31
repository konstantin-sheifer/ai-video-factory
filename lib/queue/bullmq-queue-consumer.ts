import "server-only";

import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import type { QueueConsumer, QueueDelivery } from "./contracts";
import {
  deserializeDelivery,
  type BullMqDeliveryPayload,
} from "./bullmq-delivery";
import { QueueValidationError } from "./errors";
import {
  closeRedisConnection,
  createRedisConnection,
  verifyRedisConnection,
} from "./redis-connection";
import type { QueueConfiguration } from "./config";
import {
  structuredQueueLogger,
  type QueueLogger,
} from "./structured-log";

export interface BullMqWorkerPort {
  run(): Promise<void>;
  waitUntilReady(): Promise<unknown>;
  close(force?: boolean): Promise<void>;
  on(event: "error", listener: (error: Error) => void): unknown;
}

export class BullMqQueueConsumer implements QueueConsumer {
  private started = false;
  private closed = false;
  private worker?: BullMqWorkerPort;

  constructor(
    private readonly createWorker: (
      handler: (delivery: QueueDelivery) => Promise<void>
    ) => BullMqWorkerPort,
    private readonly connection?: Redis,
    private readonly logger: QueueLogger = structuredQueueLogger
  ) {}

  async start(handler: (delivery: QueueDelivery) => Promise<void>): Promise<void> {
    if (this.closed) {
      throw new QueueValidationError("The queue consumer is closed.");
    }
    if (this.started) return;
    this.started = true;

    this.worker = this.createWorker(handler);
    this.worker.on("error", () => {
      this.logger({ event: "worker.transport_error", outcome: "failed" });
    });
    await this.worker.waitUntilReady();
    void this.worker.run().catch(() => {
      if (!this.closed) {
        this.logger({ event: "worker.transport_stopped", outcome: "failed" });
      }
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.worker) await this.worker.close(false);
    if (this.connection) await closeRedisConnection(this.connection);
  }
}

export async function createBullMqQueueConsumer(
  configuration: QueueConfiguration,
  logger: QueueLogger = structuredQueueLogger
): Promise<BullMqQueueConsumer> {
  if (!configuration.enabled || !configuration.redisUrl) {
    throw new QueueValidationError("The BullMQ worker is not enabled.");
  }

  const connection = createRedisConnection(configuration.redisUrl, "worker");
  await verifyRedisConnection(connection);

  return new BullMqQueueConsumer(
    (handler) =>
      new Worker<BullMqDeliveryPayload>(
        configuration.queueName,
        async (job: Job<BullMqDeliveryPayload>) => {
          await handler(deserializeDelivery(job.id, job.data));
        },
        {
          connection,
          prefix: configuration.queuePrefix,
          concurrency: configuration.workerConcurrency,
          autorun: false,
        }
      ),
    connection,
    logger
  );
}
