import {
  COMPLETION_STAGE_DELAY_MS,
  COMPLETION_STAGES,
  type CompletionStage,
  type ResubmitStage,
} from './creator-reminder.service';

/**
 * The reminder queue's wire format, shared by everything that writes to it.
 *
 * CreatorReminderQueueService is the normal producer, but the re-enrollment
 * script also has to enqueue the same jobs, and it deliberately does not boot
 * the queue service: that service depends on CreatorReminderService, which
 * depends on the mail notifier, which drags the whole MailModule provider graph
 * (orders, brand access, WhatsApp) into a script whose only real needs are
 * Postgres and Redis. Keeping the queue name, job name, jobId scheme and delay
 * arithmetic here lets both producers share one definition instead of the
 * script re-deriving — and silently drifting from — the scheduling rules.
 */
export const REMINDER_QUEUE_NAME = 'creator-completion-reminder';
export const REMINDER_JOB_NAME = 'reminder-stage';

export type ReminderKind = 'completion' | 'resubmit';

export interface ReminderJobData {
  profileId: string;
  stage: CompletionStage | ResubmitStage;
  /** Absent on legacy in-flight jobs → treated as 'completion'. */
  kind?: ReminderKind;
}

export interface ReminderJobSpec {
  name: string;
  data: ReminderJobData;
  opts: { jobId: string; delay: number };
}

/**
 * The four delayed jobs for one creator's completion drip, measured from
 * `startedAt` — the profile's `completionReminderStartedAt`, which is its
 * registration time for a new signup and "now" for a re-enrolled creator.
 *
 * Pass the value the database actually holds: each job's claim re-checks
 * due-ness against that column, so a timestamp that drifts from it would fire a
 * job that can never claim its stage.
 *
 * `startedAt` is part of the jobId, so re-enrolling a creator who was scheduled
 * once already is not swallowed by BullMQ as a duplicate. Delays are measured
 * from the sequence clock rather than from enqueue time, so a job added a while
 * after `startedAt` still lands on schedule instead of a full stage late.
 */
export function buildCompletionReminderJobs(
  profileId: string,
  startedAt: Date,
  now: number = Date.now(),
): ReminderJobSpec[] {
  const stamp = startedAt.getTime();
  const elapsed = now - stamp;

  return COMPLETION_STAGES.map((stage) => ({
    name: REMINDER_JOB_NAME,
    data: { profileId, stage },
    opts: {
      jobId: `crm-${profileId}-${stage}-${stamp}`,
      delay: Math.max(COMPLETION_STAGE_DELAY_MS[stage] - elapsed, 0),
    },
  }));
}
