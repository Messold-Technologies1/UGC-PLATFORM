import { NotificationChannel } from '@prisma/client';
import { NotificationSweepService } from './notification-sweep.service';
import type { PopulationSpec } from '../catalog/define-events';

const EVENT = 'creator-profile-completion-reminder';

/** The completion drip's offsets (minutes). */
const ROWS = [30, 1440, 4320, 10080].map((offsetMinutes) => ({
  offsetMinutes,
  channels: [NotificationChannel.EMAIL],
}));

function build(ids: string[], rows = ROWS) {
  const prisma = {
    notificationEvent: {
      findUnique: jest.fn().mockResolvedValue({
        isActive: true,
        deprecated: false,
        schedule: rows,
      }),
    },
  };
  const queues = { enqueueStep: jest.fn().mockResolvedValue(undefined) };

  const population: PopulationSpec = {
    cron: '0 10 * * *',
    // Returns the ids on the first page and nothing after, exercising the
    // keyset loop without a real cursor.
    page: jest.fn((_ctx, cursor: string | null) =>
      Promise.resolve(cursor ? [] : ids.map((id) => ({ id }))),
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

describe('NotificationSweepService (forward enrolment)', () => {
  it('enrols an entity with the WHOLE schedule, anchored at now on the bulk lane', async () => {
    // An entity of any age is enrolled from now: it gets every stage, scheduled
    // forward, not a catch-up of stages measured from an old clock.
    const { service, queues, population } = build(['c1']);

    const result = await service.sweep(EVENT, population);

    expect(offsetsEnqueued(queues).sort((a, b) => a - b)).toEqual([
      30, 1440, 4320, 10080,
    ]);
    // One enrolment per entity, regardless of how many stages that schedules.
    expect(result.enqueued).toBe(1);
    expect(result.superseded).toBe(0);

    const [job, lane] = queues.enqueueStep.mock.calls[0] as [
      { occurredAt: string; occurrenceKey: string; entityId: string },
      string,
    ];
    // The bulk lane, so a big enrolment stays inside the SES quota as the
    // delayed stages mature.
    expect(lane).toBe('bulk');
    expect(job.entityId).toBe('c1');
    expect(job.occurrenceKey).toBe('c1');
    // Anchored at now — within the last few seconds, never an old signup date.
    expect(new Date(job.occurredAt).getTime()).toBeGreaterThan(
      Date.now() - 5_000,
    );
  });

  it('enrols every entity across the keyset pages', async () => {
    const { service, queues, population } = build(['a', 'b', 'c']);

    const result = await service.sweep(EVENT, population);

    expect(result.scanned).toBe(3);
    expect(result.enqueued).toBe(3);
    // 3 entities × 4 stages.
    expect(queues.enqueueStep).toHaveBeenCalledTimes(12);
  });

  it('preview enrols nobody but counts who would be', async () => {
    const { service, queues, population } = build(['c1', 'c2']);

    const result = await service.preview(EVENT, population);

    expect(queues.enqueueStep).not.toHaveBeenCalled();
    expect(result.wouldSend).toBe(2);
  });

  it('enrols nobody when the event is switched off in admin', async () => {
    const { service, prisma, queues, population } = build(['c1']);
    prisma.notificationEvent.findUnique.mockResolvedValue({
      isActive: false,
      deprecated: false,
      schedule: ROWS,
    });

    await service.sweep(EVENT, population);
    expect(queues.enqueueStep).not.toHaveBeenCalled();
  });

  it('enrols nobody when the event has no active schedule rows', async () => {
    const { service, prisma, queues, population } = build(['c1']);
    prisma.notificationEvent.findUnique.mockResolvedValue({
      isActive: true,
      deprecated: false,
      schedule: [],
    });

    await service.sweep(EVENT, population);
    expect(queues.enqueueStep).not.toHaveBeenCalled();
  });

  it('refuses to start while a previous run is still going', async () => {
    const { service, population } = build(['c1']);

    const [first, second] = await Promise.all([
      service.sweep(EVENT, population),
      service.sweep(EVENT, population),
    ]);

    // One of the two bails; overlap would be harmless but wasteful.
    expect([first.scanned, second.scanned].filter((n) => n === 0)).toHaveLength(
      1,
    );
  });

  it('has no time window — an eight-month-old profile is still enrolled', async () => {
    // The whole point: the legacy job only reached profiles inside a ten day
    // window and left everyone older unreachable.
    const { service, queues, population } = build(['ancient']);

    await service.sweep(EVENT, population);
    expect(queues.enqueueStep).toHaveBeenCalled();
  });
});
