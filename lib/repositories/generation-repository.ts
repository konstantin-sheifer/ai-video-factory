import "server-only";

import type { Generation, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class GenerationRepository {
  constructor(private readonly database: Prisma.TransactionClient = prisma) {}

  create(data: Prisma.GenerationUncheckedCreateInput): Promise<Generation> {
    return this.database.generation.create({ data });
  }

  findOwned(id: string, userId: string): Promise<Generation | null> {
    return this.database.generation.findFirst({
      where: { id, userId },
    });
  }

  findOwnedByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<Generation | null> {
    return this.database.generation.findFirst({
      where: { userId, idempotencyKey },
    });
  }

  async ownsProject(projectId: string, userId: string): Promise<boolean> {
    const project = await this.database.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });

    return project !== null;
  }

  async updateOwned(
    id: string,
    userId: string,
    expectedVersion: number,
    data: Prisma.GenerationUpdateManyMutationInput
  ): Promise<Generation | null> {
    const result = await this.database.generation.updateMany({
      where: { id, userId, version: expectedVersion },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return this.findOwned(id, userId);
  }
}
