export class TimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, label?: string) {
    super(
      label
        ? `${label} timed out after ${timeoutMs}ms`
        : `Operation timed out after ${timeoutMs}ms`,
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/** Reject if `promise` does not settle within `timeoutMs` (does not cancel the underlying work). */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label?: string,
): Promise<T> {
  if (timeoutMs <= 0) return promise;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TimeoutError(timeoutMs, label)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
