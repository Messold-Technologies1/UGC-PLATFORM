import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import { NotificationBackstopService } from './notification-backstop.service';

function build(rows: unknown[], cutover = 'true') {
  const prisma = {
    notificationLog: { findMany: jest.fn().mockResolvedValue(rows) },
  };
  const step = { deliver: jest.fn().mockResolvedValue([]) };
  const service = new NotificationBackstopService(
    prisma as never,
    { get: jest.fn(() => cutover) } as never,
    step as never,
  );
  return { service, prisma, step };
}

const stuck = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'log1',
  eventKey: 'order-brief-submitted-for-creator',
  entityId: 'ord_1',
  occurrenceKey: 'ord_1',
  offsetMinutes: 1440,
  channel: NotificationChannel.EMAIL,
  queuedAt: new Date(Date.now() - 2 * 60 * 60_000),
  ...over,
});

describe('NotificationBackstopService', () => {
  it('re-drives a send whose delayed job was lost', async () => {
    // Redis dropped the job; nothing else would ever notice.
    const { service, step } = build([stuck()]);

    await expect(service.run()).resolves.toEqual({ recovered: 1 });
    expect(step.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'ord_1', offsetMinutes: 1440 }),
    );
  });

  it('only looks at rows claimed long enough ago to be genuinely lost', async () => {
    const { service, prisma } = build([]);

    await service.run();

    const calls = prisma.notificationLog.findMany.mock.calls as Array<
      [{ where: { status: string; claimedAt: { lt: Date } } }]
    >;
    const { where } = calls[0][0];
    expect(where.status).toBe(NotificationLogStatus.QUEUED);
    // A send still in flight must never be duplicated.
    expect(where.claimedAt.lt.getTime()).toBeLessThan(Date.now() - 25 * 60_000);
  });

  it('collapses the channels of one row into a single piece of work', async () => {
    // deliver() handles every channel of a row, so two stuck channels are one job.
    const { service, step } = build([
      stuck({ id: 'a', channel: NotificationChannel.EMAIL }),
      stuck({ id: 'b', channel: NotificationChannel.WHATSAPP }),
    ]);

    await expect(service.run()).resolves.toEqual({ recovered: 1 });
    expect(step.deliver).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the legacy path is still sending', async () => {
    const { service, prisma } = build([stuck()], 'false');

    await expect(service.run()).resolves.toEqual({ recovered: 0 });
    expect(prisma.notificationLog.findMany).not.toHaveBeenCalled();
  });

  it('keeps going when one recovery fails again', async () => {
    const { service, step } = build([
      stuck({ id: 'a', entityId: 'ord_1' }),
      stuck({ id: 'b', entityId: 'ord_2' }),
    ]);
    step.deliver.mockRejectedValueOnce(new Error('still broken'));

    await expect(service.run()).resolves.toEqual({ recovered: 1 });
    expect(step.deliver).toHaveBeenCalledTimes(2);
  });
});
