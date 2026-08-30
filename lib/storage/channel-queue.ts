import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StarterConcept } from "@/lib/channels/starter-concepts";

export type ChannelAccessResult =
  | { status: "ok" }
  | { status: "forbidden" };

export async function ensureChannelForUser(input: {
  id: string;
  userId: string;
  name: string;
  category: string;
}): Promise<ChannelAccessResult> {
  const existing = await prisma.channel.findUnique({
    where: { id: input.id },
    select: { userId: true },
  });

  if (existing && existing.userId !== input.userId) return { status: "forbidden" };

  if (existing) {
    await prisma.channel.update({
      where: { id: input.id, userId: input.userId },
      data: { name: input.name, category: input.category },
    });
    return { status: "ok" };
  }

  try {
    await prisma.channel.create({ data: input });
    return { status: "ok" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const owner = await prisma.channel.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });
      return owner?.userId === input.userId ? { status: "ok" } : { status: "forbidden" };
    }
    throw error;
  }
}

export async function saveStarterConceptsForUser(
  channelId: string,
  userId: string,
  ideas: StarterConcept[]
) {
  return prisma.$transaction(async (transaction) => {
    const channel = await transaction.channel.findUnique({
      where: { id: channelId },
      select: { userId: true },
    });

    if (!channel || channel.userId !== userId) return null;

    await transaction.channelConcept.createMany({
      data: ideas.map((idea) => ({
        channelId,
        ...idea,
        fingerprint: fingerprint(idea.title),
      })),
      skipDuplicates: true,
    });

    return transaction.channelConcept.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
    });
  });
}

export async function getChannelQueueByUser(userId: string) {
  return prisma.channelConcept.findMany({
    where: { channel: { userId } },
    include: { channel: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChannelConceptsForUser(channelId: string, userId: string) {
  return prisma.channelConcept.findMany({
    where: { channelId, channel: { userId } },
    orderBy: { createdAt: "asc" },
  });
}

function fingerprint(title: string) {
  return title.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}
