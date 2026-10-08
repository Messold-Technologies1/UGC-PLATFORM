import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import { NotificationLogFeedBridge } from './notification-log-feed.bridge';
import { NOTIFICATION_LOG_EVENT } from './notification-log-feed';
import { NOTIFICATION_LOG_ROOM } from '../../realtime/payments.gateway';
import type { PaymentsGateway } from '../../realtime/payments.gateway';
import type { ConfigService } from '@nestjs/config';

/**
 * The read half of the delivery-log feed.
 *
 * Worth its own tests because the failure is invisible from either side: the
 * worker publishes happily into Redis whether or not anyone relays, and the
 * page sits there looking connected while no row ever arrives.
 */
function makeBridge(server: unknown) {
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });
  const gateway = {
    server: server === null ? undefined : { to },
  } as unknown as PaymentsGateway;
  const config = { get: () => undefined } as unknown as ConfigService;
  const bridge = new NotificationLogFeedBridge(config, gateway);
  // relay() is what the Redis subscription calls; exercising it directly keeps
  // these tests off a live Redis.
  const relay = (msg: string) =>
    (bridge as unknown as { relay: (m: string) => void }).relay(msg);
  return { relay, to, emit };
}

const row = {
  id: 'log-1',
  eventKey: 'order-brief-submitted-for-creator',
  entityId: 'ord-1',
  occurrenceKey: 'ord-1',
  offsetMinutes: 0,
  channel: NotificationChannel.EMAIL,
  status: NotificationLogStatus.SENT,
  toAddress: 'creator@example.com',
  renderedSubject: 'Your brief is in',
  providerMessageId: 'ses-1',
  errorMessage: null,
  skippedReason: null,
  queuedAt: '2026-10-08T10:00:00.000Z',
  sentAt: '2026-10-08T10:00:01.000Z',
  deliveredAt: null,
};

describe('delivery-log feed bridge', () => {
  it('relays a published row to the admin room', () => {
    const { relay, to, emit } = makeBridge({});

    relay(JSON.stringify(row));

    expect(to).toHaveBeenCalledWith(NOTIFICATION_LOG_ROOM);
    expect(emit).toHaveBeenCalledWith(NOTIFICATION_LOG_EVENT, row);
  });

  it('stays quiet in a process with no Socket.IO server', () => {
    // The worker boots with createApplicationContext and has no HTTP listener,
    // so it subscribes like everyone else and must simply not emit.
    const { relay, to } = makeBridge(null);

    expect(() => relay(JSON.stringify(row))).not.toThrow();
    expect(to).not.toHaveBeenCalled();
  });

  it('drops an unreadable message instead of taking the subscription down', () => {
    // One bad payload must not kill the listener for every later row.
    const { relay, to, emit } = makeBridge({});

    expect(() => relay('{not json')).not.toThrow();
    expect(to).not.toHaveBeenCalled();

    relay(JSON.stringify(row));
    expect(emit).toHaveBeenCalledTimes(1);
  });
});
