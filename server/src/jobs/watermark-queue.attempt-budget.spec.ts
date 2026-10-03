import { ConfigService } from '@nestjs/config';
import { WatermarkQueueService } from './watermark-queue.service';

/**
 * Unit tests for the attempt budget in processDeliveryDirect.
 *
 * The budget used to be enforced only in the callers' predicates, and the
 * terminal `dead` state only in this method's catch. That left a hole: a run
 * killed rather than thrown — an OOM mid-encode (watermarkVideo buffers the
 * whole file), a SIGTERM, a deploy — never reaches the catch, so the row keeps
 * the attempt increment from its claim and stays in `processing`. Once the
 * count reached the cap, every recovery path skipped it for being over budget
 * while OrdersService.assertDeliveryNotProcessing went on refusing the
 * creator's submits for that revision. Permanently stuck, and invisible.
 *
 * The cap now lives at claim time, which is the one choke point every caller
 * (worker, watchdog, delayed recheck, poller, on-read) goes through: an
 * over-budget claim parks the row `dead` instead of running it.
 */
describe('WatermarkQueueService.processDeliveryDirect attempt budget', () => {
  const MAX = 6;

  function makeService(opts: {
    /** previewAttempts the conditional UPDATE returns, or null for "not claimed". */
    claimedAttempt: number | null;
    watermark?: jest.Mock;
  }) {
    const config = {
      get: (key: string, def?: unknown) => {
        if (key === 'WATERMARK_ENABLED') return 'true';
        if (key === 'REDIS_URL') return undefined;
        if (key === 'WATERMARK_MAX_ATTEMPTS') return def ?? MAX;
        return def;
      },
    } as unknown as ConfigService;

    const update = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue(
          opts.claimedAttempt === null
            ? []
            : [{ previewAttempts: opts.claimedAttempt }],
        ),
      orderDelivery: { update },
    } as unknown as ConstructorParameters<typeof WatermarkQueueService>[2];

    const watermarkDelivery =
      opts.watermark ?? jest.fn().mockResolvedValue(undefined);
    const watermark = { watermarkDelivery } as unknown as ConstructorParameters<
      typeof WatermarkQueueService
    >[1];

    const svc = new WatermarkQueueService(config, watermark, prisma);
    return { svc, update, watermarkDelivery };
  }

  /** Delivery ids markDead wrote a `dead` park for. */
  function parkedDeadIds(update: jest.Mock): string[] {
    const calls = update.mock.calls as Array<
      [{ where: { id: string }; data: { previewStatus: string } }]
    >;
    return calls
      .filter(([arg]) => arg.data.previewStatus === 'dead')
      .map(([arg]) => arg.where.id);
  }

  function expectParkedDead(update: jest.Mock, deliveryId: string) {
    expect(parkedDeadIds(update)).toEqual([deliveryId]);
  }

  it('parks a delivery dead when the claim pushes it past the budget', async () => {
    // attempt = MAX + 1 is only reachable when an earlier attempt was killed
    // without ever recording failed/dead.
    const { svc, update, watermarkDelivery } = makeService({
      claimedAttempt: MAX + 1,
    });

    await svc.processDeliveryDirect('stranded', 'poller');

    expect(watermarkDelivery).not.toHaveBeenCalled();
    expectParkedDead(update, 'stranded');
  });

  it('still runs the final in-budget attempt', async () => {
    const { svc, update, watermarkDelivery } = makeService({
      claimedAttempt: MAX,
    });

    await svc.processDeliveryDirect('last-try', 'worker');

    // The cap is "past the budget", not "at it" — attempt MAX is allowed to run,
    // and succeeding here must not park the row.
    expect(watermarkDelivery).toHaveBeenCalledWith('last-try');
    expect(update).not.toHaveBeenCalled();
  });

  it('parks dead when the final in-budget attempt throws', async () => {
    const { svc, update } = makeService({
      claimedAttempt: MAX,
      watermark: jest.fn().mockRejectedValue(new Error('ffmpeg exploded')),
    });

    await expect(svc.processDeliveryDirect('poison', 'worker')).rejects.toThrow(
      'ffmpeg exploded',
    );

    expectParkedDead(update, 'poison');
  });

  it('runs normally while inside the budget', async () => {
    const { svc, update, watermarkDelivery } = makeService({
      claimedAttempt: 1,
    });

    await svc.processDeliveryDirect('fresh', 'worker');

    expect(watermarkDelivery).toHaveBeenCalledWith('fresh');
    expect(update).not.toHaveBeenCalled();
  });

  it('does nothing when the row could not be claimed', async () => {
    // Already ready/dead, or another instance holds the claim.
    const { svc, update, watermarkDelivery } = makeService({
      claimedAttempt: null,
    });

    await svc.processDeliveryDirect('taken', 'on-read');

    expect(watermarkDelivery).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rethrows for the worker but still parks the budget-spent row', async () => {
    // processDeliveryDirect rethrows so BullMQ can retry; the park must have
    // happened before that propagates, or the retry re-strands the row.
    const { svc, update } = makeService({
      claimedAttempt: MAX,
      watermark: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await svc.processDeliveryDirect('x', 'worker').catch(() => undefined);

    expectParkedDead(update, 'x');
  });
});
