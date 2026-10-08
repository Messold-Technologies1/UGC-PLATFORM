import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandAccessService } from '../../brand-access/brand-access.service';
import { EmailSuppressionService } from '../../mail/email-suppression.service';
import { SesMailTransport } from '../../mail/ses-mail.transport';
import { WhatsAppCloudTransport } from '../../whatsapp/whatsapp-cloud.transport';
import {
  frontendBaseUrl,
  frontendRelativePath,
} from '../../util/frontend-url.util';
import {
  getEventDefinition,
  defaultWhatsAppTemplateName,
} from '../catalog/event-catalog';
import type { EventContext, ResolvedRecipient } from '../catalog/define-events';
import { NotificationTemplateRenderer } from '../rendering/notification-template-renderer.service';
import {
  NotificationLogService,
  type ClaimInput,
  type SkipReason,
} from '../log/notification-log.service';
import type { StepJobData } from '../queues/notification-queues';
import { notificationsSendingEnabled } from '../sending-enabled';

/** Thrown for a failure that retrying cannot fix, so it burns one attempt not three. */
export class PermanentSendError extends Error {}

/**
 * Which of several channel failures the job should fail with.
 *
 * A retryable one wins over a permanent one. The job carries a single error,
 * and that error decides whether BullMQ tries again — so if WhatsApp hit a
 * permanent bad-template error while email hit a timeout, raising the
 * permanent one would strand the email that a retry would have delivered.
 * Raising the retryable one costs at most a duplicate attempt at the channel
 * that was never going to work, and that attempt is refused by the claim.
 */
function pickFailureToRaise(failures: unknown[]): unknown {
  return (
    failures.find((err) => !(err instanceof PermanentSendError)) ?? failures[0]
  );
}

export type StepOutcome = {
  channel: NotificationChannel;
  result: 'sent' | 'skipped' | 'failed';
  reason?: SkipReason;
};

/**
 * Delivers one schedule row of one event: the gate chain from the plan.
 *
 * Kept free of BullMQ so it can be driven by the queue worker, the backstop
 * sweep or a test with equal directness.
 */
@Injectable()
export class NotificationStepService {
  private readonly logger = new Logger(NotificationStepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly brandAccess: BrandAccessService,
    private readonly renderer: NotificationTemplateRenderer,
    private readonly log: NotificationLogService,
    private readonly suppression: EmailSuppressionService,
    private readonly ses: SesMailTransport,
    private readonly whatsapp: WhatsAppCloudTransport,
  ) {}

  /**
   * Until the cutover the engine runs in shadow: every decision is made and
   * recorded, but the legacy notifiers are still the ones actually sending.
   */
  private sendingEnabled(): boolean {
    return notificationsSendingEnabled(this.config);
  }

  async deliver(job: StepJobData): Promise<StepOutcome[]> {
    const definition = getEventDefinition(job.eventKey);
    if (!definition) {
      this.logger.warn(`step for unknown event ${job.eventKey}; ignoring`);
      return [];
    }

    // The row is looked up by offset, never by a row id, so replacing the
    // schedule cannot orphan a delayed job.
    const event = await this.prisma.notificationEvent.findUnique({
      where: { key: job.eventKey },
      select: {
        isActive: true,
        deprecated: true,
        alwaysSend: true,
        emailTemplateId: true,
        whatsappTemplateName: true,
        schedule: {
          where: { offsetMinutes: job.offsetMinutes },
          select: {
            isActive: true,
            channels: true,
            templateOverrideId: true,
            whatsappTemplateOverride: true,
          },
        },
      },
    });

    if (!event || event.deprecated || !event.isActive) {
      return this.skipAll(job, 'event_inactive');
    }
    const row = event.schedule[0];
    if (!row?.isActive) {
      return this.skipAll(job, 'row_removed');
    }

    // Only delayed rows can be stale enough to need re-checking; an immediate
    // send is about something that just happened.
    if (job.offsetMinutes > 0 && definition.stillRelevant) {
      const relevant = await definition.stillRelevant(
        this.context(),
        job.entityId,
      );
      // null is "I could not find the entity", which the log must not record
      // as restraint: a worker pointed at the wrong database would otherwise
      // look exactly like a healthy one deciding not to nag anybody.
      if (relevant === null) return this.skipAll(job, 'entity_gone');
      if (!relevant) return this.skipAll(job, 'not_relevant');
    }

    const recipient = await definition.resolve(this.context(), job.entityId);
    if (!recipient) return this.skipAll(job, 'entity_gone');

    if (recipient.userId && !(await this.userIsActive(recipient.userId))) {
      return this.skipAll(job, 'user_inactive', recipient);
    }

    const outcomes: StepOutcome[] = [];
    const failures: unknown[] = [];

    // Channels are independent: a WhatsApp failure must not cost the email.
    //
    // deliverChannel records its own failure and rethrows so the job retries,
    // but that throw used to escape this loop — so an SES outage silently took
    // WhatsApp with it, and the comment above was simply untrue. Each channel
    // is tried now, and the failures are re-raised together once every channel
    // has had its turn.
    for (const channel of row.channels) {
      try {
        outcomes.push(
          await this.deliverChannel(job, channel, recipient, {
            alwaysSend: event.alwaysSend,
            emailTemplateId: row.templateOverrideId ?? event.emailTemplateId,
            whatsappTemplateName:
              row.whatsappTemplateOverride ??
              event.whatsappTemplateName ??
              defaultWhatsAppTemplateName(job.eventKey),
          }),
        );
      } catch (err) {
        failures.push(err);
        outcomes.push({ channel, result: 'failed' });
      }
    }

    if (failures.length > 0) throw pickFailureToRaise(failures);
    return outcomes;
  }

