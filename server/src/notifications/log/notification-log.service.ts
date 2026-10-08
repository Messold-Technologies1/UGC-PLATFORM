import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationLogStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationLogFeedPublisher } from './notification-log-feed.publisher';
import { notificationLogRowSelect } from './notification-log-feed';

/**
 * Why a send did not happen. Recorded rather than logged, so "did they get it,
 * and if not why" is answerable from the database instead of from log lines.
 */
export type SkipReason =
  | 'opted_out'
  | 'suppressed'
  | 'no_address'
  | 'no_phone'
  | 'not_relevant'
  | 'event_inactive'
  | 'row_removed'
  | 'entity_gone'
  | 'no_recipient'
  | 'user_inactive'
  | 'superseded'
  | 'sending_disabled';

export type ClaimKey = {
  eventKey: string;
  entityId: string;
  occurrenceKey: string;
  offsetMinutes: number;
  channel: NotificationChannel;
  recipientUserId: string | null;
};

export type ClaimInput = ClaimKey & {
  toAddress: string;
  recipientProfileType?: string | null;
  recipientProfileId?: string | null;
  templateId?: string | null;
};

export type ClaimResult =
  | { claimed: true; logId: string }
  | { claimed: false; reason: 'already_sent' | 'held_by_other' };

/**
 * How long a QUEUED row may sit claimed before another worker may take it over.
 * Long enough that a slow provider call is never stolen mid-flight, short
 * enough that a crashed worker's row is recovered the same hour.
 */
