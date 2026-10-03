import { ConfigService } from '@nestjs/config';
import { WatermarkQueueService } from './watermark-queue.service';

/**
 * Unit tests for the on-read recovery guard (redriveOnReadIfOwed). This is the
 * predicate that decides, on a brand's read of an order's deliveries, whether to
 * re-drive an owed watermark preview. It must:
 *  - fire only when a preview is genuinely owed (pending / failed / stale
 *    processing), never for ready/dead or fresh processing;
 *  - hand an over-budget delivery through anyway, so processDeliveryDirect's
 *    claim-time cap can park it `dead`. Capping HERE is what used to strand a
 *    delivery whose runs were killed rather than throwing: nothing marked it
 *    terminal, every recovery path skipped it for being over budget, and the
 *    submit guard refused the creator's uploads forever;
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

  it('still hands an over-budget delivery through, so it can be parked dead', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    // At the cap. The budget is no longer enforced here — processDeliveryDirect
    // parks it `dead` at claim time rather than running it. Skipping it here is
    // what left such a row non-terminal forever.
    svc.redriveOnReadIfOwed({
      id: 'poison',
      previewStatus: 'failed',
      previewAttempts: MAX,
      previewUpdatedAt: new Date(),
    });
    expect(run).toHaveBeenCalledWith('poison', 'on-read');
  });

  it('hands through a delivery stranded in processing at the cap', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    // The stranding case itself: runs killed mid-encode (OOM, SIGTERM, a
    // deploy) never hit the catch that marks a row failed/dead, so it sits in
    // `processing` at the cap — and assertDeliveryNotProcessing blocks every
    // further submit for that revision while it does.
    svc.redriveOnReadIfOwed({
      id: 'stranded',
      previewStatus: 'processing',
      previewAttempts: MAX,
      previewUpdatedAt: new Date(Date.now() - STALE_MS - 1_000),
    });
    expect(run).toHaveBeenCalledWith('stranded', 'on-read');
  });

  it('leaves a fresh processing delivery alone even at the cap', () => {
    const svc = makeService();
    const run = spyOnRun(svc);
    // Someone is actively working it — not stranded, nothing to park.
    svc.redriveOnReadIfOwed({
      id: 'running',
      previewStatus: 'processing',
      previewAttempts: MAX,
      previewUpdatedAt: new Date(Date.now() - 60_000),
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
