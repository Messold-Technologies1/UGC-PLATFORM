import { ConfigService } from '@nestjs/config';
import { WatermarkQueueService } from './watermark-queue.service';

/**
 * Unit tests for the on-read recovery guard (redriveOnReadIfOwed). This is the
 * predicate that decides, on a brand's read of an order's deliveries, whether to
 * re-drive an owed watermark preview. It must:
 *  - fire only when a preview is genuinely owed (pending / failed / stale
 *    processing), never for ready/dead or fresh processing;
 *  - respect the attempt budget so a poison delivery is not re-driven forever
 *    (the atomic claim does NOT cap attempts — this guard is the only cap on the
 *    read path);
 *  - be fire-and-forget: never throw, even when the underlying run rejects.
 */
describe('WatermarkQueueService.redriveOnReadIfOwed', () => {
  const MAX = 6;
  const STALE_MS = 600_000; // must match STALE_PROCESSING_MS in the service

  function makeService(): WatermarkQueueService {
    const config = {
      get: (key: string, def?: unknown) => {
        if (key === 'WATERMARK_ENABLED') return 'true';
        if (key === 'REDIS_URL') return undefined;
        if (key === 'WATERMARK_MAX_ATTEMPTS') return def ?? MAX;
        return def;
      },
    } as unknown as ConfigService;
    // watermark + prisma are unused by this method; onModuleInit is never called.
    return new WatermarkQueueService(config, {} as never, {} as never);
  }

  function spyOnRun(svc: WatermarkQueueService) {
    return jest
      .spyOn(svc, 'processDeliveryDirect')
      .mockResolvedValue(undefined);
  }

  it('re-drives a pending preview', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    svc.redriveOnReadIfOwed({
      id: 'd1',
      previewStatus: 'pending',
      previewAttempts: 0,
      previewUpdatedAt: null,
    });
    expect(run).toHaveBeenCalledWith('d1', 'on-read');
  });

  it('re-drives a failed preview', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    svc.redriveOnReadIfOwed({
      id: 'd2',
      previewStatus: 'failed',
      previewAttempts: 2,
      previewUpdatedAt: new Date(),
    });
    expect(run).toHaveBeenCalledWith('d2', 'on-read');
  });

  it('does NOT re-drive a ready or dead preview', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    for (const previewStatus of ['ready', 'dead']) {
      svc.redriveOnReadIfOwed({
        id: 'd',
        previewStatus,
        previewAttempts: 0,
        previewUpdatedAt: null,
      });
    }
    expect(run).not.toHaveBeenCalled();
  });

  it('re-drives processing only once it is past the stale window', () => {
    const svc = makeService();
    const run = spyOnRun(svc);

    // Fresh processing (someone is actively working it) — leave it alone.
    svc.redriveOnReadIfOwed({
      id: 'fresh',
      previewStatus: 'processing',
      previewAttempts: 1,
      previewUpdatedAt: new Date(Date.now() - 60_000), // 1 min ago
    });
    expect(run).not.toHaveBeenCalled();

    // Stale processing (claimed then abandoned mid-run) — re-drive.
    svc.redriveOnReadIfOwed({
      id: 'stale',
      previewStatus: 'processing',
      previewAttempts: 1,
      previewUpdatedAt: new Date(Date.now() - STALE_MS - 1_000),
    });
    expect(run).toHaveBeenCalledWith('stale', 'on-read');
  });

  it('respects the attempt budget (never re-drives an exhausted delivery)', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    // At the cap: a poison delivery that keeps failing must not be re-driven.
    svc.redriveOnReadIfOwed({
      id: 'poison',
      previewStatus: 'failed',
      previewAttempts: MAX,
      previewUpdatedAt: new Date(),
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('is fire-and-forget: swallows a rejected run without throwing', async () => {
    const svc = makeService();
    jest
      .spyOn(svc, 'processDeliveryDirect')
      .mockRejectedValue(new Error('boom'));
    expect(() =>
      svc.redriveOnReadIfOwed({
        id: 'd3',
        previewStatus: 'pending',
        previewAttempts: 0,
        previewUpdatedAt: null,
      }),
    ).not.toThrow();
    // let the swallowed rejection settle — no unhandled rejection should escape
    await Promise.resolve();
  });
});
