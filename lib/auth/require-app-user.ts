import "server-only";

import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type AppUserIdentity = {
  clerkUserId: string;
  internalUserId: string;
};

export class AppAuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED";
  readonly status = 401;

  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AppAuthenticationError";
  }
}

export async function requireAppUser(): Promise<AppUserIdentity> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppAuthenticationError();
  }

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  if (existingUser) {
    return {
      clerkUserId,
      internalUserId: existingUser.id,
    };
  }

  try {
    const createdUser = await prisma.user.create({
      data: { clerkId: clerkUserId },
      select: { id: true },
    });

    return {
      clerkUserId,
      internalUserId: createdUser.id,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentlyCreatedUser = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });

      if (concurrentlyCreatedUser) {
        return {
          clerkUserId,
          internalUserId: concurrentlyCreatedUser.id,
        };
      }
    }

    throw error;
  }
}
