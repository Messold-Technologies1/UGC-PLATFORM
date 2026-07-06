import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SocialConnectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocialConnectionsService } from './social-connections.service';
import { SocialMetricsQueueService } from './social-metrics-queue.service';

/**
 * Schedules the social-metrics pipeline. Instagram only exposes day-bucketed
 * insights with a short retention window, so we must snapshot daily to build our
 * own history. The cron only *enqueues* — the queue/worker does the fetching so
 * accounts are staggered and rate limits respected.
 *
 * Exact timing is intentionally non-critical: each sync re-pulls a rolling
 * multi-day window and upserts by date, so a missed run or a day Instagram
 * finalizes late self-heals on the next pass.
 */
@Injectable()
export class SocialMetricsCron {
  private readonly logger = new Logger(SocialMetricsCron.name);
  private dailyRunning = false;
  private reconcileRunning = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly service: SocialConnectionsService,
    private readonly queue: SocialMetricsQueueService,
  ) {}

  private enabled(): boolean {
    return this.config.get<string>('SOCIAL_METRICS_SYNC_ENABLED') !== 'false';
  }

  /**
   * Daily snapshot. 19:30 UTC ≈ 01:00 IST — after the previous day closes for
   * India-based creators. Enqueues a sync for every active connection.
   */
  @Cron('30 19 * * *')
  async dailySync(): Promise<void> {
    if (!this.enabled() || this.dailyRunning) return;
    this.dailyRunning = true;
    try {
      const ids = await this.service.listActiveConnectionIds();
      if (ids.length === 0) return;
      this.logger.log(
        `social daily sync: enqueuing ${ids.length} connection(s)`,
      );
      for (const id of ids) {
        await this.queue.enqueue(id);
      }
    } catch (err) {
      this.logger.error(`social daily sync failed: ${(err as Error)?.message}`);
    } finally {
      this.dailyRunning = false;
    }
  }

  /**
   * Hourly safety net: re-drive connections that have not synced in >26h (a
   * missed daily run, a worker crash, or a Redis blip) or are stuck in ERROR.
   */
  @Cron('0 * * * *')
  async reconcile(): Promise<void> {
    if (!this.enabled() || this.reconcileRunning) return;
    this.reconcileRunning = true;
    try {
      const staleBefore = new Date(Date.now() - 26 * 60 * 60_000);
      const stale = await this.prisma.socialConnection.findMany({
        where: {
          status: {
            in: [SocialConnectionStatus.ACTIVE, SocialConnectionStatus.ERROR],
          },
          OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lte: staleBefore } }],
        },
        select: { id: true },
        take: 100,
      });
      if (stale.length === 0) return;
      this.logger.log(`social reconcile: re-enqueuing ${stale.length}`);
      for (const c of stale) {
        await this.queue.enqueue(c.id);
      }
    } catch (err) {
      this.logger.error(`social reconcile failed: ${(err as Error)?.message}`);
    } finally {
      this.reconcileRunning = false;
    }
  }

  /** Refresh long-lived Instagram tokens nearing their 60-day expiry. */
  @Cron('0 3 * * *')
  async refreshTokens(): Promise<void> {
    if (!this.enabled()) return;
    try {
      const count = await this.service.refreshExpiringTokens();
      if (count > 0) {
        this.logger.log(`social token refresh: refreshed ${count} token(s)`);
      }
    } catch (err) {
      this.logger.error(
        `social token refresh failed: ${(err as Error)?.message}`,
      );
    }
  }
}
