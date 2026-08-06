import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  resolveBrandMailAddress,
  resolveBrandMailDisplayName,
} from './brand-mail.recipient';
import { MailService } from './mail.service';
import { EmailTemplateKey } from './mail.types';

@Injectable()
export class BrandProfileMailNotifier {
  private readonly logger = new Logger(BrandProfileMailNotifier.name);

  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  /** Fire-and-forget welcome email after a brand profile is created. */
  notifyWelcome(brandProfileId: string): void {
    void this.run('brand_welcome', async () => {
      const profile = await this.prisma.brandProfile.findUnique({
        where: { id: brandProfileId },
        select: {
          id: true,
          brandName: true,
          contactFullName: true,
          contactEmail: true,
        },
      });
      if (!profile) {
        this.logger.warn(
          `brand welcome email: profile not found ${brandProfileId}`,
        );
        return;
      }

      const actorUserId =
        await this.brandAccess.resolveBrandActorUserIdForProfile(brandProfileId);
      const user = await this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { email: true, name: true },
      });

      const email = resolveBrandMailAddress({
        contactEmail: profile.contactEmail,
        accountEmail: user?.email,
      });
      if (!email) {
        this.logger.warn(
          `brand welcome email: no email for profile ${brandProfileId}`,
        );
        return;
      }

      const recipientName = resolveBrandMailDisplayName({
        contactFullName: profile.contactFullName,
        brandName: profile.brandName,
        accountName: user?.name,
        fallback: 'there',
      });

      this.logger.log(
        `brand welcome email: profile=${brandProfileId} to=${email}`,
      );
      await this.mail.send({
        to: email,
        templateKey: EmailTemplateKey.BRAND_WELCOME,
        notificationGate: {
          profileType: 'brand',
          profileId: brandProfileId,
        },
        context: {
          recipientName,
          actionUrl: `${this.frontendBase()}/brand/settings/profile`,
        },
      });
    });
  }

  private async run(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `brand profile email ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private frontendBase(): string {
    return this.config.get<string>('FRONTEND_URL')!.replace(/\/$/, '');
  }
}
