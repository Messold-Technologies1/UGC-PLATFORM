/**
 * Shared rule for "is this job actually stuck?".
 *
 * Every queue in the codebase enqueues under a fixed jobId and then, after a
 * grace period, checks whether anything consumed it — running the work inline if
 * not. That fallback exists for a real failure mode: a stale BZPOPMIN consumer
 * can claim a job into `active` with no live handler on any process, and without
 * the inline pass those jobs are lost.
 *
 * But the original condition treated too much as stuck, and each queue paid for
 * it differently:
 *
 *  - `delayed` is a *healthy, scheduled* state. It is what BullMQ uses for a
 *    retry backoff (20–60s in these queues, all longer than the 15–20s
 *    watchdog, so the watchdog fired on every retry) and what its `limiter`
 *    uses to hold a job back. On the Instagram queue that meant the watchdog
 *    routinely ran the sync inline and bypassed the rate limiter the queue
 *    exists to enforce — then the delayed job ran too, doubling the Graph
 *    calls.
 *  - `active` on a process with no worker means another replica owns it. The
 *    zombie check keyed on a per-process `processing` set, which is empty by
 *    definition on a queue-only replica (BULLMQ_WORKER_ENABLED=false), so every
 *    enqueue there duplicated the worker replica's run 15s later.
 *
 * So: only step in when nothing is scheduled to run the job, and only claim a
 * zombie `active` job on a process that is supposed to be consuming.
 */
export type WatchdogJobState = string;

export function shouldRunInline(params: {
  /** Job state read from BullMQ, or 'missing' / 'unknown' when it could not be read. */
  state: WatchdogJobState;
  /** Whether this process is already running the work itself. */
  runningLocally: boolean;
  /** Whether this process opened a worker for the queue. */
  hasLocalWorker: boolean;
  /** Whether the queue is deliberately holding jobs back right now. */
  throttled?: boolean;
}): boolean {
  const { state, runningLocally, hasLocalWorker, throttled } = params;

  // A deliberate cool-down is not a stuck job.
  if (throttled) return false;

  switch (state) {
    // Finished, or already scheduled by BullMQ — nothing to rescue.
    case 'completed':
    case 'delayed':
    case 'prioritized':
    case 'waiting-children':
      return false;

    // Someone is running it. Ours -> leave it. Not ours -> only a process that
    // should be consuming can tell a zombie claim from another replica's work,
    // and even then only when it is not the one running it.
    case 'active':
      if (runningLocally) return false;
      return hasLocalWorker;

    // Failed terminally: BullMQ is done with it, and re-running inline would
    // silently give it a fourth attempt the retry budget already refused.
    case 'failed':
      return false;

    // Sitting unconsumed, or we could not find out. Both are what the inline
    // fallback is for.
    default:
      return true;
  }
}
