import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AgencyService } from '../agency/agency.service';
import { BrandProfileService } from '../brand-profile/brand-profile.service';
import type { CreateBrandProfileDto } from '../brand-profile/dto/create-brand-profile.dto';
import { CreatorProfileService } from '../creator-profile/creator-profile.service';
import { CreatorReminderQueueService } from '../jobs/creator-reminder-queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { RegisterAgencyDto } from './dto/register-agency.dto';
import { PhoneVerificationService } from './phone-verification.service';

const SALT_ROUNDS = 10;

/**
 * Meta attribution captured at the moment a profile is created: the `_fbp` /
 * `_fbc` cookies read in the user's own browser, plus the request IP and
 * user-agent. Stored on the creator profile so the Conversions API can replay
 * them on events that fire out-of-band later (e.g. CreatorProfileListed, sent
 * when an admin approves the creator days after signup).
 */
export type MetaSignupAttribution = {
  metaFbp?: string;
  metaFbc?: string;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class SignupRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneVerification: PhoneVerificationService,
    private readonly storage: StorageService,
    private readonly creatorProfileService: CreatorProfileService,
    private readonly brandProfileService: BrandProfileService,
    private readonly agencyService: AgencyService,
    private readonly creatorReminders: CreatorReminderQueueService,
  ) {}

  /**
   * Create a brand profile for an EXISTING user who already has a verified
   * phone (normal email+password signup). Uses their name as the contact name
   * and their verified phone as the contact phone, so they skip the
   * /onboarding/brand setup step entirely. Attaches the BRAND role
   * (forcePrimaryBrandRole) and sends the brand welcome mail.
   */
  async onboardExistingUserAsBrand(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.brandProfileService.createOwnedBrandProfileForUser(userId, {
      contactFullName: user.name?.trim() || '',
      ...(user.phone ? { contactPhone: user.phone } : {}),
    } as CreateBrandProfileDto);
  }

  private async assertSignupPhoneOtpApproved(
    phone: string,
    code: string,
  ): Promise<void> {
    const status = await this.phoneVerification.verifyCode(phone, code);
    if (status === 'approved') return;
    if (status === 'max_attempts_reached') {
      throw new BadRequestException(
        'Too many OTP attempts. Please resend the code and try again.',
      );
    }
    throw new BadRequestException('Invalid or expired verification code.');
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
    meta?: MetaSignupAttribution,
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
            metaFbp: meta?.metaFbp ?? null,
            metaFbc: meta?.metaFbc ?? null,
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
      await this.creatorReminders
        .scheduleReminders(
          creatorProfileId,
          profile.completionReminderStartedAt,
        )
        .catch(() => undefined);
    }
  }

  async registerAgencyUser(dto: RegisterAgencyDto): Promise<string> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const contactPhone = dto.contactPhone?.trim() || null;
    let contactPhoneVerified = false;
    if (contactPhone) {
      const otp = dto.contactPhoneOtpCode?.trim();
      if (!otp) {
        throw new BadRequestException(
          'contactPhoneOtpCode is required when contactPhone is provided',
        );
      }
      await this.agencyService.assertContactPhoneAvailable(contactPhone);
      await this.assertSignupPhoneOtpApproved(contactPhone, otp);
      contactPhoneVerified = true;
    }

    const logoKey = dto.logoKey?.trim();
    if (logoKey) {
      if (!this.storage.isTempAgencyLogoKeyForSignup(email, logoKey)) {
        throw new BadRequestException('Invalid logoKey');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { userId, agencyId } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: dto.contactFullName.trim(),
          passwordHash,
          primaryRoleId: null,
        },
      });
      const agency = await this.agencyService.runCreateAgencyInTransaction(
        tx,
        user.id,
        {
          name: dto.name,
          contactFullName: dto.contactFullName,
          contactEmail: dto.contactEmail,
          contactPhone,
          contactPhoneVerified,
          website: dto.website?.trim() || null,
        },
      );
      return { userId: user.id, agencyId: agency.id };
    }, { timeout: 30_000, maxWait: 10_000 });

    if (logoKey) {
      const finalLogoKey = await this.storage.finalizeAgencyLogoKey({
        tempKey: logoKey,
        agencyId,
        deleteTemp: true,
      });
      await this.prisma.agency.update({
        where: { id: agencyId },
        data: {
          logoKey: finalLogoKey,
          logoUrl: this.storage.buildCdnUrl(finalLogoKey),
        },
      });
    }

    return userId;
  }
}
