import { shouldRunInline } from './bullmq-watchdog.util';

describe('shouldRunInline', () => {
  const base = {
    state: 'wait',
    runningLocally: false,
    hasLocalWorker: true,
  };

  it('rescues a job sitting unconsumed', () => {
    expect(shouldRunInline({ ...base, state: 'wait' })).toBe(true);
    expect(shouldRunInline({ ...base, state: 'waiting' })).toBe(true);
  });

  it('rescues a job whose state could not be read', () => {
    // A hung Redis lookup must not mean the work silently never happens.
    expect(shouldRunInline({ ...base, state: 'missing' })).toBe(true);
    expect(shouldRunInline({ ...base, state: 'unknown' })).toBe(true);
  });

  it('leaves a completed job alone', () => {
    expect(shouldRunInline({ ...base, state: 'completed' })).toBe(false);
  });

  it('leaves a delayed job alone', () => {
    // `delayed` is how BullMQ holds a retry backoff (20-60s here, all longer
    // than the 15-20s watchdog) and how its limiter paces jobs. Treating it as
    // stuck made the watchdog fire on every retry, bypass the rate limiter, and
    // then let the delayed job run too — the same work twice.
    expect(shouldRunInline({ ...base, state: 'delayed' })).toBe(false);
  });

  it('leaves a terminally failed job alone', () => {
    // Re-running inline would hand it an extra attempt the budget refused.
    expect(shouldRunInline({ ...base, state: 'failed' })).toBe(false);
  });

  it('leaves an active job alone when this process is running it', () => {
    expect(
      shouldRunInline({ ...base, state: 'active', runningLocally: true }),
    ).toBe(false);
  });

  it('claims an active job with no live local handler — the zombie case', () => {
    // A stale BZPOPMIN consumer can move a job to `active` with nothing running
    // it. Only a process that should be consuming can tell that apart.
    expect(
      shouldRunInline({
        state: 'active',
        runningLocally: false,
        hasLocalWorker: true,
      }),
    ).toBe(true);
  });

  it('does not claim an active job on a queue-only replica', () => {
    // BULLMQ_WORKER_ENABLED=false: `active` means the worker replica has it, and
    // the local `processing` set is empty by definition — so the old condition
    // duplicated every job 15s after it was enqueued.
    expect(
      shouldRunInline({
        state: 'active',
        runningLocally: false,
        hasLocalWorker: false,
      }),
    ).toBe(false);
  });

  it('stands down entirely while the queue is deliberately throttled', () => {
    expect(shouldRunInline({ ...base, state: 'wait', throttled: true })).toBe(
      false,
    );
  });
});
