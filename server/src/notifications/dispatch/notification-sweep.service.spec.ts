import { NotificationChannel } from '@prisma/client';
import { NotificationSweepService } from './notification-sweep.service';
import type { PopulationSpec } from '../catalog/define-events';

const EVENT = 'creator-profile-completion-reminder';
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** The completion drip's offsets. */
const ROWS = [30, 1440, 4320, 10080].map((offsetMinutes) => ({
  offsetMinutes,
  channels: [NotificationChannel.EMAIL],
}));

function build(profiles: Array<{ id: string; ageMs: number }>, rows = ROWS) {
  const prisma = {
    notificationEvent: {
      findUnique: jest.fn().mockResolvedValue({
        isActive: true,
        deprecated: false,
        schedule: rows,
      }),
    },
    notificationLog: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const queues = { enqueueStep: jest.fn().mockResolvedValue(undefined) };

  const population: PopulationSpec = {
    cron: '0 10 * * *',
    highestDueOnly: true,
    page: jest.fn((_ctx, cursor: string | null) =>
      Promise.resolve(
        cursor
          ? []
          : profiles.map((p) => ({
              id: p.id,
              clockAt: new Date(Date.now() - p.ageMs),
            })),
      ),
    ),
  };

  const service = new NotificationSweepService(
    prisma as never,
    { get: jest.fn(() => 'https://app.test') } as never,
    {} as never,
    queues as never,
  );

  return { service, prisma, queues, population };
}

const offsetsEnqueued = (queues: { enqueueStep: jest.Mock }): number[] =>
  (queues.enqueueStep.mock.calls as Array<[{ offsetMinutes: number }]>).map(
    ([job]) => job.offsetMinutes,
  );

describe('NotificationSweepService', () => {
  it('sends only the latest due row to a long-dormant profile', async () => {
    // Registered eight months ago: every row is due. Without highestDueOnly
    // they would receive the entire drip at once.
    const { service, queues, population } = build([
      { id: 'c1', ageMs: 240 * DAY },
    ]);

    const result = await service.sweep(EVENT, population);

    expect(offsetsEnqueued(queues)).toEqual([10080]);
    expect(result.enqueued).toBe(1);
  });

  it('marks the rows a dormant profile has aged past as superseded', async () => {
    const { service, prisma, population } = build([
      { id: 'c1', ageMs: 240 * DAY },
    ]);

    await service.sweep(EVENT, population);

    // The three earlier rows get a log row each, so they are never revisited
    // and the log says why they were not sent.
    expect(prisma.notificationLog.createMany).toHaveBeenCalledTimes(3);
    expect(prisma.notificationLog.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ skippedReason: 'superseded' }),
        ]) as unknown,
        skipDuplicates: true,
      }),
    );
  });

  it('sends the 24h row to a profile two days old', async () => {
    const { service, queues, population } = build([
      { id: 'c1', ageMs: 2 * DAY },
    ]);

    await service.sweep(EVENT, population);

    expect(offsetsEnqueued(queues)).toEqual([1440]);
  });

  it('sends nothing to a profile younger than the first row', async () => {
    const { service, queues, population } = build([
      { id: 'c1', ageMs: 5 * MIN },
    ]);

    const result = await service.sweep(EVENT, population);

    expect(queues.enqueueStep).not.toHaveBeenCalled();
    expect(result.enqueued).toBe(0);
  });

  it('routes sweep sends to the bulk lane, never the transactional one', async () => {
    const { service, queues, population } = build([
      { id: 'c1', ageMs: 2 * DAY },
    ]);

    await service.sweep(EVENT, population);

    // Otherwise a large sweep holds order confirmations behind its rate limiter.
    expect(queues.enqueueStep).toHaveBeenCalledWith(expect.anything(), 'bulk');
  });

  it('measures each profile from its own clock', async () => {
    const { service, queues, population } = build([
      { id: 'old', ageMs: 240 * DAY },
      { id: 'new', ageMs: 40 * MIN },
    ]);

    await service.sweep(EVENT, population);

    expect(offsetsEnqueued(queues).sort((a, b) => a - b)).toEqual([30, 10080]);
  });

  it('sends nothing when the event is switched off in admin', async () => {
    const { service, prisma, queues, population } = build([
      { id: 'c1', ageMs: 2 * DAY },
    ]);
    prisma.notificationEvent.findUnique.mockResolvedValue({
      isActive: false,
      deprecated: false,
      schedule: ROWS,
    });

    await service.sweep(EVENT, population);
    expect(queues.enqueueStep).not.toHaveBeenCalled();
  });

  it('refuses to start while a previous run is still going', async () => {
    const { service, population } = build([{ id: 'c1', ageMs: 2 * DAY }]);

    const [first, second] = await Promise.all([
      service.sweep(EVENT, population),
      service.sweep(EVENT, population),
    ]);

    // One of the two bails; overlap would be harmless but wasteful.
    expect([first.scanned, second.scanned].filter((n) => n === 0)).toHaveLength(
      1,
    );
  });

  it('has no time window — an eight month old profile is still swept', async () => {
    // This is the whole point: the legacy job only reached profiles inside a
    // ten day backfill window and left everyone older unreachable.
    const { service, queues, population } = build([
      { id: 'ancient', ageMs: 240 * DAY },
    ]);

    await service.sweep(EVENT, population);
    expect(queues.enqueueStep).toHaveBeenCalled();
  });

  describe('forward backfill (enrol from now)', () => {
    const forwardOf = (population: PopulationSpec): PopulationSpec => ({
      ...population,
      backfillMode: 'forward',
    });

    it('schedules EVERY stage, not just the latest due, for an old entity', async () => {
      // An eight-month-old brand: catchUp would send only the last stage.
      // Forward enrols it, so it gets the whole drip from now.
      const { service, queues, population } = build([
        { id: 'b1', ageMs: 240 * DAY },
      ]);

      const result = await service.sweep(EVENT, forwardOf(population));

      expect(offsetsEnqueued(queues).sort((a, b) => a - b)).toEqual([
        30, 1440, 4320, 10080,
      ]);
      // One enrolment per brand, regardless of stage count.
      expect(result.enqueued).toBe(1);
      expect(result.superseded).toBe(0);
    });

    it('anchors the schedule at now, not the entity clock, on the bulk lane', async () => {
      const { service, prisma, queues, population } = build([
        { id: 'b1', ageMs: 240 * DAY },
      ]);

      await service.sweep(EVENT, forwardOf(population));

      const [job, lane] = queues.enqueueStep.mock.calls[0] as [
        { occurredAt: string; occurrenceKey: string; entityId: string },
        string,
      ];
      expect(lane).toBe('bulk');
      expect(job.occurrenceKey).toBe('b1');
      // Enrolled from now — within the last few seconds, not 240 days ago.
      expect(new Date(job.occurredAt).getTime()).toBeGreaterThan(
        Date.now() - 5_000,
      );
      // Nothing is superseded in forward mode.
      expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
    });

    it('preview enrols nobody but counts the brands that would be', async () => {
      const { service, queues, population } = build([
        { id: 'b1', ageMs: 10 * DAY },
        { id: 'b2', ageMs: 1 * DAY },
      ]);

      const result = await service.preview(EVENT, forwardOf(population));

      expect(queues.enqueueStep).not.toHaveBeenCalled();
      expect(result.wouldSend).toBe(2);
    });
  });
});
