import type { Prisma } from '@prisma/client';

/**
 * The live feed behind the admin delivery log.
 *
 * Rows are written by whichever process drains the queue, which in a split
 * deployment is the worker — and the worker boots with
 * `createApplicationContext`, so it has no HTTP server and therefore no
 * Socket.IO server to emit from. A direct emit would reach nobody.
 *
 * So the write side publishes to Redis and the API side subscribes and
 * re-emits over Socket.IO. Redis is already a hard dependency of the engine
 * (no REDIS_URL means nothing is queued at all), so this adds a channel, not a
 * dependency. Run as a single process and the round trip is a loopback — the
 * same code path, with nothing to special-case.
 */
export const NOTIFICATION_LOG_CHANNEL = 'notifications:log';

/** The Socket.IO event name the browser listens for. */
export const NOTIFICATION_LOG_EVENT = 'notification.log';

/**
 * Exactly the columns the admin list returns, so a pushed row and a fetched
 * row are the same shape and the page can drop one into the other without
 * knowing which it got.
 */
export const notificationLogRowSelect = {
  id: true,
  eventKey: true,
  entityId: true,
  occurrenceKey: true,
  offsetMinutes: true,
  channel: true,
  status: true,
  toAddress: true,
  renderedSubject: true,
  providerMessageId: true,
  errorMessage: true,
  skippedReason: true,
  queuedAt: true,
  sentAt: true,
  deliveredAt: true,
} as const satisfies Prisma.NotificationLogSelect;

export type NotificationLogRow = Prisma.NotificationLogGetPayload<{
  select: typeof notificationLogRowSelect;
}>;
