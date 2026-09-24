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
 * approval PENDING or APPROVED. REJECTED creators are left alone — they should
 * not be told to go finish their profile. A signup-date
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
 *   --apply           perform the writes (otherwise dry run)
 *   --days=N          only creators who signed up within N days (default 90;
 *                     0 = no cutoff)
 *   --skip-recent=N   leave creators who registered within N days alone. They
 *                     are still working through the drip they got at signup,
 *                     so restarting them means a second "finish your profile"
 *                     email within a day or two. Default 0 (include them).
 *   --batch=N         rows per page (default 200)
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
 * Idempotent: enrolling moves a creator's drip clock ahead of their signup date,
 * and the cohort only includes creators whose clock still equals their signup
 * date, so a second run enrolls nobody the first run already took.
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
 * "Has this script already enrolled them?" is answered by comparing the drip
 * clock to the signup date, not by how recent the clock is.
 *
 * Every creator starts with `completionReminderStartedAt` equal to `createdAt`
 * — that is the column default for a new signup, and what the migration
 * backfilled onto existing rows. Enrolling is the only thing that moves the
 * clock ahead of the signup date, so `clock <= createdAt` means "never
 * enrolled" exactly, with no time window to tune.
 *
 * Testing clock recency instead conflated two different creators: one this
 * script already enrolled, and one who simply registered days ago and is still
 * working through the drip they got at signup. The second group is part of the
 * campaign — excluding them silently dropped every recent signup from the
 * cohort.
 */
function neverEnrolledClause(
  prisma: PrismaService,
): Prisma.CreatorProfileWhereInput {
  return {
    completionReminderStartedAt: {
      lte: prisma.creatorProfile.fields.createdAt,
    },
  };
}

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
  const skipRecentDays = numericFlag('skip-recent', 0);

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

    // `--days` bounds how far back the campaign reaches; `--skip-recent`
    // optionally leaves the newest signups on the drip they already have.
    const signupBounds: Prisma.DateTimeFilter = {
      ...(cutoffDays > 0 ? { gte: new Date(now - cutoffDays * DAY_MS) } : {}),
      ...(skipRecentDays > 0
        ? { lt: new Date(now - skipRecentDays * DAY_MS) }
        : {}),
    };
    const signupWindow =
      Object.keys(signupBounds).length > 0 ? signupBounds : undefined;

    const where: Prisma.CreatorProfileWhereInput = {
      completeProfile: false,
      creatorApproval: {
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      },
      // A re-run must not restart a sequence this script already started.
      ...neverEnrolledClause(prisma),
      // Both signup-date bounds live in one clause; as two spreads the later
      // `createdAt` key would silently replace the earlier one.
      ...(signupWindow ? { createdAt: signupWindow } : {}),
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
      // Walk forward by id with a plain `gt` bound rather than Prisma's
      // cursor + skip:1. Enrolling moves a creator's clock, which drops them
      // out of `where`, so by the next page the cursor row is no longer in the
      // filtered set — and `skip: 1` then skips a row that IS still in it,
      // silently leaving creators unenrolled. A `gt` bound needs no row to
      // anchor on, so the walk covers the set exactly once.
      const batch = await prisma.creatorProfile.findMany({
        where: cursor ? { ...where, id: { gt: cursor } } : where,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
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
