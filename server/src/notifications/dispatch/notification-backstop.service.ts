import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationLogStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationStepService } from './notification-step.service';
import { notificationsSendingEnabled } from '../sending-enabled';
import type { StepJobData } from '../queues/notification-queues';

/**
 * Recovers sends whose delayed job is gone.
 *
 * Delayed jobs live in Redis, so a restart or an eviction can drop one and the
 * send would simply never happen — silently, since nothing is watching for a
 * job that does not arrive. The log knows better: a row claimed long ago and
 * still QUEUED is a send that was started and never finished.
 *
 * Deliberately infrequent. The existing reminder backstop is careful to sweep
 * rarely so the Neon compute endpoint can autosuspend between signups, and this
 * keeps that property.
 */
@Injectable()
export class NotificationBackstopService {
  private readonly logger = new Logger(NotificationBackstopService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly step: NotificationStepService,
  ) {}

  /**
   * A row is only considered lost once it is well past the point where a live
   * worker would have finished it, so a send in flight is never duplicated.
   */
  private static readonly STALE_MINUTES = 30;
  private static readonly BATCH = 200;

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<{ recovered: number }> {
    // Nothing to recover while the legacy path is still the one sending.
    if (!notificationsSendingEnabled(this.config)) return { recovered: 0 };
    if (this.running) {
      this.logger.warn('backstop: previous run still going, skipping');
      return { recovered: 0 };
    }
    this.running = true;

    try {
      const staleBefore = new Date(
        Date.now() - NotificationBackstopService.STALE_MINUTES * 60_000,
      );

      const stuck = await this.prisma.notificationLog.findMany({
        where: {
          status: NotificationLogStatus.QUEUED,
          claimedAt: { lt: staleBefore },
        },
        orderBy: { queuedAt: 'asc' },
        take: NotificationBackstopService.BATCH,
        select: {
          id: true,
          eventKey: true,
          entityId: true,
          occurrenceKey: true,
          offsetMinutes: true,
          channel: true,
          queuedAt: true,
        },
      });
      if (stuck.length === 0) return { recovered: 0 };

      // One job per (entity, offset): the step worker handles every channel of
      // a row, so two stuck channels are one piece of work.
      const seen = new Set<string>();
      let recovered = 0;

      for (const row of stuck) {
        const key = `${row.eventKey}|${row.entityId}|${row.occurrenceKey}|${row.offsetMinutes}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const job: StepJobData = {
          eventKey: row.eventKey,
          entityId: row.entityId,
          occurrenceKey: row.occurrenceKey,
          // Already due — the delay was consumed by whatever lost the job.
          occurredAt: row.queuedAt.toISOString(),
          offsetMinutes: row.offsetMinutes,
          channels: [],
        };

        try {
          // Run it here rather than re-enqueueing: the claim is already stale,
          // so deliver() re-claims it and proceeds.
          await this.step.deliver(job);
          recovered += 1;
        } catch (err) {
          this.logger.warn(
            `backstop: ${key} failed again: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      this.logger.log(
        `backstop recovered ${recovered} send(s) whose delayed job was lost`,
      );
      return { recovered };
    } finally {
      this.running = false;
    }
  }
}
