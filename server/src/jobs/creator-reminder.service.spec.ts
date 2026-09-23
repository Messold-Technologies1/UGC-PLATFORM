import {
  COMPLETION_STAGE_DELAY_MS,
  CreatorReminderService,
  RESUBMIT_STAGE_DELAY_MS,
} from './creator-reminder.service';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Profile = {
  id: string;
  completionReminderStartedAt: Date;
  completionReminder30mAt: Date | null;
  completionReminder24hAt: Date | null;
  completionReminder72hAt: Date | null;
  completionReminder168hAt: Date | null;
};

function buildProfile(startedAgoMs: number, overrides: Partial<Profile> = {}) {
  return {
    id: 'creator-1',
    completionReminderStartedAt: new Date(Date.now() - startedAgoMs),
    completionReminder30mAt: null,
    completionReminder24hAt: null,
    completionReminder72hAt: null,
    completionReminder168hAt: null,
    ...overrides,
  };
}

/**
 * Stands in for PrismaService. `updateMany` always reports one row changed, so
 * every claim the service attempts succeeds — the assertions are about which
 * stage it decides to claim, not about the database's locking.
 */
type SweepWhere = { completionReminderStartedAt: { gte: Date; lte: Date } };

function makePrisma(candidates: Profile[]) {
  const updates: Array<Record<string, unknown>> = [];
  const sweepWheres: SweepWhere[] = [];
  return {
    updates,
    sweepWheres,
    creatorProfile: {
      findMany: jest.fn((args: { where: SweepWhere }) => {
        sweepWheres.push(args.where);
        return Promise.resolve(candidates);
      }),
      findUnique: jest.fn().mockResolvedValue(candidates[0] ?? null),
      updateMany: jest.fn((args: { data: Record<string, unknown> }) => {
        updates.push(args.data);
        return Promise.resolve({ count: 1 });
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    creatorApproval: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function build(candidates: Profile[]) {
  const prisma = makePrisma(candidates);
  const notifier = {
    notifyCompletionReminder: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'CREATOR_COMPLETION_REMINDERS_ENABLED' ? 'true' : undefined,
    ),
  };
  const service = new CreatorReminderService(
    prisma as never,
    config as never,
    notifier as never,
  );
  return { service, prisma, notifier };
}

describe('CreatorReminderService', () => {
  it('runs the completion drip at 30min / 24h / day 3 / day 7', () => {
    expect(COMPLETION_STAGE_DELAY_MS).toEqual({
      1: 30 * MINUTE,
      2: 24 * HOUR,
      3: 3 * DAY,
      4: 7 * DAY,
    });
  });

  it('leaves the resubmit drip on its own 30min / 24h / 48h scale', () => {
    // The two sequences shared one scale before the day-3/day-7 rewrite; a
    // withdrawn profile is already built and must not inherit the week-long
    // signup sequence.
    expect(RESUBMIT_STAGE_DELAY_MS).toEqual({
      1: 30 * MINUTE,
      2: 24 * HOUR,
      3: 48 * HOUR,
    });
  });

  describe('runBackstopSweep', () => {
    // Each case: how long ago the drip clock started -> the stage that is due.
    it.each([
      ['45 minutes', 45 * MINUTE, 1],
      ['26 hours', 26 * HOUR, 2],
      ['4 days', 4 * DAY, 3],
      ['8 days', 8 * DAY, 4],
    ])('sends stage %s in -> stage %i', async (_label, ago, stage) => {
      const { service, notifier } = build([buildProfile(ago)]);

      await service.runBackstopSweep();

      expect(notifier.notifyCompletionReminder).toHaveBeenCalledTimes(1);
      expect(notifier.notifyCompletionReminder).toHaveBeenCalledWith(
        'creator-1',
        stage,
      );
    });

    it('starts a re-enrolled creator at stage 1, not at the last stage', async () => {
      // A creator who signed up months ago and was re-enrolled has a clock of
      // "now". Measuring stages from createdAt instead would make every stage
      // due at once and fire the day-7 email immediately.
      const { service, notifier } = build([buildProfile(40 * MINUTE)]);

      await service.runBackstopSweep();

      expect(notifier.notifyCompletionReminder).toHaveBeenCalledWith(
        'creator-1',
        1,
      );
    });

    it('retires an earlier unsent stage instead of emailing it late', async () => {
      const { service, prisma, notifier } = build([buildProfile(4 * DAY)]);

      await service.runBackstopSweep();

      // Day 3 is what goes out...
      expect(notifier.notifyCompletionReminder).toHaveBeenCalledTimes(1);
      expect(notifier.notifyCompletionReminder).toHaveBeenCalledWith(
        'creator-1',
        3,
      );
      // ...and the skipped stages are stamped so they never fire afterwards.
      const stamped = Object.assign({}, ...prisma.updates) as Record<
        string,
        unknown
      >;
      expect(stamped.completionReminder30mAt).toBeInstanceOf(Date);
      expect(stamped.completionReminder24hAt).toBeInstanceOf(Date);
      expect(stamped.completionReminder168hAt).toBeUndefined();
    });

    it('sends nothing when a stage has already been stamped', async () => {
      const { service, notifier } = build([
        buildProfile(8 * DAY, { completionReminder168hAt: new Date() }),
      ]);

      await service.runBackstopSweep();

      expect(notifier.notifyCompletionReminder).not.toHaveBeenCalled();
    });

    it('keeps the backfill window wide enough to reach the day-7 stage', async () => {
      const { service, prisma } = build([]);

      await service.runBackstopSweep();

      const windowMs =
        Date.now() -
        prisma.sweepWheres[0].completionReminderStartedAt.gte.getTime();

      // A window at or under 7 days would filter out creators exactly as their
      // final email came due, so the sweep could never deliver it.
      expect(windowMs).toBeGreaterThan(COMPLETION_STAGE_DELAY_MS[4]);
    });
  });
});
