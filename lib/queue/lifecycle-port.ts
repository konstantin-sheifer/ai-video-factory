import type {
  GenerationJob,
  GenerationJobStatus,
  Prisma,
} from "@prisma/client";
import type { FailureInput } from "../domain/generation-lifecycle";

export type DurableJob = GenerationJob;

export interface DurableJobLifecycle {
  loadJob(id: string, userId: string): Promise<DurableJob>;
  loadJobForWorker(id: string): Promise<DurableJob>;
  queueJob(id: string, userId: string): Promise<DurableJob>;
  acquireLease(
    id: string,
    userId: string,
    leaseOwner: string,
    leaseDurationMs: number,
    now?: Date
  ): Promise<DurableJob>;
  renewLease(
    id: string,
    userId: string,
    leaseOwner: string,
    leaseDurationMs: number,
    now?: Date
  ): Promise<DurableJob>;
  validateLease(
    id: string,
    userId: string,
    leaseOwner: string,
    now?: Date
  ): Promise<DurableJob>;
  startJob(
    id: string,
    userId: string,
    leaseOwner: string,
    now?: Date
  ): Promise<DurableJob>;
  completeJob(
    id: string,
    userId: string,
    leaseOwner: string,
    outputJson?: Prisma.InputJsonValue,
    now?: Date
  ): Promise<DurableJob>;
  failJob(
    id: string,
    userId: string,
    failure: FailureInput,
    options?: {
      leaseOwner?: string;
      nextRetryAt?: Date;
      now?: Date;
    }
  ): Promise<DurableJob>;
  cancelJob(
    id: string,
    userId: string,
    reason: string
  ): Promise<DurableJob>;
  retryJob(id: string, userId: string, now?: Date): Promise<DurableJob>;
  updateProgress(
    id: string,
    userId: string,
    progress: number,
    leaseOwner?: string,
    now?: Date
  ): Promise<DurableJob>;
  getRetryBookkeeping(
    job: DurableJob,
    now?: Date
  ): {
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date | null;
    eligible: boolean;
  };
  listRecoveryCandidates(now?: Date, limit?: number): Promise<DurableJob[]>;
  recoverExpiredLease(id: string, now?: Date): Promise<DurableJob>;
}

export function isTerminalJobStatus(status: GenerationJobStatus): boolean {
  return (
    status === "succeeded" ||
    status === "dead_letter" ||
    status === "cancelled"
  );
}
