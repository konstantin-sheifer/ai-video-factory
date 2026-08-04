import "server-only";

import { connect as connectTcp, type Socket } from "node:net";
import { connect as connectTls } from "node:tls";

import { loadQueueConfiguration } from "../queue/config";

export type DependencyState = "up" | "down" | "disabled";

export type ReadinessResult = {
  ready: boolean;
  checks: {
    database: DependencyState;
    queue: DependencyState;
  };
};

type ReadinessDependencies = {
  checkDatabase: () => Promise<void>;
  checkRedis?: (url: string) => Promise<void>;
};

export async function checkReadiness(
  environment: NodeJS.ProcessEnv,
  dependencies: ReadinessDependencies
): Promise<ReadinessResult> {
  try {
    await dependencies.checkDatabase();
  } catch {
    return {
      ready: false,
      checks: {
        database: "down",
        queue: environment.QUEUE_ENABLED === "true" ? "down" : "disabled",
      },
    };
  }

  let queueConfiguration;

  try {
    queueConfiguration = loadQueueConfiguration(environment);
  } catch {
    return {
      ready: false,
      checks: { database: "up", queue: "down" },
    };
  }

  if (!queueConfiguration.enabled) {
    return {
      ready: true,
      checks: { database: "up", queue: "disabled" },
    };
  }

  if (!queueConfiguration.redisUrl || !dependencies.checkRedis) {
    return {
      ready: false,
      checks: { database: "up", queue: "down" },
    };
  }

  try {
    await dependencies.checkRedis(queueConfiguration.redisUrl);
    return {
      ready: true,
      checks: { database: "up", queue: "up" },
    };
  } catch {
    return {
      ready: false,
      checks: { database: "up", queue: "down" },
    };
  }
}

export async function checkRedisConnectivity(redisUrl: string): Promise<void> {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("Unsupported Redis protocol");
  }

  const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379));
  const commands = [
    ...(url.password
      ? [url.username ? ["AUTH", url.username, url.password] : ["AUTH", url.password]]
      : []),
    ["PING"],
  ];

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let response = "";
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const socket: Socket =
      url.protocol === "rediss:"
        ? connectTls({ host: url.hostname, port, servername: url.hostname })
        : connectTcp({ host: url.hostname, port });

    socket.setTimeout(2_000);
    socket.once("connect", () => {
      socket.write(commands.map(encodeRedisCommand).join(""));
    });
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (response.includes("-")) {
        finish(new Error("Redis rejected health check"));
      } else if (response.includes("+PONG\r\n")) {
        finish();
      }
    });
    socket.once("timeout", () => finish(new Error("Redis health check timed out")));
    socket.once("error", () => finish(new Error("Redis health check failed")));
    socket.once("close", () => {
      if (!settled) finish(new Error("Redis connection closed"));
    });
  });
}

function encodeRedisCommand(parts: string[]): string {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join("")}`;
}
