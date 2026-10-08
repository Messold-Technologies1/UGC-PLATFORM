import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import {
  NotificationLogService,
  type ClaimInput,
} from './notification-log.service';
import type { NotificationLogFeedPublisher } from './notification-log-feed.publisher';

/**
 * The live feed is a side effect, not part of the claim contract: these tests
 * are about who wins a send, so it is stubbed and only asserted on where the
 * point is that the admin page hears about the write.
 */
function makeFeed() {
  return { publish: jest.fn() } as unknown as NotificationLogFeedPublisher;
}

/** Lets a test wait for announce(), which is deliberately not awaited. */
const flush = () => new Promise((r) => setImmediate(r));

/**
 * A small stand-in for the unique constraint on NotificationLog: createMany
 * with skipDuplicates inserts only when no row shares the key.
 */
function makePrisma() {
  type Row = {
    id: string;
    key: string;
    status: NotificationLogStatus;
    claimedAt: Date | null;
    providerMessageId?: string | null;
    [k: string]: unknown;
  };
  const rows: Row[] = [];
  let seq = 0;

  const keyOf = (d: Record<string, unknown>) =>
    [
      d.eventKey,
      d.entityId,
      d.occurrenceKey,
      d.offsetMinutes,
      d.channel,
      d.recipientUserId,
    ].join('|');

  const matches = (row: Row, where: Record<string, any>): boolean => {
    for (const [k, v] of Object.entries(where)) {
      if (k === 'OR') {
        if (!(v as Record<string, any>[]).some((o) => matches(row, o)))
          return false;
        continue;
      }
      if (v && typeof v === 'object' && 'lt' in v) {
        const actual = row[k] as Date | null;
        if (!actual || !(actual < (v as { lt: Date }).lt)) return false;
        continue;
      }
      if (row[k] !== v) return false;
    }
    return true;
  };

  return {
    rows,
    notificationLog: {
      createMany: jest.fn(({ data }: { data: Record<string, unknown>[] }) => {
        let count = 0;
        for (const d of data) {
          const key = keyOf(d);
          if (rows.some((r) => r.key === key)) continue;
          rows.push({ id: `log${++seq}`, key, ...d } as Row);
          count += 1;
        }
        return Promise.resolve({ count });
      }),
      findFirst: jest.fn(({ where }: { where: Record<string, any> }) =>
        Promise.resolve(rows.find((r) => matches(r, where)) ?? null),
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: Record<string, any>;
          data: Record<string, unknown>;
        }) => {
          const hits = rows.filter((r) => matches(r, where));
          hits.forEach((r) => Object.assign(r, data));
          return Promise.resolve({ count: hits.length });
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = rows.find((r) => r.id === where.id);
          if (row) Object.assign(row, data);
          return Promise.resolve(row);
        },
      ),
    },
  };
}

const input: ClaimInput = {
  eventKey: 'order-brief-submitted-for-creator',
  entityId: 'ord_1',
  occurrenceKey: 'ord_1',
  offsetMinutes: 0,
  channel: NotificationChannel.EMAIL,
  recipientUserId: 'u1',
  toAddress: 'a@example.com',
};

describe('NotificationLogService.claim', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: NotificationLogService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotificationLogService(prisma as never, makeFeed());
  });

  it('claims an unseen send', async () => {
    await expect(service.claim(input)).resolves.toEqual({
      claimed: true,
      logId: 'log1',
    });
  });

  it('refuses a second claim while the first is still working', async () => {
    await service.claim(input);
    await expect(service.claim(input)).resolves.toEqual({
      claimed: false,
      reason: 'held_by_other',
    });
  });

  it('refuses to re-send something already sent', async () => {
    const first = await service.claim(input);
    if (!first.claimed) throw new Error('expected claim');
    await service.markSent(first.logId, { providerMessageId: 'ses-1' });

    await expect(service.claim(input)).resolves.toEqual({
      claimed: false,
      reason: 'already_sent',
    });
  });

  it('takes over a stale claim, so a crash between claiming and sending is recoverable', async () => {
    await service.claim(input);
    // Simulate the worker dying: the row stays QUEUED with an old claim.
    prisma.rows[0].claimedAt = new Date(Date.now() - 60 * 60_000);

    await expect(service.claim(input)).resolves.toEqual({
      claimed: true,
      logId: 'log1',
    });
  });

  it('keeps the two channels of one send independent', async () => {
    await service.claim(input);
    await expect(
      service.claim({ ...input, channel: NotificationChannel.WHATSAPP }),
    ).resolves.toMatchObject({ claimed: true });
  });

  it('keeps repeat occurrences independent', async () => {
    // Revision 2 of the same order must be claimable after revision 1 sent.
    await service.claim({ ...input, occurrenceKey: '1' });
    await expect(
      service.claim({ ...input, occurrenceKey: '2' }),
    ).resolves.toMatchObject({ claimed: true });
  });

  it('keeps the rows of one sequence independent', async () => {
    await service.claim(input);
    await expect(
      service.claim({ ...input, offsetMinutes: 1440 }),
    ).resolves.toMatchObject({ claimed: true });
  });
});

