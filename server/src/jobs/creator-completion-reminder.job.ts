import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorProfileMailNotifier } from '../mail/creator-profile-mail.notifier';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Emails creators whose profile is still building (completeProfile = false) to
 * finish it, at ~30 minutes, 24 hours, and 48 hours after registration.
 *
 * - Idempotent: each stage is stamped on CreatorProfile once handled.
 * - Stops automatically once the profile goes live (completeProfile = true).
 * - Backfill guard: ignores profiles older than 7 days so enabling the feature
 *   never blasts the existing backlog.
 * - Off by default; enable with CREATOR_COMPLETION_REMINDERS_ENABLED=true.
 * - Delivery still respects each creator's emailNotificationsEnabled toggle and
 *   the SES suppression list (enforced in MailService).
 */
@Injectable()
export class CreatorCompletionReminderJob {
  private readonly logger = new Logger(CreatorCompletionReminderJob.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifier: CreatorProfileMailNotifier,
  ) {}

  private isEnabled(): boolean {
    return (
      this.config.get<string>('CREATOR_COMPLETION_REMINDERS_ENABLED') === 'true'
    );
  }

  @Cron('*/10 * * * *') // every 10 minutes
  async sendReminders(): Promise<void> {
    if (!this.isEnabled() || this.running) return;
    this.running = true;

    try {
      const now = Date.now();
      const t30 = new Date(now - 30 * MINUTE);
      const t24 = new Date(now - 24 * HOUR);
      const t48 = new Date(now - 48 * HOUR);
      const backfillFloor = new Date(now - 7 * 24 * HOUR);

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
        take: 100,
      });

      let sent = 0;
      for (const c of candidates) {
        // The latest stage whose threshold this profile has crossed.
        const stage: 1 | 2 | 3 =
          c.createdAt <= t48 ? 3 : c.createdAt <= t24 ? 2 : 1;

        const alreadySent =
          (stage === 1 && c.completionReminder30mAt !== null) ||
          (stage === 2 && c.completionReminder24hAt !== null) ||
          (stage === 3 && c.completionReminder48hAt !== null);
        if (alreadySent) continue;

        const at = new Date();
        const data: {
          completionReminder30mAt?: Date;
          completionReminder24hAt?: Date;
          completionReminder48hAt?: Date;
        } = {};
        // Stamp the current stage plus any earlier unsent stages, so a stale
        // earlier reminder never fires after a later one has gone out.
        if (stage >= 1 && c.completionReminder30mAt === null) {
          data.completionReminder30mAt = at;
        }
        if (stage >= 2 && c.completionReminder24hAt === null) {
          data.completionReminder24hAt = at;
        }
        if (stage >= 3 && c.completionReminder48hAt === null) {
          data.completionReminder48hAt = at;
        }

        await this.notifier.notifyCompletionReminder(c.id, stage);
        await this.prisma.creatorProfile.update({
          where: { id: c.id },
          data,
        });
        sent += 1;
      }

      if (sent > 0) {
        this.logger.log(`creator_completion_reminders sent=${sent}`);
      }
    } catch (err) {
      this.logger.warn(
        `creator_completion_reminders failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      this.running = false;
    }
  }
}
