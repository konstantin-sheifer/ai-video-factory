export type QueueLogFields = {
  event: string;
  jobId?: string;
  generationId?: string;
  queueReferenceId?: string;
  workerId?: string;
  status?: string;
  progress?: number;
  failureCategory?: string;
  retryAt?: string;
  outcome?: string;
};

export type QueueLogger = (fields: QueueLogFields) => void;

export const structuredQueueLogger: QueueLogger = (fields) => {
  console.info(
    JSON.stringify({
      component: "durable-generation-queue",
      timestamp: new Date().toISOString(),
      ...fields,
    })
  );
};
