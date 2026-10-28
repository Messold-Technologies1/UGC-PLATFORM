import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, { WebPushError } from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

/** What one notification puts on the user's screen. */
export type WebPushPayload = {
  title: string;
  body: string;
  /** Absolute URL opened on click. */
  url: string;
  /**
   * Collapse key. Two notifications sharing a tag replace one another rather
   * than stacking, which is what keeps a busy order thread to one entry.
   */
  tag?: string;
  /**
   * Set on notifications whose whole content is already on screen — a chat
   * message in the chat you are reading. The service worker drops these when a
   * visible window is already on `url`, so the device you are working on stays
   * quiet while your other devices still buzz.
   */
  suppressIfVisible?: boolean;
};

export type WebPushResult = {
  /** Endpoints that accepted the payload. */
  delivered: number;
  /** Endpoints deleted because the push service said they are gone. */
  pruned: number;
  /** Endpoints that failed for a reason worth retrying. */
  failed: number;
};

/**
 * Thrown for a failure that retrying cannot fix. Mirrors the notification
 * engine's own PermanentSendError so the step worker burns one attempt rather
 * than three. Declared here rather than imported to keep this module free of
 * the notification engine — the dependency runs the other way.
 */
export class PermanentPushError extends Error {}

/** The push services' way of saying "this browser is gone. Stop." */
const GONE_STATUS = new Set([404, 410]);

/**
 * How long to wait on one push service before giving up on it.
 *
 * A send fans out to every one of a user's devices, so without a bound a single
 * unreachable endpoint would hold the job open for the whole default socket
 * timeout and the user's other devices would wait behind it.
 */
const SEND_TIMEOUT_MS = 10_000;

/**
 * Posts an encrypted payload to each of a user's browsers.
 *
 * The push twin of SesMailTransport and WhatsAppCloudTransport, with one
 * structural difference: those address one recipient, this addresses a *set*.
 * A person may be subscribed from a laptop, a phone and a work machine, and
 * all three are the same notification. Partial success is therefore normal and
 * is reported rather than thrown — the caller decides what counts as sent.
 *
 * Dead-subscription pruning lives here because this is the only place the push
 * services' verdict is visible. A 404 or 410 means that browser has cleared
 * its data, uninstalled, or revoked permission; nothing else tells us, and a
 * row kept past that point is a send attempt that can only ever fail.
 */
@Injectable()
export class WebPushTransport {
  private readonly logger = new Logger(WebPushTransport.name);
  private readonly configured: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim();

    if (!publicKey || !privateKey || !subject) {
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT not set; outbound push disabled',
      );
      this.configured = false;
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
  }

  /**
   * True when all three VAPID settings are present.
   *
   * Exposed so callers can record "not configured" as a skip rather than
   * calling and catching — the same shape the engine already uses for shadow
   * mode, and the reason a deploy that predates key generation still boots.
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /** The key the browser needs to build its subscription. Public by design. */
  publicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY')?.trim() || null;
  }

  /**
   * Deliver to every subscription the user has.
   *
   * Throws only when nothing could be delivered AND something is worth
   * retrying, so a job retries for an outage but not for a user whose last
   * browser has simply gone away.
   */
  async sendToUser(
    userId: string,
    payload: WebPushPayload,
  ): Promise<WebPushResult> {
    if (!this.configured) {
      throw new PermanentPushError(
        'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are required to send push',
      );
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subscriptions.length === 0) {
      return { delivered: 0, pruned: 0, failed: 0 };
    }

    const body = JSON.stringify(payload);
    // Push services cap the encrypted payload at 4KB. Rendering already keeps
    // bodies short, so this is a guard against a template that grew rather
    // than an expected path — but it must fail loudly and permanently, since
    // every retry would build the identical oversized payload.
    if (Buffer.byteLength(body) > 3_500) {
      throw new PermanentPushError(
        `push payload for user=${userId} is ${Buffer.byteLength(body)} bytes; the limit is ~4KB`,
      );
    }

    // Settled rather than all(): one device's outage must not cost the others,
    // for the same reason the step worker tries every channel.
    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendOne(sub, body)),
    );

    let delivered = 0;
    let pruned = 0;
    const retryable: unknown[] = [];

    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        if (result.value === 'delivered') delivered += 1;
        else pruned += 1;
        continue;
      }
      retryable.push(result.reason);
      await this.noteFailure(subscriptions[index].id);
    }

    const failed = retryable.length;
    this.logger.log(
      `push user=${userId} delivered=${delivered} pruned=${pruned} failed=${failed}`,
    );

    // Something got through, so the notification happened. A device that timed
    // out is not worth re-pushing to every other device for.
    if (delivered > 0) return { delivered, pruned, failed };
    // Nothing got through and nothing is worth retrying: every endpoint was
    // dead and has been deleted. That is a completed send with no recipients,
    // not a failure to report upward.
    if (retryable.length === 0) return { delivered, pruned, failed };

    throw retryable[0];
  }

  /**
   * One endpoint. Resolves 'delivered' or 'pruned'; rejects for anything the
   * caller should retry.
   */
  private async sendOne(
    sub: { id: string; endpoint: string; p256dh: string; auth: string },
    body: string,
  ): Promise<'delivered' | 'pruned'> {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 60 * 60, timeout: SEND_TIMEOUT_MS },
      );
    } catch (err) {
      if (err instanceof WebPushError && GONE_STATUS.has(err.statusCode)) {
        // The browser is gone for good. Deleting is the whole lifecycle here:
        // there is no unsubscribe webhook, only this status on the next send.
        await this.prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => undefined);
        this.logger.log(
          `pruned push subscription id=${sub.id} (HTTP ${err.statusCode})`,
        );
        return 'pruned';
      }

      // 400 is a malformed request and 413 an oversized payload — both would
      // fail identically on every retry, so they cost one attempt, not three.
      if (
        err instanceof WebPushError &&
        (err.statusCode === 400 || err.statusCode === 413)
      ) {
        throw new PermanentPushError(
          `push rejected for endpoint id=${sub.id} (HTTP ${err.statusCode}): ${err.body}`,
        );
      }

      throw err;
    }

    await this.prisma.pushSubscription
      .update({
        where: { id: sub.id },
        data: { lastSuccessAt: new Date(), failureCount: 0 },
      })
      .catch(() => undefined);
    return 'delivered';
  }

  /**
   * Count a soft failure. Never deletes: a push service having a bad hour is
   * not a user withdrawing consent, and only a 404/410 says that.
   */
  private async noteFailure(subscriptionId: string): Promise<void> {
    await this.prisma.pushSubscription
      .update({
        where: { id: subscriptionId },
        data: { failureCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }
}
