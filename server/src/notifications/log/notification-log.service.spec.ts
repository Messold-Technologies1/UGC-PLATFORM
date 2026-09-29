import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import {
  NotificationLogService,
  type ClaimInput,
} from './notification-log.service';

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
    service = new NotificationLogService(prisma as never);
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
    service = new NotificationLogService(prisma as never);
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
