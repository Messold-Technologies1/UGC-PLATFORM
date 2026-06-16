import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateKey } from './whatsapp.types';

@Injectable()
export class CreatorProfileWhatsAppNotifier {
  private readonly logger = new Logger(CreatorProfileWhatsAppNotifier.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  notifyApproved(creatorProfileId: string): void {
    void this.run('creator_profile_approved', async () => {
      const profile = await this.loadProfile(creatorProfileId);
      if (!profile) return;

      const phone = this.recipientPhone(profile);
      if (!phone) {
        this.logger.debug(
          `skip whatsapp creator_profile_approved: no verified phone for profile ${creatorProfileId}`,
        );
        return;
      }

      await this.whatsapp.send({
        to: phone,
        templateKey: WhatsAppTemplateKey.CREATOR_PROFILE_APPROVED,
        variables: [this.recipientName(profile)],
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

      const phone = this.recipientPhone(profile);
      if (!phone) {
        this.logger.debug(
          `skip whatsapp creator_profile_rejected: no verified phone for profile ${creatorProfileId}`,
        );
        return;
      }

      await this.whatsapp.send({
        to: phone,
        templateKey: WhatsAppTemplateKey.CREATOR_PROFILE_REJECTED,
        variables: [
          this.recipientName(profile),
          rejectionReason?.trim() || 'No specific reason provided',
        ],
      });
    });
  }

  private async run(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `creator profile whatsapp ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async loadProfile(creatorProfileId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        id: true,
        displayName: true,
        user: { select: { name: true, phone: true, phoneVerified: true } },
      },
    });
    if (!profile) {
      this.logger.warn(
        `creator profile whatsapp: profile not found ${creatorProfileId}`,
      );
    }
    return profile;
  }

  private recipientPhone(profile: {
    user: { phone: string | null; phoneVerified: boolean };
  }): string | null {
    if (!profile.user.phoneVerified || !profile.user.phone?.trim()) return null;
    return profile.user.phone.trim();
  }

  private recipientName(profile: {
    displayName: string;
    user: { name: string | null };
  }): string {
    return (
      profile.displayName?.trim() || profile.user.name?.trim() || 'Creator'
    );
  }
}
