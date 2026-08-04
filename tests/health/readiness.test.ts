import assert from "node:assert/strict";
import test from "node:test";

import { checkReadiness } from "../../lib/health/readiness";

test("is ready without Redis when the queue is disabled", async () => {
  const result = await checkReadiness(
    { NODE_ENV: "test", QUEUE_ENABLED: "false" },
    { checkDatabase: async () => undefined }
  );

  assert.deepEqual(result, {
    ready: true,
    checks: { database: "up", queue: "disabled" },
  });
});

test("is not ready when PostgreSQL is unavailable", async () => {
  const result = await checkReadiness(
    { NODE_ENV: "test", QUEUE_ENABLED: "false" },
    {
      checkDatabase: async () => {
        throw new Error("unavailable");
      },
    }
  );

  assert.deepEqual(result, {
    ready: false,
    checks: { database: "down", queue: "disabled" },
  });
});

test("checks Redis only when the queue is enabled", async () => {
  let redisChecks = 0;
  const result = await checkReadiness(
    {
      NODE_ENV: "test",
      QUEUE_ENABLED: "true",
      REDIS_URL: "redis://queue.internal:6379",
    },
    {
      checkDatabase: async () => undefined,
      checkRedis: async () => {
        redisChecks += 1;
      },
    }
  );

  assert.equal(redisChecks, 1);
  assert.deepEqual(result, {
    ready: true,
    checks: { database: "up", queue: "up" },
  });
});

test("is not ready when enabled Redis is unavailable", async () => {
  const result = await checkReadiness(
    {
      NODE_ENV: "test",
      QUEUE_ENABLED: "true",
      REDIS_URL: "redis://queue.internal:6379",
    },
    {
      checkDatabase: async () => undefined,
      checkRedis: async () => {
        throw new Error("unavailable");
      },
    }
  );

  assert.deepEqual(result, {
    ready: false,
    checks: { database: "up", queue: "down" },
  });
});
