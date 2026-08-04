import type { GenerationJobType, Prisma } from "@prisma/client";
import type { DurableJob } from "./lifecycle-port";

export type JobHandlerContext = {
  job: DurableJob;
  signal: AbortSignal;
  checkpoint(progress?: number): Promise<void>;
};

export type JobHandler = (
  context: JobHandlerContext
) => Promise<Prisma.InputJsonValue | undefined>;

export type JobHandlerRegistry = Partial<
  Record<GenerationJobType, JobHandler>
>;

export class JobHandlerFailure extends Error {
  readonly category: string;
  readonly code?: string;
  readonly retryable: boolean;
  readonly retryDelayMs?: number;

  constructor(options: {
    category: string;
    code?: string;
    message: string;
    retryable: boolean;
    retryDelayMs?: number;
  }) {
    super(options.message);
    this.name = "JobHandlerFailure";
    this.category = options.category;
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryDelayMs = options.retryDelayMs;
  }
}

export class JobCancellationSignal extends Error {
  constructor() {
    super("Durable job cancellation was observed.");
    this.name = "JobCancellationSignal";
  }
}

export class JobLeaseLostSignal extends Error {
  constructor() {
    super("Durable job lease ownership was lost.");
    this.name = "JobLeaseLostSignal";
  }
}