const STALE_CLAIM_MS = 15 * 60_000;

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feed: NotificationLogFeedPublisher,
  ) {}

  /**
   * Push the row behind a write to the admin delivery log.
   *
   * Reads the row back rather than assembling it from the write, so a pushed
   * row is byte-for-byte what a refetch would return — including the columns
   * the caller never sees, like the claim timestamp Prisma defaulted. One
   * indexed read per send is nothing next to the provider call it accompanies.
   *
   * Never awaited and never allowed to throw: the delivery decision is already
   * durable in Postgres by this point, and a screen is not worth risking it.
   */
  private announce(where: Prisma.NotificationLogWhereInput): void {
    void this.prisma.notificationLog
      .findFirst({ where, select: notificationLogRowSelect })
      .then((row) => {
        if (row) this.feed.publish(row);
      })
      .catch((err) => {
        this.logger.debug(
          `delivery-log feed: could not read back the row (${
            err instanceof Error ? err.message : String(err)
          })`,
        );
      });
  }

  /**
   * Take ownership of one send, or report that someone else has it.
   *
   * The unique constraint is the idempotency mechanism: the insert either wins
   * or does nothing. A losing insert then reads the existing row — a terminal
   * status means the message already went out, while a QUEUED row whose claim
   * has gone stale is taken over, so a worker that died between claiming and
   * sending cannot lose the notification permanently.
   *
   * This makes delivery at-least-once: a crash after the provider accepted but
   * before we recorded it will send again. That is the deliberate trade — a
   * rare duplicate beats a silent loss.
   */
  async claim(input: ClaimInput): Promise<ClaimResult> {
    const now = new Date();

    const inserted = await this.prisma.notificationLog.createMany({
      data: [
        {
          eventKey: input.eventKey,
          entityId: input.entityId,
          occurrenceKey: input.occurrenceKey,
          offsetMinutes: input.offsetMinutes,
          channel: input.channel,
          recipientUserId: input.recipientUserId,
          recipientProfileType: input.recipientProfileType ?? null,
          recipientProfileId: input.recipientProfileId ?? null,
          toAddress: input.toAddress,
          templateId: input.templateId ?? null,
          status: NotificationLogStatus.QUEUED,
          claimedAt: now,
        },
      ],
      skipDuplicates: true,
    });

    if (inserted.count === 1) {
      const row = await this.prisma.notificationLog.findFirst({
        where: this.whereKey(input),
        select: { id: true },
      });
      if (!row) return { claimed: false, reason: 'held_by_other' };
      this.announce({ id: row.id });
      return { claimed: true, logId: row.id };
    }

    // Lost the race — decide whether this is finished work or a stale claim.
    const existing = await this.prisma.notificationLog.findFirst({
      where: this.whereKey(input),
      select: { id: true, status: true, claimedAt: true },
    });
    if (!existing) return { claimed: false, reason: 'held_by_other' };

    if (existing.status !== NotificationLogStatus.QUEUED) {
      return { claimed: false, reason: 'already_sent' };
    }

    const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
    const { count } = await this.prisma.notificationLog.updateMany({
      where: {
        id: existing.id,
        status: NotificationLogStatus.QUEUED,
        // Only one worker can win this, because the filter and the write are
        // a single statement.
        OR: [{ claimedAt: null }, { claimedAt: { lt: staleBefore } }],
      },
      data: { claimedAt: now },
    });

    if (count === 1) {
      this.logger.warn(
        `reclaimed stale send ${existing.id} (${input.eventKey}/${input.channel})`,
      );
      this.announce({ id: existing.id });
      return { claimed: true, logId: existing.id };
    }
    return { claimed: false, reason: 'held_by_other' };
  }

  async markSent(
    logId: string,
    params: {
      providerMessageId?: string | null;
      renderedSubject?: string | null;
      templateId?: string | null;
    },
  ): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationLogStatus.SENT,
        sentAt: new Date(),
        providerMessageId: params.providerMessageId ?? null,
        renderedSubject: params.renderedSubject ?? null,
        ...(params.templateId ? { templateId: params.templateId } : {}),
      },
    });
    this.announce({ id: logId });
  }

  async markFailed(logId: string, error: unknown): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationLogStatus.FAILED,
        failedAt: new Date(),
        errorMessage: toMessage(error),
      },
    });
    this.announce({ id: logId });
  }

  /**
   * Record a send that was deliberately not made. Written even when nothing was
   * claimed first, so a skip decided before claiming still leaves a trace.
   */
  async recordSkip(
    input: ClaimInput & { skippedReason: SkipReason },
  ): Promise<void> {
    const data = {
      eventKey: input.eventKey,
      entityId: input.entityId,
      occurrenceKey: input.occurrenceKey,
      offsetMinutes: input.offsetMinutes,
      channel: input.channel,
      recipientUserId: input.recipientUserId,
      recipientProfileType: input.recipientProfileType ?? null,
      recipientProfileId: input.recipientProfileId ?? null,
      toAddress: input.toAddress,
      status: NotificationLogStatus.SKIPPED,
      skippedReason: input.skippedReason,
      claimedAt: new Date(),
    };

    const { count } = await this.prisma.notificationLog.createMany({
      data: [data],
      skipDuplicates: true,
    });
    if (count === 1) {
      this.announce(this.whereKey(input));
      return;
    }

    // A row already existed (usually one we just claimed) — update it instead.
    await this.prisma.notificationLog.updateMany({
      where: { ...this.whereKey(input), status: NotificationLogStatus.QUEUED },
      data: {
        status: NotificationLogStatus.SKIPPED,
        skippedReason: input.skippedReason,
      },
    });
    this.announce(this.whereKey(input));
  }

  /**
   * Record a send that failed before it ever had a recipient.
   *
   * Everything else in this service is written once a send has been resolved
   * and claimed. But resolve() reads the entity, so a bad query, a deleted
   * row or a missing relation throws before any row exists — and all BullMQ
   * can do with a throw is retry and give up. The delivery log, which exists
   * to answer "why didn't they get it?", then had nothing to say at all: the
   * event simply never appeared, which is far harder to diagnose than a row
   * marked failed. That is exactly how an invalid Prisma select went
   * unnoticed while every order notification silently died.
   *
   * recipientUserId stays null and toAddress empty because that is the truth:
   * we never got far enough to learn who this was for. The null is part of
   * the unique key, so this row can never collide with a real one written by
   * a later, working attempt — both can stand, which is what a log is for.
   *
   * Called only once BullMQ is done retrying, so a failure that the next
   * attempt recovers from never reaches the log.
   */
  async recordCrash(
    job: {
      eventKey: string;
      entityId: string;
      occurrenceKey: string;
      offsetMinutes: number;
      channels: NotificationChannel[];
    },
    error: unknown,
  ): Promise<void> {
    for (const channel of job.channels) {
      const where = {
        eventKey: job.eventKey,
        entityId: job.entityId,
        occurrenceKey: job.occurrenceKey,
        offsetMinutes: job.offsetMinutes,
        channel,
      };

      // Only when the log has nothing at all for this step and channel. A send
      // that got as far as being claimed has its own failure recorded against
      // the real recipient by deliverChannel, which then rethrows — so without
      // this check that same send would also get a second, recipient-less row
      // here. The narrow race between the two is covered by skipDuplicates
      // below, and this path is a terminal failure, not a hot one.
      const existing = await this.prisma.notificationLog.findFirst({
        where,
        select: { id: true },
      });
      if (existing) continue;

      const { count } = await this.prisma.notificationLog.createMany({
        data: [
          {
            ...where,
            recipientUserId: null,
            toAddress: '',
            status: NotificationLogStatus.FAILED,
            failedAt: new Date(),
            errorMessage: toMessage(error),
          },
        ],
        skipDuplicates: true,
      });
      if (count === 1) {
        this.announce({ ...where, recipientUserId: null });
      }
    }
  }

  /**
   * Apply a provider delivery callback. Keyed on providerMessageId, which is
   * what replaces the bounded in-memory map that lost its contents on restart
   * and reported `template=?` from a second replica.
   */
  async applyProviderStatus(params: {
    providerMessageId: string;
    status: NotificationLogStatus;
    errorMessage?: string | null;
  }): Promise<boolean> {
    const timestamps =
      params.status === NotificationLogStatus.DELIVERED ||
      params.status === NotificationLogStatus.READ
        ? { deliveredAt: new Date() }
        : params.status === NotificationLogStatus.FAILED ||
            params.status === NotificationLogStatus.BOUNCED ||
            params.status === NotificationLogStatus.COMPLAINED
          ? { failedAt: new Date() }
          : {};

    const { count } = await this.prisma.notificationLog.updateMany({
      where: { providerMessageId: params.providerMessageId },
      data: {
        status: params.status,
        errorMessage: params.errorMessage ?? undefined,
        ...timestamps,
      },
    });
    if (count > 0) {
      this.announce({ providerMessageId: params.providerMessageId });
    }
    return count > 0;
  }

  private whereKey(k: ClaimKey): Prisma.NotificationLogWhereInput {
    return {
      eventKey: k.eventKey,
      entityId: k.entityId,
      occurrenceKey: k.occurrenceKey,
      offsetMinutes: k.offsetMinutes,
      channel: k.channel,
      recipientUserId: k.recipientUserId,
    };
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
