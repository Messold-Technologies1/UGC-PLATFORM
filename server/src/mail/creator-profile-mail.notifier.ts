import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { isProfileFirstOnboardingMode } from '../config/creator-onboarding-mode';
import { MailService } from './mail.service';
import { EmailTemplateKey } from './mail.types';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { sendWhatsAppForEmail } from './whatsapp-bridge.util';

@Injectable()
export class CreatorProfileMailNotifier {
  private readonly logger = new Logger(CreatorProfileMailNotifier.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  notifyApproved(creatorProfileId: string): void {
    void this.run('creator_profile_approved', async () => {
      const profile = await this.loadProfile(creatorProfileId);
      if (!profile) return;

      const email = this.recipientEmail(profile);
      if (!email) {
        this.logger.warn(
          `creator email approved: no email for profile ${creatorProfileId}`,
        );
        return;
      }

      this.logger.log(
        `creator approval email: profile=${creatorProfileId} to=${email}`,
      );
      await this.mail.send({
        to: email,
        templateKey: EmailTemplateKey.CREATOR_PROFILE_APPROVED,
        notificationGate: {
          profileType: 'creator',
          profileId: creatorProfileId,
        },
        context: {
          recipientName: this.recipientName(profile),
          actionUrl: `${this.frontendBase()}/creator/account`,
          profileFirstMode: this.profileFirstMode(),
        },
      });
      await sendWhatsAppForEmail(this.whatsapp, this.config, {
        to: this.recipientPhone(profile),
        emailKey: EmailTemplateKey.CREATOR_PROFILE_APPROVED,
        recipientName: this.recipientName(profile),
        actionUrl: `${this.frontendBase()}/creator/account`,
        gate: { profileType: 'creator', profileId: creatorProfileId },
      });
    });
  }

  notifyRejected(
    creatorProfileId: string,
    rejectionReason?: string | null,
  ): void {
    void this.run('creator_profile_rejected', async () => {
      const profile = await this.loadProfile(creatorProfileId);
      if (!profile) return;

      const email = this.recipientEmail(profile);
      if (!email) {
        this.logger.warn(
          `creator email rejected: no email for profile ${creatorProfileId}`,
        );
        return;
      }

      const context: Record<string, string | boolean> = {
        recipientName: this.recipientName(profile),
        profileFirstMode: this.profileFirstMode(),
      };
      const reason = rejectionReason?.trim();
      if (reason) {
        context.rejectionReason = reason;
      }
      if (this.profileFirstMode()) {
        context.actionUrl = `${this.frontendBase()}/creator/settings/profile`;
      }

      await this.mail.send({
        to: email,
        templateKey: EmailTemplateKey.CREATOR_PROFILE_REJECTED,
        notificationGate: {
          profileType: 'creator',
          profileId: creatorProfileId,
        },
        context,
      });
      await sendWhatsAppForEmail(this.whatsapp, this.config, {
        to: this.recipientPhone(profile),
        emailKey: EmailTemplateKey.CREATOR_PROFILE_REJECTED,
        recipientName: this.recipientName(profile),
        actionUrl:
          typeof context.actionUrl === 'string' ? context.actionUrl : undefined,
        gate: { profileType: 'creator', profileId: creatorProfileId },
      });
    });
  }

  /**
   * Reminder to finish a still-building profile. `stage` selects the copy:
   * 1 = +30min nudge, 2 = +24h, 3 = +48h last call. Awaitable so the caller can
   * stamp its bookkeeping only after the send has been attempted.
   */
  notifyCompletionReminder(
    creatorProfileId: string,
    stage: 1 | 2 | 3,
  ): Promise<void> {
    return this.run('creator_profile_completion_reminder', async () => {
      const profile = await this.loadProfile(creatorProfileId);
      if (!profile) return;

      const email = this.recipientEmail(profile);
      if (!email) {
        this.logger.warn(
          `creator completion reminder: no email for profile ${creatorProfileId}`,
        );
        return;
      }

      await this.mail.send({
        to: email,
        templateKey: EmailTemplateKey.CREATOR_PROFILE_COMPLETION_REMINDER,
        notificationGate: {
          profileType: 'creator',
          profileId: creatorProfileId,
        },
        context: {
          recipientName: this.recipientName(profile),
          actionUrl: `${this.frontendBase()}/creator/settings/profile`,
          isStage1: stage === 1,
          isStage2: stage === 2,
          isStage3: stage === 3,
        },
      });
      await sendWhatsAppForEmail(this.whatsapp, this.config, {
        to: this.recipientPhone(profile),
        emailKey: EmailTemplateKey.CREATOR_PROFILE_COMPLETION_REMINDER,
        recipientName: this.recipientName(profile),
        actionUrl: `${this.frontendBase()}/creator/settings/profile`,
        gate: { profileType: 'creator', profileId: creatorProfileId },
      });
    });
  }

  private async run(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `creator profile email ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async loadProfile(creatorProfileId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        id: true,
        displayName: true,
        contactEmail: true,
        user: { select: { email: true, name: true, phone: true } },
      },
    });
    if (!profile) {
      this.logger.warn(
        `creator profile email: profile not found ${creatorProfileId}`,
      );
    }
    return profile;
  }

  private recipientEmail(profile: {
    contactEmail: string | null;
    user: { email: string };
  }): string | null {
    return profile.contactEmail?.trim() || profile.user.email?.trim() || null;
  }

  private recipientPhone(profile: {
    user: { phone: string | null };
  }): string | null {
    return profile.user.phone?.trim() || null;
  }

  private recipientName(profile: {
    displayName: string;
    user: { name: string | null };
  }): string {
    return profile.displayName?.trim() || profile.user.name?.trim() || 'Creator';
  }

  private frontendBase(): string {
    return this.config.get<string>('FRONTEND_URL')!.replace(/\/$/, '');
  }

  private profileFirstMode(): boolean {
    return isProfileFirstOnboardingMode(
      this.config.get<string>('CREATOR_ONBOARDING_MODE'),
    );
  }
}
