import { ConfigService } from '@nestjs/config';
import { OrderMailNotifier } from '../mail/order-mail.notifier';
import { CreatorReminderService } from '../jobs/creator-reminder.service';
import { notificationsCutoverActive } from './cutover';

const config = (value?: string) =>
  ({ get: jest.fn(() => value) }) as unknown as ConfigService;

describe('notificationsCutoverActive', () => {
  it('is off unless explicitly enabled', () => {
    expect(notificationsCutoverActive(config(undefined))).toBe(false);
    expect(notificationsCutoverActive(config('false'))).toBe(false);
    // Anything other than the exact string leaves the legacy path in charge.
    expect(notificationsCutoverActive(config('TRUE'))).toBe(false);
    expect(notificationsCutoverActive(config('1'))).toBe(false);
  });

  it('is on for exactly "true"', () => {
    expect(notificationsCutoverActive(config('true'))).toBe(true);
  });
});

describe('legacy paths stand down once the cutover is active', () => {
  /**
   * The failure this guards against is a user receiving the same message twice:
   * both paths are deployed together and the flag is the only thing keeping
   * them from both sending.
   */
  it('the order notifier does not load an order when the engine owns sending', async () => {
    const prisma = { order: { findUnique: jest.fn() } };
    const mail = { send: jest.fn() };

    const notifier = new OrderMailNotifier(
      mail as never,
      prisma as never,
      {} as never,
      config('true'),
      {} as never,
    );

    notifier.notifyBriefSubmitted('ord_1', new Date());
    await new Promise((resolve) => setImmediate(resolve));

    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('the order notifier still sends while the cutover is off', async () => {
    const prisma = { order: { findUnique: jest.fn().mockResolvedValue(null) } };

    const notifier = new OrderMailNotifier(
      { send: jest.fn() } as never,
      prisma as never,
      {} as never,
      config('false'),
      {} as never,
    );

    notifier.notifyBriefSubmitted('ord_1', new Date());
    await new Promise((resolve) => setImmediate(resolve));

    // It got as far as loading the order, which is the legacy path running.
    expect(prisma.order.findUnique).toHaveBeenCalled();
  });

  it('the creator reminder drips report themselves disabled', () => {
    // Otherwise a creator gets both the legacy stage email and the engine's
    // schedule row for the same offset.
    const reminders = new CreatorReminderService(
      {} as never,
      config('true'),
      {} as never,
    );

    expect(reminders.isEnabled()).toBe(false);
    expect(reminders.isResubmitEnabled()).toBe(false);
  });

  it('the creator reminder drips stay on their own flags while the cutover is off', () => {
    const reminders = new CreatorReminderService(
      {} as never,
      config('true') as never,
      {} as never,
    );
    // With the cutover off, the legacy flag decides.
    const legacyOnly = new CreatorReminderService(
      {} as never,
      {
        get: jest.fn((key: string) =>
          key === 'CREATOR_COMPLETION_REMINDERS_ENABLED' ? 'true' : undefined,
        ),
      } as unknown as ConfigService,
      {} as never,
    );

    expect(reminders.isEnabled()).toBe(false);
    expect(legacyOnly.isEnabled()).toBe(true);
  });
});
