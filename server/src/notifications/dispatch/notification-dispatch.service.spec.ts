import { NotificationChannel } from '@prisma/client';
import { NotificationDispatchService } from './notification-dispatch.service';

const EVENT = 'order-content-delivered-for-brand';

function build(eventRow: unknown) {
  const prisma = {
    notificationEvent: { findUnique: jest.fn().mockResolvedValue(eventRow) },
  };
  return {
    service: new NotificationDispatchService(prisma as never),
    prisma,
  };
}

const job = {
  eventKey: EVENT,
  entityId: 'ord_1',
  occurrenceKey: 'ord_1',
  occurredAt: '2026-09-28T10:00:00.000Z',
};

const row = (
  offsetMinutes: number,
  channels = [NotificationChannel.EMAIL],
) => ({
  offsetMinutes,
  channels,
});

describe('NotificationDispatchService.plan', () => {
  it('produces one step per active schedule row, carrying the offset', () => {
    const { service } = build({
      isActive: true,
      deprecated: false,
      schedule: [row(0), row(1440), row(10080)],
    });

    return expect(service.plan(job)).resolves.toEqual([
      { ...job, offsetMinutes: 0, channels: [NotificationChannel.EMAIL] },
      { ...job, offsetMinutes: 1440, channels: [NotificationChannel.EMAIL] },
      { ...job, offsetMinutes: 10080, channels: [NotificationChannel.EMAIL] },
    ]);
  });

  it('produces nothing for an event switched off in admin', async () => {
    const { service } = build({
      isActive: false,
      deprecated: false,
      schedule: [row(0)],
    });
    await expect(service.plan(job)).resolves.toEqual([]);
  });

  it('produces nothing for a deprecated event', async () => {
    const { service } = build({
      isActive: true,
      deprecated: true,
      schedule: [row(0)],
    });
    await expect(service.plan(job)).resolves.toEqual([]);
  });

  it('ignores a row with every channel unticked', async () => {
    // Unticking both channels is how an admin turns one row off; it is
    // configuration, not an error.
    const { service } = build({
      isActive: true,
      deprecated: false,
      schedule: [row(0, []), row(1440)],
    });

    await expect(service.plan(job)).resolves.toEqual([
      { ...job, offsetMinutes: 1440, channels: [NotificationChannel.EMAIL] },
    ]);
  });

  it('ignores an event key that is not in the catalog', async () => {
    const { service, prisma } = build(null);
    await expect(
      service.plan({ ...job, eventKey: 'not-a-real-event' }),
    ).resolves.toEqual([]);
    // Bailed on the catalog check, before touching the database.
    expect(prisma.notificationEvent.findUnique).not.toHaveBeenCalled();
  });

  it('produces nothing when the sync has not created the row yet', async () => {
    const { service } = build(null);
    await expect(service.plan(job)).resolves.toEqual([]);
  });
});
