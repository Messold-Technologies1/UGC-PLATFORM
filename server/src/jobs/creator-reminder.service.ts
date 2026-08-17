import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorProfileMailNotifier } from '../mail/creator-profile-mail.notifier';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type ReminderStage = 1 | 2 | 3;
export const REMINDER_STAGES: readonly ReminderStage[] = [1, 2, 3];

/** How long after signup each stage becomes due. */
export const STAGE_DELAY_MS: Record<ReminderStage, number> = {
  1: 30 * MINUTE,
  2: 24 * HOUR,
  3: 48 * HOUR,
};

const DEFAULT_BACKFILL_DAYS = 7;

/**
 * Core "finish your profile" reminder logic, shared by two callers:
 *
 * - CreatorReminderQueueService schedules a per-creator delayed job for each
 *   stage at signup and calls {@link deliverStage} when it fires (the precise,
 *   event-driven path — this is how drip/journey emails work).
 * - The same service runs {@link runBackstopSweep} on a low-frequency cron as
 *   the DB-truth safety net for the cases Redis can't cover (jobs lost to a
 *   Redis restart/eviction, the feature enabled after signups already existed).
 *
 * Idempotency is enforced in the database: each stage is claimed with a
 * conditional UPDATE that stamps its `completionReminder*At` column only if it
 * is still null, so the delayed job and the sweep (and multiple instances) can
 * never double-send. Delivery still respects each creator's
 * emailNotificationsEnabled toggle and the SES suppression list (enforced in
 * MailService / the notifier).
 */
@Injectable()
export class CreatorReminderService {
  private readonly logger = new Logger(CreatorReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifier: CreatorProfileMailNotifier,
  ) {}

  isEnabled(): boolean {
    return (
      this.config.get<string>('CREATOR_COMPLETION_REMINDERS_ENABLED') === 'true'
    );
  }

  private backfillDays(): number {
    const raw = Number(
      this.config.get<string>('CREATOR_COMPLETION_REMINDER_BACKFILL_DAYS'),
    );
    return Number.isFinite(raw) && raw >= 1
      ? Math.floor(raw)
      : DEFAULT_BACKFILL_DAYS;
  }

  private stampNullWhere(stage: ReminderStage): Record<string, null> {
    switch (stage) {
      case 1:
        return { completionReminder30mAt: null };
      case 2:
        return { completionReminder24hAt: null };
      case 3:
        return { completionReminder48hAt: null };
    }
  }

  private stampData(stage: ReminderStage, value: Date | null): {
    completionReminder30mAt?: Date | null;
    completionReminder24hAt?: Date | null;
    completionReminder48hAt?: Date | null;
  } {
    switch (stage) {
      case 1:
        return { completionReminder30mAt: value };
      case 2:
        return { completionReminder24hAt: value };
      case 3:
        return { completionReminder48hAt: value };
    }
  }

  private stampOf(
    profile: {
      completionReminder30mAt: Date | null;
      completionReminder24hAt: Date | null;
      completionReminder48hAt: Date | null;
    },
    stage: ReminderStage,
  ): Date | null {
    switch (stage) {
      case 1:
        return profile.completionReminder30mAt;
      case 2:
        return profile.completionReminder24hAt;
      case 3:
        return profile.completionReminder48hAt;
    }
  }

  /**
   * Atomically claim a stage: stamp its column only if the profile is still
   * incomplete, the stage is actually due, and the column is null. Returns true
   * only for the single caller whose UPDATE flipped the row — the cross-path,
   * cross-instance send lock.
   */
  private async claimStage(
    profileId: string,
    stage: ReminderStage,
    now: number,
  ): Promise<boolean> {
    const dueBefore = new Date(now - STAGE_DELAY_MS[stage]);
    const res = await this.prisma.creatorProfile.updateMany({
      where: {
        id: profileId,
        completeProfile: false,
        createdAt: { lte: dueBefore },
        ...this.stampNullWhere(stage),
      },
      data: this.stampData(stage, new Date()),
    });
    return res.count === 1;
  }

