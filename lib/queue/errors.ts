export class QueueError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "QueueError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class QueueUnavailableError extends QueueError {
  constructor(message = "The durable queue is unavailable.") {
    super("QUEUE_UNAVAILABLE", message, true);
    this.name = "QueueUnavailableError";
  }
}

export class QueueValidationError extends QueueError {
  constructor(message: string) {
    super("QUEUE_VALIDATION_ERROR", message, false);
    this.name = "QueueValidationError";
  }
}
