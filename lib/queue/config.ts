import "server-only";

import { QueueValidationError } from "./errors";

export type QueueConfiguration = {
  enabled: boolean;
  queueName: string;
  queuePrefix: string;
  workerIdentity: string;
  leaseDurationMs: number;
  heartbeatIntervalMs: number;
  workerConcurrency: number;
  redisUrl?: string;
};

export function loadQueueConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): QueueConfiguration {
  const enabled = parseBoolean(environment.QUEUE_ENABLED, false);
  const leaseDurationMs = parseInteger(
    environment.QUEUE_LEASE_DURATION_MS,
    60_000,
    1_000,
    15 * 60_000,
    "QUEUE_LEASE_DURATION_MS"
  );
  const heartbeatIntervalMs = parseInteger(
    environment.QUEUE_HEARTBEAT_INTERVAL_MS,
    15_000,
    250,
    leaseDurationMs - 1,
    "QUEUE_HEARTBEAT_INTERVAL_MS"
  );
  const workerConcurrency = parseInteger(
    environment.QUEUE_WORKER_CONCURRENCY,
    2,
    1,
    50,
    "QUEUE_WORKER_CONCURRENCY"
  );
  const redisUrl = environment.REDIS_URL?.trim();

  if (enabled && !redisUrl) {
    throw new QueueValidationError(
      "REDIS_URL is required when the durable queue is enabled."
    );
  }

  return {
    enabled,
    queueName: cleanName(
      environment.QUEUE_NAME,
      "ai-video-factory-generation"
    ),
    queuePrefix: cleanName(environment.QUEUE_PREFIX, "aivf"),
    workerIdentity: cleanName(
      environment.QUEUE_WORKER_IDENTITY,
      `worker-${process.pid}`
    ),
    leaseDurationMs,
    heartbeatIntervalMs,
    workerConcurrency,
    redisUrl: redisUrl || undefined,
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new QueueValidationError("QUEUE_ENABLED must be true or false.");
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string
): number {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new QueueValidationError(
      `${name} must be an integer between ${minimum} and ${maximum}.`
    );
  }
  return parsed;
}

function cleanName(value: string | undefined, fallback: string): string {
  const cleaned = (value || fallback).trim();
  if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(cleaned)) {
    throw new QueueValidationError(
      "Queue names and worker identities may contain only letters, numbers, dot, underscore, colon, and hyphen."
    );
  }
  return cleaned;
}
