import "server-only";

import Redis from "ioredis";
import { QueueUnavailableError, QueueValidationError } from "./errors";

export type RedisConnectionRole = "publisher" | "worker" | "health";

export function validateRedisUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new QueueValidationError("REDIS_URL must be a valid Redis URL.");
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new QueueValidationError(
      "REDIS_URL must use the redis:// or rediss:// scheme."
    );
  }
  if (!parsed.hostname) {
    throw new QueueValidationError("REDIS_URL must include a hostname.");
  }
  if (parsed.pathname && parsed.pathname !== "/" && !/^\/\d+$/.test(parsed.pathname)) {
    throw new QueueValidationError(
      "REDIS_URL may contain only a numeric database path."
    );
  }

  return parsed;
}

export function createRedisConnection(
  redisUrl: string,
  role: RedisConnectionRole
): Redis {
  validateRedisUrl(redisUrl);

  return new Redis(redisUrl, {
    connectionName: `aivf-${role}`,
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: role === "worker" ? null : 1,
  });
}

export async function verifyRedisConnection(connection: Redis): Promise<void> {
  try {
    if (connection.status === "wait") await connection.connect();
    await connection.ping();
  } catch {
    connection.disconnect(false);
    throw new QueueUnavailableError("The durable queue connection failed.");
  }
}

export async function closeRedisConnection(connection: Redis): Promise<void> {
  if (connection.status === "end") return;
  try {
    await connection.quit();
  } catch {
    connection.disconnect(false);
  }
}
