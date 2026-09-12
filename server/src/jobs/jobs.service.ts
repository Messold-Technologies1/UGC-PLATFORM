import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  PREVIEW_RECONCILE_CRON,
  RECONCILE_BACKSTOP_CRON,
} from '../util/reconcile-schedule';
import { PreviewVideoQueueService } from '../preview-video/preview-video-queue.service';
import { previewReconcileWhere } from '../preview-video/preview-reconcile.where';
import { WatermarkQueueService } from './watermark-queue.service';

function isPrismaPoolTimeout(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2024'
  );
}

/** Total processing attempts before a delivery is terminal (`dead`). Mirrors
 *  WatermarkQueueService's cap so the safety net stops selecting exhausted rows. */
const MAX_ATTEMPTS = 6;
/** How old a stuck `processing` row must be before the safety net reclaims it. */
const STALE_PROCESSING_MS = 600_000; // 10 min
/** Rows fetched per page while draining the preview backlog. */
const PREVIEW_RECONCILE_BATCH = 25;
/** Safety bound so one reconcile run can't spin unbounded on a huge/failing set. */
const PREVIEW_RECONCILE_MAX_PER_RUN = 2000;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private reconcileRunning = false;
  private previewReconcileRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly watermarkQueue: WatermarkQueueService,
    private readonly previewQueue: PreviewVideoQueueService,
  ) {}

  /**
   * DB-truth safety net for the watermark pipeline.
   *
   * The primary path is enqueue -> BullMQ worker, with a per-delivery delayed
   * "recheck" job recovering the common worker-crash case within ~2 minutes.
   * Those both live in Redis, so they cannot cover the cases where Redis itself
   * fails (enqueue dropped while Redis is down, key eviction, data loss). The
   * database is the source of truth — a row still `pending`/`failed`, or stuck
   * in `processing`, means a preview is genuinely owed — so a low-frequency scan
   * against the DB is the real backstop.
   *
   * Runs on RECONCILE_BACKSTOP_CRON (hourly catch-all; see that constant) rather
   * than continuously. It is now only the rare backstop for a preview that Redis
   * dropped AND no brand is looking at: the common case recovers on read via
   * WatermarkQueueService.redriveOnReadIfOwed the moment a brand opens the order,
   * so a preview nobody is waiting on being up to ~1h late is fine. Shares the
   * expression with the ig-mirror and reel-sync backstops so all three fire on
   * the same tick — one database wake serves every sweep and Neon can autosuspend
   * between them.
   *
   * `dead` rows and those past the attempt budget are skipped so a poison
   * delivery is not re-driven forever.
   */
  @Cron(RECONCILE_BACKSTOP_CRON)
  async processStuckWatermarks(): Promise<void> {
    if (this.reconcileRunning) return;
    this.reconcileRunning = true;

    try {
      const staleBefore = new Date(Date.now() - 60_000); // 1 minute old
      const staleProcessingBefore = new Date(Date.now() - STALE_PROCESSING_MS);
      const stuck = await this.prisma.orderDelivery.findMany({
        where: {
          createdAt: { lte: staleBefore },
          previewAttempts: { lt: MAX_ATTEMPTS },
          order: { acceptedAt: null },
          OR: [
            { previewStatus: { in: ['pending', 'failed'] } },
            {
              previewStatus: 'processing',
              previewUpdatedAt: { lte: staleProcessingBefore },
            },
          ],
        },
        select: { id: true },
        take: 25,
      });

      if (stuck.length === 0) return;

      this.logger.log(`watermark_poller processing=${stuck.length}`);
      for (const d of stuck) {
        try {
          await this.watermarkQueue.processDeliveryDirect(d.id, 'poller');
        } catch {
          // logged inside processDeliveryDirect; next run retries
        }
      }
    } catch (err) {
      if (isPrismaPoolTimeout(err)) {
        this.logger.warn(
          'watermark_poller skipped: database connection pool busy (will retry)',
        );
        return;
      }
      throw err;
    } finally {
      this.reconcileRunning = false;
    }
  }

  /**
   * DB-truth backstop for the card-preview pipeline, and the slow-drip backfill
   * of pre-existing creators.
   *
   * The primary path is enqueue -> BullMQ worker (with an inline watchdog), fired
   * whenever a source video changes. This scan catches two cases that path
   * can't: a preview Redis dropped, and creators predating this feature (their
   * `previewVideoStatus` is NULL). The run-once backfill script does the initial
   * bulk; this just sweeps up stragglers.
   *
   * Runs twice a month (PREVIEW_RECONCILE_CRON) — preview generation is not
   * time-sensitive. Because it runs rarely, each run drains the owed rows
   * batch-by-batch (cursor-paged by id) up to a safety cap, rather than a fixed
   * page, so a sweep actually clears the backlog. `dead` rows and those past the
   * attempt budget are skipped by the shared predicate so a poison source isn't
   * re-driven forever.
   */
  @Cron(PREVIEW_RECONCILE_CRON)
  async processStuckPreviews(): Promise<void> {
    if (this.previewReconcileRunning) return;
    this.previewReconcileRunning = true;

    try {
      const staleProcessingBefore = new Date(Date.now() - STALE_PROCESSING_MS);
      const where = previewReconcileWhere(staleProcessingBefore);
      let cursor: string | undefined;
      let processed = 0;

      for (;;) {
        if (processed >= PREVIEW_RECONCILE_MAX_PER_RUN) {
          this.logger.warn(
            `preview_poller hit per-run cap ${PREVIEW_RECONCILE_MAX_PER_RUN}; remainder next run`,
          );
          break;
        }

        // Cursor-page by id: we only ever move forward, so a row that ends up
        // `failed` this run is not re-selected within the same run (avoids a
        // spin on a failing source); it is retried on the next sweep.
        const batch = await this.prisma.creatorProfile.findMany({
          where,
          select: { id: true },
          orderBy: { id: 'asc' },
          take: PREVIEW_RECONCILE_BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (batch.length === 0) break;

        this.logger.log(
          `preview_poller batch=${batch.length} processedSoFar=${processed}`,
        );
        for (const c of batch) {
          try {
            await this.previewQueue.processCreatorDirect(c.id, 'poller');
          } catch {
            // logged inside processCreatorDirect; next sweep retries
          }
        }
        cursor = batch[batch.length - 1].id;
        processed += batch.length;
      }

      if (processed > 0) {
        this.logger.log(`preview_poller done total=${processed}`);
      }
    } catch (err) {
      if (isPrismaPoolTimeout(err)) {
        this.logger.warn(
          'preview_poller skipped: database connection pool busy (will retry)',
        );
        return;
      }
      throw err;
    } finally {
      this.previewReconcileRunning = false;
    }
  }
}