  private async deliverChannel(
    job: StepJobData,
    channel: NotificationChannel,
    recipient: ResolvedRecipient,
    opts: {
      alwaysSend: boolean;
      emailTemplateId: string | null;
      whatsappTemplateName: string;
    },
  ): Promise<StepOutcome> {
    const address =
      channel === NotificationChannel.EMAIL ? recipient.email : recipient.phone;
    const claimBase: ClaimInput = {
      eventKey: job.eventKey,
      entityId: job.entityId,
      occurrenceKey: job.occurrenceKey,
      offsetMinutes: job.offsetMinutes,
      channel,
      recipientUserId: recipient.userId,
      recipientProfileType: recipient.profileType ?? null,
      recipientProfileId: recipient.profileId ?? null,
      toAddress: address ?? '',
    };

    if (!address?.trim()) {
      await this.log.recordSkip({
        ...claimBase,
        skippedReason:
          channel === NotificationChannel.EMAIL ? 'no_address' : 'no_phone',
      });
      return { channel, result: 'skipped', reason: 'no_address' };
    }

    if (!opts.alwaysSend && !(await this.optedIn(recipient, channel))) {
      await this.log.recordSkip({ ...claimBase, skippedReason: 'opted_out' });
      return { channel, result: 'skipped', reason: 'opted_out' };
    }

    if (
      channel === NotificationChannel.EMAIL &&
      (await this.suppression.isSuppressed(address))
    ) {
      await this.log.recordSkip({ ...claimBase, skippedReason: 'suppressed' });
      return { channel, result: 'skipped', reason: 'suppressed' };
    }

    const claim = await this.log.claim(claimBase);
    if (!claim.claimed) {
      return { channel, result: 'skipped', reason: undefined };
    }

    if (!this.sendingEnabled()) {
      // Shadow mode: the decision is recorded, the provider is not called.
      await this.log.recordSkip({
        ...claimBase,
        skippedReason: 'sending_disabled',
      });
      return { channel, result: 'skipped', reason: 'sending_disabled' };
    }

    try {
      const providerMessageId =
        channel === NotificationChannel.EMAIL
          ? await this.sendEmail(job, recipient, address, opts.emailTemplateId)
          : await this.sendWhatsApp(
              recipient,
              address,
              opts.whatsappTemplateName,
            );

      await this.log.markSent(claim.logId, {
        providerMessageId: providerMessageId.messageId,
        renderedSubject: providerMessageId.subject,
        templateId: providerMessageId.templateId,
      });
      return { channel, result: 'sent' };
    } catch (err) {
      await this.log.markFailed(claim.logId, err);
      throw err;
    }
  }

