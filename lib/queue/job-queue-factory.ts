import "server-only";

import type { JobQueue } from "./contracts";
import { createBullMqJobQueue } from "./bullmq-job-queue";
import { loadQueueConfiguration } from "./config";
import { DisabledJobQueue } from "./disabled-job-queue";

export async function createJobQueue(): Promise<JobQueue> {
  const configuration = loadQueueConfiguration();
  return configuration.enabled
    ? createBullMqJobQueue(configuration)
    : new DisabledJobQueue();
}
