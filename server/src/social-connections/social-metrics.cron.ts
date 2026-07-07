import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SocialConnectionsService } from './social-connections.service';
import { SocialMetricsQueueService } from './social-metrics-queue.service';

/**
 * Schedules the social-metrics pipeline. Each sync stores a single rolling
 * 30-day summary per connection (de-duplicated reach/views/profile-views) plus
 * current demographics — one row, overwritten each run. The cron only
 * *enqueues*; the queue/worker does the fetching so accounts are staggered and
 * rate limits respected.
 *
 * Cadence is ~every 3 days per connection: the cron runs daily but only enqueues
 * connections whose last sync is older than the interval (or in ERROR). That
 * gives even spacing, natural staggering, and automatic catch-up on missed runs.
 */
@Injectable()
export class SocialMetricsCron {
  private readonly logger = new Logger(SocialMetricsCron.name);
  private syncRunning = false;

  constructor(
    private readonly config: ConfigService,
    private readonly service: SocialConnectionsService,
    private readonly queue: SocialMetricsQueueService,
  ) {}

  private enabled(): boolean {
    return this.config.get<string>('SOCIAL_METRICS_SYNC_ENABLED') !== 'false';
  }

  /**
   * Daily at 18:30 UTC (≈00:00 IST). Enqueues connections due for a refresh
   * (never synced, >3 days old, or in ERROR).
   */
  @Cron('30 18 * * *')
  async syncDue(): Promise<void> {
    if (!this.enabled() || this.syncRunning) return;
    this.syncRunning = true;
    try {
      const ids = await this.service.listConnectionIdsDueForSync();
      if (ids.length === 0) return;
      this.logger.log(`social sync: enqueuing ${ids.length} due connection(s)`);
      for (const id of ids) {
        await this.queue.enqueue(id);
      }
    } catch (err) {
      this.logger.error(`social sync failed: ${(err as Error)?.message}`);
    } finally {
      this.syncRunning = false;
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
