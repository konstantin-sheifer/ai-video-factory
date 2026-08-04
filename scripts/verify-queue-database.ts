import {
  GenerationJobType,
  GenerationStatus,
  PrismaClient,
} from "@prisma/client";
import { GenerationJobRepository } from "../lib/repositories/generation-job-repository";
import { GenerationRepository } from "../lib/repositories/generation-repository";
import { GenerationJobService } from "../lib/services/generation-job-service";
import { GenerationService } from "../lib/services/generation-service";

const prisma = new PrismaClient();
const rollback = new Error("ROLLBACK_QUEUE_DATABASE_CHECK");

async function main(): Promise<void> {
  try {
    try {
      await prisma.$transaction(async (transaction) => {
      const owner = await transaction.user.create({
        data: { clerkId: `queue-check-${crypto.randomUUID()}` },
      });
      const project = await transaction.project.create({
        data: {
          userId: owner.id,
          title: "Queue integration check",
          idea: "Queue integration check",
          videoUrl: "",
        },
      });
      const generations = new GenerationRepository(transaction);
      const jobs = new GenerationJobRepository(transaction);
      const generationService = new GenerationService(generations);
      const jobService = new GenerationJobService(jobs, generations);
      const generation = await generationService.createGeneration({
        userId: owner.id,
        projectId: project.id,
        idea: "Queue integration check",
        prompt: "Queue integration check",
        idempotencyKey: `queue-generation-${crypto.randomUUID()}`,
      });

      await generationService.transitionGenerationState(
        generation.id,
        owner.id,
        GenerationStatus.processing,
        { progress: 10 }
      );

      const job = await jobService.createJob({
        userId: owner.id,
        generationId: generation.id,
        type: GenerationJobType.planning,
        stageKey: "metadata-preparation",
        idempotencyKey: `queue-job-${crypto.randomUUID()}`,
        maxAttempts: 2,
      });
      const leased = await jobService.acquireLease(
        job.id,
        owner.id,
        "database-check-worker",
        5_000
      );
      await jobService.startJob(
        leased.id,
        owner.id,
        "database-check-worker"
      );
      const renewed = await jobService.renewLease(
        leased.id,
        owner.id,
        "database-check-worker",
        5_000
      );

      if (
        !renewed.leaseExpiresAt ||
        renewed.leaseOwner !== "database-check-worker"
      ) {
        throw new Error("Lease renewal did not persist.");
      }

      await transaction.generationJob.update({
        where: { id: job.id },
        data: { leaseExpiresAt: new Date(Date.now() - 1) },
      });
      const recovered = await jobService.recoverExpiredLease(job.id);

      if (recovered.status !== "failed" || !recovered.nextRetryAt) {
        throw new Error("Expired running lease was not made retryable.");
      }

      await jobService.retryJob(job.id, owner.id, new Date(Date.now() + 1));
      const queued = await jobService.queueJob(job.id, owner.id);
      if (queued.status !== "queued") {
        throw new Error("Recovered job did not return to queued state.");
      }

        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    console.log("Rollback-only queue database integration check passed.");
  } finally {
    await prisma.$disconnect();
  }
}

void main();
