import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SocialConnectionsService } from './social-connections.service';
import { SocialMetricsQueueService } from './social-metrics-queue.service';
import { InstagramMediaService } from './instagram-media.service';
import {
  IG_SYNC_PRIORITY,
  InstagramMediaQueueService,
} from './instagram-media-queue.service';

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
  private reelSyncRunning = false;
  private reelReconcileRunning = false;

  constructor(
    private readonly config: ConfigService,
    private readonly service: SocialConnectionsService,
    private readonly queue: SocialMetricsQueueService,
    private readonly media: InstagramMediaService,
    private readonly mediaQueue: InstagramMediaQueueService,
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

  /**
   * Nightly reel-cache refresh, at 20:00 UTC so it does not collide with the
   * 18:30 metrics pass.
   *
   * Only touches caches that already exist. An InstagramMediaSyncState row is
   * created the first time a creator's gallery is opened, so a creator who has
   * never used the import feature is never synced — refreshing a cache nobody
   * looks at is rate-limit budget spent on nothing.
   *
   * Enqueued at the lowest priority, so it can never delay a creator waiting on
   * a spinner or the prewarm that follows an OAuth connect.
   */
  @Cron('0 20 * * *')
  async refreshStaleReelCaches(): Promise<void> {
    if (!this.enabled()) return;
    if (this.config.get<string>('IG_MEDIA_SYNC_ENABLED') === 'false') return;
    if (this.reelSyncRunning) return;
    this.reelSyncRunning = true;
    try {
      // Six days, not seven: refresh just before the TTL expires so a creator
      // opening the gallery finds it warm rather than mid-sync.
      const ids = await this.media.listConnectionIdsWithStaleCache(6);
      if (ids.length === 0) return;
      this.logger.log(
        `ig-media cron: enqueuing ${ids.length} stale reel cache(s)`,
      );
      for (const id of ids) {
        // `auto`: a connection that has never synced gets its first batch (and
        // its paging frontier); everything else gets a top-of-account refresh
        // that leaves however far the creator has paged untouched.
        await this.mediaQueue.enqueue(id, {
          priority: IG_SYNC_PRIORITY.cron,
          mode: 'auto',
        });
      }
    } catch (err) {
      this.logger.error(`ig-media cron failed: ${(err as Error)?.message}`);
    } finally {
      this.reelSyncRunning = false;
    }
  }

  /**
   * DB-truth backstop for syncs that never finished.
   *
   * The queue's watchdog and BullMQ's stalled checker both live in Redis, so
   * neither covers a process dying mid-walk or Redis losing the job. The
   * database does: a state still SYNCING long after anything could plausibly be
   * running means nothing is. Modelled on JobsService.processStuckWatermarks.
   *
   * Every 15 minutes rather than continuously — a spinner clearing up to 15 min
   * late in a rare failure beats pinning the database awake with a poll.
   */
  @Cron('0 */15 * * * *')
  async reconcileStuckReelSyncs(): Promise<void> {
    if (!this.enabled()) return;
    if (this.config.get<string>('IG_MEDIA_SYNC_ENABLED') === 'false') return;
    if (this.reelReconcileRunning) return;
    this.reelReconcileRunning = true;
    try {
      await this.media.resetStuckSyncs();
    } catch (err) {
      this.logger.error(
        `ig-media reconcile failed: ${(err as Error)?.message}`,
      );
    } finally {
      this.reelReconcileRunning = false;
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
