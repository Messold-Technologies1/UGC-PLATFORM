import type { ConfigService } from '@nestjs/config';

/**
 * The single switch that decides which notification path is live.
 *
 * `false` (the default) — the legacy notifiers send exactly as they do today,
 * and the new engine runs alongside them recording what it *would* have sent.
 * That is the shadow mode P2 shipped in: the two can be compared on real
 * traffic before anything changes for a user.
 *
 * `true` — the engine sends, and the legacy notifiers stand down so nobody
 * receives the same message twice.
 *
 * Deliberately one flag read by both paths rather than a deploy that deletes
 * one of them: the engine has never processed a real job, so the cutover needs
 * to be reversible in seconds, not in a release. The legacy path is deleted in
 * P5, once this has been true in production for a while.
 */
export function notificationsCutoverActive(config: ConfigService): boolean {
  return config.get<string>('NOTIFICATIONS_SENDING_ENABLED') === 'true';
}

/** Log line used by each legacy notifier when it stands down, for traceability. */
export function cutoverStandDownMessage(label: string): string {
  return `${label}: skipped, notifications cutover is active (the engine owns this send)`;
}
