import type { QueueConsumer } from "./contracts";
import type { DurableJobRecovery } from "./durable-job-recovery";
import type { DurableWorkerExecutor } from "./durable-worker-executor";
import {
  structuredQueueLogger,
  type QueueLogger,
} from "./structured-log";

export type DurableWorkerRuntimeOptions = {
  recoveryIntervalMs: number;
  recoveryBatchSize: number;
};

export class DurableWorkerRuntime {
  private recoveryTimer?: ReturnType<typeof setInterval>;
  private recoveryRunning = false;
  private started = false;
  private shuttingDown = false;

  constructor(
    private readonly consumer: QueueConsumer,
    private readonly executor: DurableWorkerExecutor,
    private readonly recovery: DurableJobRecovery,
    private readonly options: DurableWorkerRuntimeOptions,
    private readonly logger: QueueLogger = structuredQueueLogger
  ) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.runRecovery();
    await this.consumer.start(async (delivery) => {
      const result = await this.executor.process(delivery.jobId);
      this.logger({
        event: "worker.delivery_processed",
        jobId: delivery.jobId,
        queueReferenceId: delivery.referenceId,
        outcome: result.outcome,
      });
    });

    this.recoveryTimer = setInterval(
      () => void this.runRecovery(),
      this.options.recoveryIntervalMs
    );
    this.logger({ event: "worker.ready", outcome: "ready" });
  }

  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    const consumerClose = this.consumer.close();
    await this.executor.shutdown();
    await consumerClose;
    this.logger({ event: "worker.stopped", outcome: "stopped" });
  }

  private async runRecovery(): Promise<void> {
    if (this.recoveryRunning || this.shuttingDown) return;
    this.recoveryRunning = true;
    try {
      const summary = await this.recovery.reconcile(
        new Date(),
        this.options.recoveryBatchSize
      );
      this.logger({
        event: "recovery.completed",
        outcome: summary.failed ? "partial" : "completed",
      });
    } catch {
      this.logger({ event: "recovery.scan_failed", outcome: "failed" });
    } finally {
      this.recoveryRunning = false;
    }
  }
}
