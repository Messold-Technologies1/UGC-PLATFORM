import type { ConfigService } from '@nestjs/config';

/**
 * Whether the notification engine actually calls a provider.
 *
 * `false` (the default) is shadow mode: every decision is made, every row is
 * written to the delivery log, and nothing is sent. That is what let the
 * engine be compared against the legacy notifiers on real traffic before the
 * cutover, and it stays useful on its own — a staging environment can run the
 * whole pipeline without mailing anyone.
 *
 * `true` sends.
 *
 * This used to answer "which of the two paths is live"; the legacy notifiers
 * are gone, so now it answers only the one question left.
 */
export function notificationsSendingEnabled(config: ConfigService): boolean {
  return config.get<string>('NOTIFICATIONS_SENDING_ENABLED') === 'true';
}