  private async sendEmail(
    job: StepJobData,
    recipient: ResolvedRecipient,
    address: string,
    templateId: string | null,
  ): Promise<{
    messageId: string | null;
    subject: string;
    templateId: string | null;
  }> {
    const rendered = await this.renderer.render({
      templateId,
      templateName: job.eventKey,
      context: recipient.vars,
    });

    if (!rendered.subject.trim()) {
      // SES rejects an empty subject outright; failing here names the cause.
      throw new PermanentSendError(
        `template for ${job.eventKey} rendered an empty subject`,
      );
    }

    const messageId = await this.ses.send({
      to: address,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return {
      messageId,
      subject: rendered.subject,
      templateId: rendered.templateId,
    };
  }

  private async sendWhatsApp(
    recipient: ResolvedRecipient,
    phone: string,
    templateName: string,
  ): Promise<{ messageId: string | null; subject: string; templateId: null }> {
    const base = frontendBaseUrl(this.config);
    const actionUrl = recipient.vars.actionUrl;
    const messageId = await this.whatsapp.send({
      to: phone.replace(/\D/g, ''),
      templateName,
      language:
        this.config.get<string>('WHATSAPP_DEFAULT_LANGUAGE')?.trim() || 'en',
      // The universal contract: {{1}} is the recipient's name.
      bodyVars: [sanitizeBodyVar(String(recipient.vars.recipientName ?? ''))],
      buttonUrlVar:
        typeof actionUrl === 'string' && actionUrl
          ? frontendRelativePath(base, actionUrl)
          : undefined,
    });
    return { messageId, subject: templateName, templateId: null };
  }

  /** The existing per-profile opt-in booleans, unchanged. */
  private async optedIn(
    recipient: ResolvedRecipient,
    channel: NotificationChannel,
  ): Promise<boolean> {
    if (!recipient.profileType || !recipient.profileId) return false;
    const select =
      channel === NotificationChannel.EMAIL
        ? { emailNotificationsEnabled: true as const }
        : { whatsappNotificationsEnabled: true as const };

    if (recipient.profileType === 'creator') {
      const p = await this.prisma.creatorProfile.findUnique({
        where: { id: recipient.profileId },
        select,
      });
      return readFlag(p, channel);
    }
    if (recipient.profileType === 'agency') {
      const a = await this.prisma.agency.findUnique({
        where: { id: recipient.profileId },
        select,
      });
      return readFlag(a, channel);
    }
    const p = await this.prisma.brandProfile.findUnique({
      where: { id: recipient.profileId },
      select,
    });
    return readFlag(p, channel);
  }

  /** Suspended and deactivated accounts stop receiving mail. */
  private async userIsActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    return user?.status === UserStatus.ACTIVE;
  }

  private context(): EventContext {
    return {
      prisma: this.prisma,
      config: this.config,
      brandAccess: this.brandAccess,
      frontendBaseUrl: frontendBaseUrl(this.config),
    };
  }

  private async skipAll(
    job: StepJobData,
    reason: SkipReason,
    recipient?: ResolvedRecipient,
  ): Promise<StepOutcome[]> {
    const outcomes: StepOutcome[] = [];
    for (const channel of job.channels) {
      await this.log.recordSkip({
        eventKey: job.eventKey,
        entityId: job.entityId,
        occurrenceKey: job.occurrenceKey,
        offsetMinutes: job.offsetMinutes,
        channel,
        recipientUserId: recipient?.userId ?? null,
        recipientProfileType: recipient?.profileType ?? null,
        recipientProfileId: recipient?.profileId ?? null,
        toAddress:
          (channel === NotificationChannel.EMAIL
            ? recipient?.email
            : recipient?.phone) ?? '',
        skippedReason: reason,
      });
      outcomes.push({ channel, result: 'skipped', reason });
    }
    return outcomes;
  }
}

function readFlag(
  profile: {
    emailNotificationsEnabled?: boolean;
    whatsappNotificationsEnabled?: boolean;
  } | null,
  channel: NotificationChannel,
): boolean {
  if (!profile) return false;
  return channel === NotificationChannel.EMAIL
    ? (profile.emailNotificationsEnabled ?? false)
    : (profile.whatsappNotificationsEnabled ?? false);
}

/**
 * WhatsApp rejects a template parameter containing a newline, a tab, or four or
 * more consecutive spaces — so a brand name or note pasted with a line break
 * would fail the whole message.
 */
export function sanitizeBodyVar(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
