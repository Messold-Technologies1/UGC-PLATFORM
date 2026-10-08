import { BadRequestException, Injectable } from '@nestjs/common';
import { BrandProfileService } from '../brand-profile/brand-profile.service';
import type { CreateBrandProfileDto } from '../brand-profile/dto/create-brand-profile.dto';
import { CreatorProfileService } from '../creator-profile/creator-profile.service';
import { PrismaService } from '../prisma/prisma.service';
import type { MetaBrowserAttribution } from '../meta-capi/meta-capi.service';
import { NotificationEventsService } from '../notifications/dispatch/notification-events.service';

@Injectable()
export class SignupRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorProfileService: CreatorProfileService,
    private readonly brandProfileService: BrandProfileService,
    private readonly events: NotificationEventsService,
  ) {}

  /**
   * Create a brand profile for an EXISTING user who already has a verified
   * phone (normal email+password signup). Uses their name as the contact name
   * and their verified phone as the contact phone, so they skip the
   * /onboarding/brand setup step entirely. Attaches the BRAND role
   * (forcePrimaryBrandRole) and sends the brand welcome mail.
   */
  async onboardExistingUserAsBrand(
    userId: string,
    meta?: MetaBrowserAttribution,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.brandProfileService.createOwnedBrandProfileForUser(
      userId,
      {
        contactFullName: user.name?.trim() || '',
        ...(user.phone ? { contactPhone: user.phone } : {}),
      } as CreateBrandProfileDto,
      meta,
    );
  }

  /**
   * Attach the CREATOR role and a creator profile to an EXISTING user who
   * signed up (via Google or email+password) without picking a role yet.
   * Used by the post-signup "choose your role" step. Reuses the same
   * transactional profile creation, which also enforces the one-email-one-role
   * rule.
   */
  async onboardExistingUserAsCreator(
    userId: string,
    meta?: MetaBrowserAttribution,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existingCreator = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existingCreator) {
      // Already a creator — nothing to do; treat as idempotent success.
      return;
    }

    // Google supplies a name; email+password signup may not. Fall back to the
    // email local-part so the profile is valid — the creator edits it on the
    // profile screen we drop them onto next.
    const displayName =
      user.name?.trim() || user.email.split('@')[0] || 'Creator';

    const creatorProfileId = await this.prisma.$transaction(
      async (tx) =>
        this.creatorProfileService.createCreatorProfileInTransaction(
          tx,
          userId,
          {
            displayName,
            contactEmail: user.email,
            metaFbp: meta?.fbp ?? null,
            metaFbc: meta?.fbc ?? null,
            metaSignupIp: meta?.ipAddress ?? null,
            metaSignupUserAgent: meta?.userAgent ?? null,
          },
        ),
      { timeout: 30_000, maxWait: 10_000 },
    );

    // Schedule off the stored clock rather than `new Date()`: each delayed job
    // re-checks due-ness against completionReminderStartedAt, so a timestamp
    // that drifts from the column would fire jobs that can never claim.
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { completionReminderStartedAt: true },
    });
    if (profile) {
      // Schedule rows measure their offsets from occurredAt, so passing the
      // stored column rather than `new Date()` keeps a drip on the clock it
      // started on.
      void this.events.emit('creator-profile-completion-reminder', {
        entityId: creatorProfileId,
        occurredAt: profile.completionReminderStartedAt,
      });
    }
  }
}
