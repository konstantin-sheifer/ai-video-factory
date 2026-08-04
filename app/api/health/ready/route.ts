import { NextResponse } from "next/server";

import { checkReadiness, checkRedisConnectivity } from "@/lib/health/readiness";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const result = await checkReadiness(process.env, {
    checkDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    checkRedis: checkRedisConnectivity,
  });

  return NextResponse.json(
    {
      status: result.ready ? "ready" : "not_ready",
      checks: result.checks,
    },
    {
      status: result.ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