describe('NotificationLogService outcomes', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: NotificationLogService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotificationLogService(prisma as never, makeFeed());
  });

  it('records a skip even when nothing was claimed first', async () => {
    await service.recordSkip({ ...input, skippedReason: 'opted_out' });

    expect(prisma.rows[0]).toMatchObject({
      status: NotificationLogStatus.SKIPPED,
      skippedReason: 'opted_out',
    });
  });

  it('turns an existing claim into a skip rather than duplicating it', async () => {
    await service.claim(input);
    await service.recordSkip({ ...input, skippedReason: 'not_relevant' });

    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]).toMatchObject({
      status: NotificationLogStatus.SKIPPED,
      skippedReason: 'not_relevant',
    });
  });

  it('applies a provider delivery callback by message id', async () => {
    const claim = await service.claim(input);
    if (!claim.claimed) throw new Error('expected claim');
    await service.markSent(claim.logId, { providerMessageId: 'wamid.abc' });

    await expect(
      service.applyProviderStatus({
        providerMessageId: 'wamid.abc',
        status: NotificationLogStatus.DELIVERED,
      }),
    ).resolves.toBe(true);

    expect(prisma.rows[0]).toMatchObject({
      status: NotificationLogStatus.DELIVERED,
    });
    expect(prisma.rows[0].deliveredAt).toBeInstanceOf(Date);
  });

  it('reports an unknown message id rather than throwing', async () => {
    await expect(
      service.applyProviderStatus({
        providerMessageId: 'never-seen',
        status: NotificationLogStatus.BOUNCED,
      }),
    ).resolves.toBe(false);
  });
});

describe('NotificationLogService feed', () => {
  // The admin delivery log updates from these announcements, so a write that
  // forgets to make one leaves the page looking idle while sends go out.
  let prisma: ReturnType<typeof makePrisma>;
  let feed: { publish: jest.Mock };
  let service: NotificationLogService;

  beforeEach(() => {
    prisma = makePrisma();
    feed = { publish: jest.fn() };
    service = new NotificationLogService(
      prisma as never,
      feed as unknown as NotificationLogFeedPublisher,
    );
  });

  it('announces a claimed send', async () => {
    await service.claim(input);
    await flush();

    expect(feed.publish).toHaveBeenCalledTimes(1);
  });

  it('announces a skip decided before any claim', async () => {
    await service.recordSkip({ ...input, skippedReason: 'suppressed' });
    await flush();

    expect(feed.publish).toHaveBeenCalledTimes(1);
  });

  it('announces again as the row moves on, so the status updates in place', async () => {
    const claimed = await service.claim(input);
    if (!claimed.claimed) throw new Error('expected the claim to win');
    feed.publish.mockClear();

    await service.markSent(claimed.logId, { providerMessageId: 'ses-1' });
    await flush();

    expect(feed.publish).toHaveBeenCalledTimes(1);
  });

  it('never lets a feed failure break the send it is reporting', async () => {
    // Postgres already has the decision by this point; a dead Redis must not
    // turn a recorded send into a thrown error.
    feed.publish.mockImplementation(() => {
      throw new Error('redis is down');
    });

    await expect(service.claim(input)).resolves.toMatchObject({
      claimed: true,
    });
    await flush();
  });
});

describe('NotificationLogService.recordCrash', () => {
  // The gap this closes: a send that throws in resolve() left the delivery
  // log completely empty, so the admin page showed nothing rather than
  // showing a failure. "Nothing" is the hardest state to diagnose.
  let prisma: ReturnType<typeof makePrisma>;
  let feed: { publish: jest.Mock };
  let service: NotificationLogService;

  const job = {
    eventKey: 'order-brief-accepted-for-brand',
    entityId: 'ord-1',
    occurrenceKey: 'ord-1',
    offsetMinutes: 0,
    channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  };

  beforeEach(() => {
    prisma = makePrisma();
    feed = { publish: jest.fn() };
    service = new NotificationLogService(
      prisma as never,
      feed as unknown as NotificationLogFeedPublisher,
    );
  });

  it('writes a failed row per channel when nothing was ever claimed', async () => {
    await service.recordCrash(job, new Error('Unknown field `agency`'));

    expect(prisma.rows).toHaveLength(2);
    for (const row of prisma.rows) {
      expect(row).toMatchObject({
        status: NotificationLogStatus.FAILED,
        errorMessage: 'Unknown field `agency`',
        // Never resolved, so there is genuinely nobody to name.
        recipientUserId: null,
        toAddress: '',
      });
    }
  });

  it('leaves the row alone when the send was already claimed', async () => {
    // Past the claim, deliverChannel records the failure against the real
    // recipient and rethrows — so the job still fails, and recording again
    // here would add a second, recipient-less row for one send.
    const claimed = await service.claim({ ...input, channel: job.channels[0] });
    if (!claimed.claimed) throw new Error('expected the claim to win');
    const before = prisma.rows.length;

    await service.recordCrash(
      { ...job, ...input, channels: [job.channels[0]] },
      new Error('boom'),
    );

    expect(prisma.rows).toHaveLength(before);
  });

  it('puts the failure on the live feed, so the page shows it without a reload', async () => {
    await service.recordCrash(
      { ...job, channels: [job.channels[0]] },
      new Error('boom'),
    );
    await flush();

    expect(feed.publish).toHaveBeenCalled();
  });
});
