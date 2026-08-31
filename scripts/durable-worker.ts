import { GenerationJobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BullMqJobQueue,
  createBullMqJobQueue,
} from "@/lib/queue/bullmq-job-queue";
import {
  BullMqQueueConsumer,
  createBullMqQueueConsumer,
} from "@/lib/queue/bullmq-queue-consumer";
import { loadQueueConfiguration } from "@/lib/queue/config";
import { DurableJobDispatcher } from "@/lib/queue/durable-job-dispatcher";
import { DurableJobRecovery } from "@/lib/queue/durable-job-recovery";
import { DurableWorkerExecutor } from "@/lib/queue/durable-worker-executor";
import { DurableWorkerRuntime } from "@/lib/queue/durable-worker-runtime";
import { metadataPreparationHandler } from "@/lib/queue/handlers/metadata-preparation-handler";
import { structuredQueueLogger } from "@/lib/queue/structured-log";
import { GenerationJobService } from "@/lib/services/generation-job-service";

async function main() {
  const configuration = loadQueueConfiguration();
  const lifecycle = new GenerationJobService();
  let queue: BullMqJobQueue | undefined;
  let consumer: BullMqQueueConsumer | undefined;

  try {
    queue = await createBullMqJobQueue(configuration);
    consumer = await createBullMqQueueConsumer(configuration);
  } catch (error) {
    await consumer?.close().catch(() => undefined);
    await queue?.close().catch(() => undefined);
    throw error;
  }

  const dispatcher = new DurableJobDispatcher(lifecycle, queue);
  const recovery = new DurableJobRecovery(lifecycle, dispatcher);
  const executor = new DurableWorkerExecutor(
    lifecycle,
    queue,
    { [GenerationJobType.planning]: metadataPreparationHandler },
    {
      workerIdentity: configuration.workerIdentity,
      leaseDurationMs: configuration.leaseDurationMs,
      heartbeatIntervalMs: configuration.heartbeatIntervalMs,
    }
  );
  const runtime = new DurableWorkerRuntime(consumer, executor, recovery, {
    recoveryIntervalMs: configuration.recoveryIntervalMs,
    recoveryBatchSize: configuration.recoveryBatchSize,
  });

  let stopping = false;
  const stop = async (signal: "SIGINT" | "SIGTERM") => {
    if (stopping) return;
    stopping = true;
    structuredQueueLogger({ event: "worker.shutdown_requested", outcome: signal });
    await runtime.shutdown();
    await prisma.$disconnect();
  };

  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));

  try {
    await runtime.start();
  } catch (error) {
    await runtime.shutdown().catch(() => undefined);
    throw error;
  }
}

main().catch(async () => {
  structuredQueueLogger({ event: "worker.startup_failed", outcome: "failed" });
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