  /** Release a claim so a retry / the backstop can re-send after a send failure. */
  private async releaseStage(
    profileId: string,
    stage: ReminderStage,
  ): Promise<void> {
    await this.prisma.creatorProfile
      .update({ where: { id: profileId }, data: this.stampData(stage, null) })
      .catch(() => undefined);
  }

  /** Mark a stage handled without sending — used to retire stale earlier stages. */
  private async silentStamp(
    profileId: string,
    stage: ReminderStage,
  ): Promise<void> {
    await this.prisma.creatorProfile.updateMany({
      where: { id: profileId, ...this.stampNullWhere(stage) },
      data: this.stampData(stage, new Date()),
    });
  }

  /** Claim a stage and send its email; roll the claim back if the send throws. */
  private async sendStageWithClaim(
    profileId: string,
    stage: ReminderStage,
    now: number,
  ): Promise<boolean> {
    if (!(await this.claimStage(profileId, stage, now))) return false;
    try {
      await this.notifier.notifyCompletionReminder(profileId, stage);
      return true;
    } catch (err) {
      await this.releaseStage(profileId, stage);
      this.logger.warn(
        `creator_reminder stage ${stage} send failed for ${profileId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }

  /**
   * Deliver one stage for one creator. Called by the delayed job when it fires.
   *
   * - Profile already live → nothing to do (exit condition).
   * - A later stage already went out → this earlier nudge is stale; retire it
   *   silently instead of sending "finish in 30 min" a day late.
   * - Otherwise claim + send (idempotent; no-op if already sent).
   */
  async deliverStage(profileId: string, stage: ReminderStage): Promise<void> {
    if (!this.isEnabled()) return;

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: profileId },
      select: {
        completeProfile: true,
        completionReminder30mAt: true,
        completionReminder24hAt: true,
        completionReminder48hAt: true,
      },
    });
    if (!profile || profile.completeProfile) return;
    if (this.stampOf(profile, stage) !== null) return; // already handled

    const laterAlreadySent = REMINDER_STAGES.some(
      (s) => s > stage && this.stampOf(profile, s) !== null,
    );
    if (laterAlreadySent) {
      await this.silentStamp(profileId, stage);
      return;
    }

    const sent = await this.sendStageWithClaim(profileId, stage, Date.now());
    if (sent) {
      this.logger.log(`creator_reminder delivered stage=${stage} ${profileId}`);
    }
  }

  /**
   * DB-truth backstop. Finds still-incomplete profiles inside the backfill
   * window with an unsent-but-due stage and, for each, sends only the most
   * recent stage it has crossed (retiring earlier ones silently so a creator
   * never gets an out-of-date nudge). Idempotent with the delayed-job path via
   * the same atomic claim.
   */
  async runBackstopSweep(): Promise<void> {
    if (!this.isEnabled()) return;

    const now = Date.now();
    const t30 = new Date(now - STAGE_DELAY_MS[1]);
    const t24 = new Date(now - STAGE_DELAY_MS[2]);
    const t48 = new Date(now - STAGE_DELAY_MS[3]);
    const backfillFloor = new Date(now - this.backfillDays() * DAY);

    const candidates = await this.prisma.creatorProfile.findMany({
      where: {
        completeProfile: false,
        createdAt: { lte: t30, gte: backfillFloor },
        OR: [
          { completionReminder30mAt: null },
          { completionReminder24hAt: null },
          { completionReminder48hAt: null },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        completionReminder30mAt: true,
        completionReminder24hAt: true,
        completionReminder48hAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    let sent = 0;
    for (const c of candidates) {
      const highest: ReminderStage =
        c.createdAt <= t48 ? 3 : c.createdAt <= t24 ? 2 : 1;

      // Retire any earlier unsent stages without emailing them.
      for (const s of REMINDER_STAGES) {
        if (s < highest && this.stampOf(c, s) === null) {
          await this.silentStamp(c.id, s);
        }
      }

      if (this.stampOf(c, highest) === null) {
        try {
          if (await this.sendStageWithClaim(c.id, highest, now)) sent += 1;
        } catch {
          // send failure logged + claim released; next sweep retries
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`creator_reminder backstop sent=${sent}`);
    }
  }
}
