import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { EmailTemplateKey } from './mail.types';

@Injectable()
export class CreatorProfileMailNotifier {
  private readonly logger = new Logger(CreatorProfileMailNotifier.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
        },
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

      const context: Record<string, string> = {
        recipientName: this.recipientName(profile),
      };
      const reason = rejectionReason?.trim();
      if (reason) {
        context.rejectionReason = reason;
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
        user: { select: { email: true, name: true } },
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

  private recipientName(profile: {
    displayName: string;
    user: { name: string | null };
  }): string {
    return profile.displayName?.trim() || profile.user.name?.trim() || 'Creator';
  }

  private frontendBase(): string {
    return this.config.get<string>('FRONTEND_URL')!.replace(/\/$/, '');
  }
}
