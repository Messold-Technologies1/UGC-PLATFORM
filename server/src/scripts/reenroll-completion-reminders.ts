/**
 * Run-once re-enrollment of the existing Building-profile creators into the
 * "finish your profile" drip.
 *
 * The drip is measured from `completionReminderStartedAt`, which for a new
 * signup is the registration time. Creators who registered before this campaign
 * are long past every stage on that clock, so they would never receive the
 * sequence. This script moves their clock to "now" and clears their stage
 * stamps, which starts the four emails (+30min / +24h / day 3 / day 7) from the
 * moment it runs — including for creators who already received the previous
 * three-email version, whose copy this campaign replaces.
 *
 * Cohort = the admin "Building profile" segment: completeProfile = false with
 * approval PENDING or APPROVED. REJECTED and SHORTLISTED creators are left
 * alone — neither should be told to go finish their profile. A signup-date
 * cutoff (default 90 days) keeps long-dormant addresses out of the send, since
 * complaints and hard bounces from dead addresses cost sender reputation for
 * every other email the platform sends.
 *
 * DRY RUN BY DEFAULT: without --apply the script only reports what it would do.
 *
 * Usage (from server/):
 *   # see the cohort first — writes nothing, sends nothing
 *   BULLMQ_WORKER_ENABLED=false npm run reenroll:completion-reminders
 *   # actually enroll them
 *   BULLMQ_WORKER_ENABLED=false npm run reenroll:completion-reminders -- --apply
 *   # widen or narrow the signup-date cutoff
 *   BULLMQ_WORKER_ENABLED=false npm run reenroll:completion-reminders -- --apply --days=180
 *   # every building-profile creator, no cutoff
 *   BULLMQ_WORKER_ENABLED=false npm run reenroll:completion-reminders -- --apply --days=0
 *
 * Flags:
 *   --apply        perform the writes (otherwise dry run)
 *   --days=N       only creators who signed up within N days (default 90;
 *                  0 = no cutoff)
 *   --batch=N      rows per page (default 200)
 *
 * The script boots Config + Prisma only and talks to Redis directly, so it
 * starts no BullMQ worker and cannot process the jobs it schedules — passing
 * BULLMQ_WORKER_ENABLED=false is harmless but no longer necessary.
 *
 * Env:
 *   DATABASE_URL / DIRECT_URL     the usual app database env
 *   REDIS_URL                     optional; without it the backstop sweep
 *                                 delivers instead of the delayed jobs
 *   CREATOR_COMPLETION_REMINDERS_ENABLED must be 'true' for anything to send;
 *   the script refuses to --apply while it is off, since enrolling with the
 *   feature dark burns the cohort's stamps without delivering the emails.
 *
 * Idempotent in the way that matters: a second run re-enrolls only creators who
 * are still building, and a creator already mid-sequence is skipped (their clock
 * is recent), so an accidental re-run cannot restart the sequence for someone
 * already receiving it.
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { buildBullmqConnection } from '../jobs/bullmq-redis.connection';
import {
  buildCompletionReminderJobs,
  REMINDER_QUEUE_NAME,
  type ReminderJobData,
} from '../jobs/creator-reminder-jobs';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CUTOFF_DAYS = 90;
const DEFAULT_BATCH = 200;

/**
 * A creator whose clock is already this recent is mid-sequence — re-enrolling
 * them would restart the emails they are currently receiving.
 */
const ALREADY_ENROLLED_WINDOW_MS = 8 * DAY_MS;

// Config + Prisma only. The script enqueues through its own Queue rather than
// CreatorReminderQueueService on purpose: that service depends on
// CreatorReminderService -> the mail notifier -> the whole MailModule provider
// graph (orders, brand access, WhatsApp), none of which a data migration needs.
// Booting it here made the script fail at startup on an unrelated provider.
// The job definitions still come from one shared place, so nothing drifts.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
  ],
})
class ReenrollModule {}

function numericFlag(name: string, fallback: number): number {
  const raw = process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split('=')[1];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`--${name} must be a non-negative number, got "${raw}"`);
  }
  return Math.floor(parsed);
}

