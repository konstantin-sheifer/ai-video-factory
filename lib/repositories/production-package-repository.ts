import "server-only";
import type { Generation, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PACKAGE_ARCHITECTURE } from "@/lib/production/contract";

export interface ProductionPackageStore {
  insert(data: Prisma.GenerationUncheckedCreateInput): Promise<Generation>;
  findOwned(id: string, owner: string): Promise<Generation | null>;
  claim(row: Generation): Promise<boolean>;
  finish(id: string, owner: string, succeeded: boolean, videoUrl?: string): Promise<void>;
}

/** Immutable snapshots: no method updates productionPackageJson or its digest. */
export class ProductionPackageRepository implements ProductionPackageStore {
  constructor(private readonly database: Prisma.TransactionClient = prisma) {}

  insert(data: Prisma.GenerationUncheckedCreateInput) {
    return this.database.generation.create({ data });
  }

  findOwned(id: string, owner: string) {
    return this.database.generation.findFirst({
      where: { id, userId: owner, architectureVersion: PACKAGE_ARCHITECTURE },
    });
  }

  async claim(row: Generation) {
    // Single compare-and-set, before any provider work. Even concurrent HTTP
    // requests cannot submit the same approved snapshot twice.
    const result = await this.database.generation.updateMany({
      where: {
        id: row.id, userId: row.userId, version: row.version,
        status: "queued", architectureVersion: PACKAGE_ARCHITECTURE,
        productionPackageJson: { equals: row.productionPackageJson as Prisma.InputJsonValue },
      },
      data: {
        status: "generating_video", currentStage: "video",
        version: { increment: 1 }, startedAt: new Date(),
      },
    });
    return result.count === 1;
  }

  async finish(id: string, owner: string, succeeded: boolean, videoUrl?: string) {
    const result = await this.database.generation.updateMany({
      where: { id, userId: owner, status: "generating_video", architectureVersion: PACKAGE_ARCHITECTURE },
      data: succeeded ? {
        // Video stage done, not a claim that voice/render/the film is complete.
        status: "processing", videoUrl, version: { increment: 1 },
      } : {
        status: "failed", failureCode: "video_submission_failed",
        failedAt: new Date(), version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new Error("Could not record video submission outcome.");
  }
}
