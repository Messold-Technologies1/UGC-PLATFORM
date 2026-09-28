import {
  NotificationChannel,
  NotificationLogStatus,
  PrismaClient,
} from '@prisma/client';

/**
 * Writes NotificationLog rows for drip stages the legacy reminder service has
 * already sent, so the engine never repeats them.
 *
 * This is the one genuinely dangerous part of the cutover. Both paths schedule
 * from the same clock (`completionReminderStartedAt` / `withdrawnAt`), so a
 * creator who is three days into the completion drip has already had the 30min,
 * 24h and 3d emails. Without this, the engine's rows for those offsets would be
 * unclaimed, and it would send all three again the moment the flag flips.
 *
 * The legacy stamps are the record of what went out. Each becomes a SENT log
 * row at the matching offset, which the claim then refuses.
 *
 * Idempotent: the unique constraint means re-running inserts nothing new.
 * Run it BEFORE setting NOTIFICATIONS_SENDING_ENABLED=true.
 *
 *   npm run prisma:backfill:notification-drip-log
 */

const prisma = new PrismaClient();

const COMPLETION_EVENT = 'creator-profile-completion-reminder';
const RESUBMIT_EVENT = 'creator-profile-resubmit-reminder';

/** Stamp column -> the schedule offset it corresponds to, in minutes. */
const COMPLETION_STAGES = [
  ['completionReminder30mAt', 30],
  ['completionReminder24hAt', 1440],
  ['completionReminder72hAt', 4320],
  ['completionReminder168hAt', 10080],
] as const;

const RESUBMIT_STAGES = [
  ['resubmitReminder30mAt', 30],
  ['resubmitReminder24hAt', 1440],
  ['resubmitReminder48hAt', 2880],
] as const;

const BATCH = 500;

type Row = {
  eventKey: string;
  entityId: string;
  occurrenceKey: string;
  offsetMinutes: number;
  channel: NotificationChannel;
  recipientUserId: string | null;
  recipientProfileType: string;
  recipientProfileId: string;
  toAddress: string;
  status: NotificationLogStatus;
  sentAt: Date;
  claimedAt: Date;
  skippedReason: string | null;
};

function buildRows(params: {
  eventKey: string;
  profileId: string;
  userId: string | null;
  occurrenceKey: string;
  stamps: ReadonlyArray<readonly [string, number]>;
  source: Record<string, Date | null>;
}): Row[] {
  const rows: Row[] = [];
  for (const [column, offsetMinutes] of params.stamps) {
    const sentAt = params.source[column];
    if (!sentAt) continue;
    // One row per channel: the legacy path fired both together, so both are
    // already spent for this stage.
    for (const channel of [
      NotificationChannel.EMAIL,
      NotificationChannel.WHATSAPP,
    ]) {
      rows.push({
        eventKey: params.eventKey,
        entityId: params.profileId,
        occurrenceKey: params.occurrenceKey,
        offsetMinutes,
        channel,
        recipientUserId: params.userId,
        recipientProfileType: 'creator',
        recipientProfileId: params.profileId,
        // The legacy path did not record the address; the row exists to block a
        // resend, not to describe one.
        toAddress: '',
        status: NotificationLogStatus.SENT,
        sentAt,
        claimedAt: sentAt,
        skippedReason: null,
      });
    }
  }
  return rows;
}

async function backfillCompletion(): Promise<number> {
  let cursor: string | undefined;
  let written = 0;

  for (;;) {
    const profiles = await prisma.creatorProfile.findMany({
      where: {
        OR: COMPLETION_STAGES.map(([column]) => ({ [column]: { not: null } })),
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        userId: true,
        completionReminder30mAt: true,
        completionReminder24hAt: true,
        completionReminder72hAt: true,
        completionReminder168hAt: true,
      },
    });
    if (profiles.length === 0) break;

    const rows = profiles.flatMap((profile) =>
      buildRows({
        eventKey: COMPLETION_EVENT,
        profileId: profile.id,
        userId: profile.userId,
        // The completion drip runs once per profile, so the entity id serves.
        occurrenceKey: profile.id,
        stamps: COMPLETION_STAGES,
        source: profile as unknown as Record<string, Date | null>,
      }),
    );

    if (rows.length > 0) {
      const { count } = await prisma.notificationLog.createMany({
        data: rows,
        skipDuplicates: true,
      });
      written += count;
    }

    cursor = profiles[profiles.length - 1].id;
    console.log(`  completion: ${profiles.length} profile(s), ${written} row(s)`);
  }
  return written;
}

async function backfillResubmit(): Promise<number> {
  let cursor: string | undefined;
  let written = 0;

  for (;;) {
    const approvals = await prisma.creatorApproval.findMany({
      where: {
        OR: RESUBMIT_STAGES.map(([column]) => ({ [column]: { not: null } })),
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        creatorId: true,
        withdrawnAt: true,
        resubmitReminder30mAt: true,
        resubmitReminder24hAt: true,
        resubmitReminder48hAt: true,
        creator: { select: { userId: true } },
      },
    });
    if (approvals.length === 0) break;

    const rows = approvals.flatMap((approval) =>
      buildRows({
        eventKey: RESUBMIT_EVENT,
        profileId: approval.creatorId,
        userId: approval.creator.userId,
        // Matches what the emit passes: each withdraw is its own occurrence.
        occurrenceKey:
          approval.withdrawnAt?.toISOString() ?? approval.creatorId,
        stamps: RESUBMIT_STAGES,
        source: approval as unknown as Record<string, Date | null>,
      }),
    );

    if (rows.length > 0) {
      const { count } = await prisma.notificationLog.createMany({
        data: rows,
        skipDuplicates: true,
      });
      written += count;
    }

    cursor = approvals[approvals.length - 1].id;
    console.log(`  resubmit: ${approvals.length} approval(s), ${written} row(s)`);
  }
  return written;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    const [completion, resubmit] = await Promise.all([
      prisma.creatorProfile.count({
        where: {
          OR: COMPLETION_STAGES.map(([c]) => ({ [c]: { not: null } })),
        },
      }),
      prisma.creatorApproval.count({
        where: { OR: RESUBMIT_STAGES.map(([c]) => ({ [c]: { not: null } })) },
      }),
    ]);
    console.log(
      `Dry run: ${completion} profile(s) and ${resubmit} approval(s) carry drip stamps.`,
    );
    return;
  }

  console.log('Backfilling drip history into NotificationLog');
  const completion = await backfillCompletion();
  const resubmit = await backfillResubmit();
  console.log(
    `\nDone: ${completion + resubmit} row(s) written ` +
      `(${completion} completion, ${resubmit} resubmit).\n` +
      'Safe to set NOTIFICATIONS_SENDING_ENABLED=true.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