async function main(): Promise<void> {
  const logger = new Logger('reenroll-completion-reminders');
  const apply = process.argv.includes('--apply');
  const cutoffDays = numericFlag('days', DEFAULT_CUTOFF_DAYS);
  const batchSize = Math.max(1, numericFlag('batch', DEFAULT_BATCH));

  const app = await NestFactory.createApplicationContext(ReenrollModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const config = app.get(ConfigService);

  // Enqueue straight onto the reminder queue. Without Redis the enrollment
  // still happens and the 6-hourly backstop sweep delivers instead — slower,
  // and worth raising CREATOR_COMPLETION_REMINDER_SWEEP_BATCH for a big cohort.
  const redisUrl = config.get<string>('REDIS_URL');
  const queue = redisUrl
    ? new Queue<ReminderJobData>(REMINDER_QUEUE_NAME, {
        connection: buildBullmqConnection(redisUrl),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      })
    : null;
  if (queue) await queue.waitUntilReady();

  try {
    const remindersOn =
      config.get<string>('CREATOR_COMPLETION_REMINDERS_ENABLED') === 'true';
    if (apply && !remindersOn) {
      // Enrolling while the feature is dark would stamp every stage as handled
      // without sending anything, silently burning the campaign for this cohort.
      throw new Error(
        'CREATOR_COMPLETION_REMINDERS_ENABLED is not "true" — enable the ' +
          'reminders before enrolling, or the cohort is consumed without ' +
          'receiving the emails.',
      );
    }

    const now = Date.now();
    const where: Prisma.CreatorProfileWhereInput = {
      completeProfile: false,
      creatorApproval: {
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      },
      // Skip anyone already mid-sequence so a re-run never restarts their drip.
      completionReminderStartedAt: {
        lt: new Date(now - ALREADY_ENROLLED_WINDOW_MS),
      },
      ...(cutoffDays > 0
        ? { createdAt: { gte: new Date(now - cutoffDays * DAY_MS) } }
        : {}),
    };

    if (!queue) {
      logger.warn(
        'REDIS_URL not set — enrollment will be delivered by the 6-hourly ' +
          'backstop sweep rather than by delayed jobs. Each email can land up ' +
          'to 6 hours late, and a cohort larger than ' +
          'CREATOR_COMPLETION_REMINDER_SWEEP_BATCH per sweep drains slowly.',
      );
    }

    const total = await prisma.creatorProfile.count({ where });
    logger.log(
      `cohort: ${total} building-profile creator(s)` +
        (cutoffDays > 0
          ? ` who signed up in the last ${cutoffDays} day(s)`
          : ' (no signup-date cutoff)'),
    );

    if (!apply) {
      const sample = await prisma.creatorProfile.findMany({
        where,
        select: { id: true, displayName: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      for (const c of sample) {
        logger.log(
          `  would enroll ${c.id} (${c.displayName}, signed up ${c.createdAt.toISOString().slice(0, 10)})`,
        );
      }
      logger.log(
        `DRY RUN — nothing written, nothing sent. Re-run with --apply to enroll these ${total} creator(s).`,
      );
      return;
    }

    let cursor: string | undefined;
    let enrolled = 0;
    let failed = 0;

    for (;;) {
      // Cursor-page by id. Enrolled rows still match `where` only until their
      // clock moves, which the update below does, so paging by id (not offset)
      // keeps the walk stable either way.
      const batch = await prisma.creatorProfile.findMany({
        where,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      for (const creator of batch) {
        try {
          // One clock per creator, read back from the row: the delayed jobs
          // claim against this exact column, so the value must match.
          const { completionReminderStartedAt: startedAt } =
            await prisma.creatorProfile.update({
              where: { id: creator.id },
              data: {
                completionReminderStartedAt: new Date(),
                completionReminder30mAt: null,
                completionReminder24hAt: null,
                completionReminder72hAt: null,
                completionReminder168hAt: null,
              },
              select: { completionReminderStartedAt: true },
            });

          // Delayed jobs give each stage its exact time.
          for (const job of buildCompletionReminderJobs(
            creator.id,
            startedAt,
          )) {
            await queue?.add(job.name, job.data, job.opts);
          }
          enrolled++;
        } catch (err) {
          failed++;
          logger.error(
            `enroll failed for ${creator.id}: ${(err as Error)?.message}`,
          );
        }
      }

      logger.log(`progress: ${enrolled} enrolled (${failed} failed)`);
    }

    logger.log(
      `re-enrollment complete: ${enrolled} enrolled, ${failed} failed.` +
        (enrolled > 0 ? ' First email goes out ~30 minutes from now.' : ''),
    );
  } finally {
    await queue?.close().catch(() => undefined);
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('reenroll-completion-reminders crashed:', err);
    process.exit(1);
  });
