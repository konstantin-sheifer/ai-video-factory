import "server-only";

import type { GenerationJob, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class GenerationJobRepository {
  constructor(private readonly database: Prisma.TransactionClient = prisma) {}

  create(
    data: Prisma.GenerationJobUncheckedCreateInput
  ): Promise<GenerationJob> {
    return this.database.generationJob.create({ data });
  }

  findOwned(id: string, userId: string): Promise<GenerationJob | null> {
    return this.database.generationJob.findFirst({
      where: { id, userId },
    });
  }

  findOwnedByIdempotencyKey(
    userId: string,
    idempotencyKey: string
  ): Promise<GenerationJob | null> {
    return this.database.generationJob.findFirst({
      where: { userId, idempotencyKey },
    });
  }

  countOwnedDependencies(
    generationId: string,
    userId: string,
    jobIds: string[]
  ): Promise<number> {
    return this.database.generationJob.count({
      where: {
        id: { in: jobIds },
        generationId,
        userId,
      },
    });
  }

  async updateOwned(
    id: string,
    userId: string,
    expectedVersion: number,
    data: Prisma.GenerationJobUpdateManyMutationInput
  ): Promise<GenerationJob | null> {
    const result = await this.database.generationJob.updateMany({
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

  async acquireLease(
    id: string,
    userId: string,
    leaseOwner: string,
    leaseExpiresAt: Date,
    now: Date
  ): Promise<GenerationJob | null> {
    const result = await this.database.generationJob.updateMany({
      where: {
        id,
        userId,
        OR: [
          {
            AND: [
              { status: "queued" },
              {
                OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
              },
              {
                OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
              },
            ],
          },
          {
            status: "claimed",
            leaseExpiresAt: { lte: now },
          },
        ],
      },
      data: {
        status: "claimed",
        leaseOwner,
        leaseExpiresAt,
        heartbeatAt: now,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return this.findOwned(id, userId);
  }
}
