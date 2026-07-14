import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      database: "connected",
      provider: "prisma",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        provider: "prisma",
      },
      {
        status: 500,
      }
    );
  }
}