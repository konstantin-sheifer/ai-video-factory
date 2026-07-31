import "server-only";

import type { MediaAsset, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class MediaAssetRepository {
  constructor(private readonly database: Prisma.TransactionClient = prisma) {}

  create(data: Prisma.MediaAssetUncheckedCreateInput): Promise<MediaAsset> {
    return this.database.mediaAsset.create({ data });
  }

  findOwned(id: string, userId: string): Promise<MediaAsset | null> {
    return this.database.mediaAsset.findFirst({
      where: { id, userId },
    });
  }

  listForGeneration(
    generationId: string,
    userId: string
  ): Promise<MediaAsset[]> {
    return this.database.mediaAsset.findMany({
      where: { generationId, userId },
      orderBy: { createdAt: "asc" },
    });
  }
}
