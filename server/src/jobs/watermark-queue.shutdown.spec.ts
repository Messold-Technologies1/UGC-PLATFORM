import { ConfigService } from '@nestjs/config';
import { WatermarkQueueService } from './watermark-queue.service';

/**
 * Unit tests for the graceful-shutdown claim release.
 *
 * On Railway every redeploy SIGTERMs the worker mid-encode, so a restart during
 * a watermark run is routine rather than exceptional. Whatever this instance
 * had claimed is left in `processing`, and nothing may reclaim it until
 * STALE_PROCESSING_MS lapses — ten minutes in which the creator cannot submit
 * for that revision. Handing the claims back on the way out removes that wait.
 *
 * The attempt is refunded with it: processDeliveryDirect parks an over-budget
 * claim as `dead`, so charging a delivery for OUR deploy would let six
 * badly-timed restarts terminally kill a perfectly good video.
 */
describe('WatermarkQueueService shutdown claim release', () => {
  function makeService() {
    const config = {
      get: (key: string, def?: unknown) => {
        if (key === 'WATERMARK_ENABLED') return 'true';
        if (key === 'REDIS_URL') return undefined;
        return def;
      },
    } as unknown as ConfigService;

    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      orderDelivery: { updateMany },
    } as unknown as ConstructorParameters<typeof WatermarkQueueService>[2];

    const svc = new WatermarkQueueService(config, {} as never, prisma);
    return { svc, updateMany };
  }

  type ReleaseCall = [
    {
      where: { id: { in: string[] }; previewStatus: string };
      data: {
        previewStatus: string;
        previewAttempts: { decrement: number };
      };
    },
  ];

  function firstReleaseCall(updateMany: jest.Mock): ReleaseCall[0] {
    const calls = updateMany.mock.calls as ReleaseCall[];
    return calls[0][0];
  }

  /** Mark a delivery as in-flight on this instance, as a live claim would. */
  function markInFlight(svc: WatermarkQueueService, ...ids: string[]) {
    const inFlight = (svc as unknown as { processing: Set<string> }).processing;
    for (const id of ids) inFlight.add(id);
  }

  it('hands every in-flight claim back to pending and refunds the attempt', async () => {
    const { svc, updateMany } = makeService();
    markInFlight(svc, 'd1', 'd2');

    await svc.onModuleDestroy();

    expect(updateMany).toHaveBeenCalledTimes(1);
    const arg = firstReleaseCall(updateMany);
    expect(arg.where.id.in.sort()).toEqual(['d1', 'd2']);
    expect(arg.data.previewStatus).toBe('pending');
    expect(arg.data.previewAttempts).toEqual({ decrement: 1 });
  });

  it('only releases rows still claimed, so a run that just finished keeps its result', async () => {
    const { svc, updateMany } = makeService();
    markInFlight(svc, 'd1');

    await svc.onModuleDestroy();

    // The status guard is what stops a shutdown stomping a `ready` row written
    // moments earlier by an encode that beat us to the finish.
    expect(firstReleaseCall(updateMany).where.previewStatus).toBe('processing');
  });

  it('touches nothing when no claim is held', async () => {
    const { svc, updateMany } = makeService();

    await svc.onModuleDestroy();

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not let a failed release break shutdown', async () => {
    const { svc, updateMany } = makeService();
    updateMany.mockRejectedValue(new Error('database gone'));
    markInFlight(svc, 'd1');

    // Throwing here would stall the process past its grace period for no gain —
    // the stale-processing reclaim still covers these rows, just later.
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
  });
});
