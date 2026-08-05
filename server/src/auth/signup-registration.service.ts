import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AgencyService } from '../agency/agency.service';
import { BrandProfileService } from '../brand-profile/brand-profile.service';
import { CreateBrandProfileDto } from '../brand-profile/dto/create-brand-profile.dto';
import { CreatorProfileService } from '../creator-profile/creator-profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { RegisterAgencyDto } from './dto/register-agency.dto';
import type { RegisterBrandDto } from './dto/register-brand.dto';
import type { RegisterCreatorDto } from './dto/register-creator.dto';
import { PhoneVerificationService } from './phone-verification.service';

const SALT_ROUNDS = 10;

@Injectable()
export class SignupRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneVerification: PhoneVerificationService,
    private readonly storage: StorageService,
    private readonly creatorProfileService: CreatorProfileService,
    private readonly brandProfileService: BrandProfileService,
    private readonly agencyService: AgencyService,
  ) {}

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

  private registerBrandDtoToCreateDto(dto: RegisterBrandDto): CreateBrandProfileDto {
    const { email: _e, password: _p, contactEmail: _ce, contactPhone: _phone, ...rest } =
      dto;
    // contactEmail is optional at signup; brands can set it later in settings.
    // Outbound mail uses contactEmail if set, otherwise the account (User) email.
    return { ...rest } as CreateBrandProfileDto;
  }

  async registerCreatorUser(
    dto: RegisterCreatorDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<string> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // await this.assertSignupPhoneOtpApproved(dto.phone, dto.phoneOtpCode);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { userId } = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: dto.name.trim(),
            passwordHash,
            phone: dto.phone.trim(),
            // Set to true when signup OTP verification is re-enabled.
            phoneVerified: false,
            primaryRoleId: null,
          },
        });
        const id = await this.creatorProfileService.createCreatorProfileInTransaction(
          tx,
          user.id,
          {
            displayName: dto.name.trim(),
            contactEmail: email,
            instagramUrl: dto.instagramUrl?.trim() || null,
            metaFbp: dto.metaFbp?.trim() || null,
            metaFbc: dto.metaFbc?.trim() || null,
            metaSignupIp: meta?.ipAddress ?? null,
            metaSignupUserAgent: meta?.userAgent ?? null,
          },
        );
        return { userId: user.id, creatorProfileId: id };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    return userId;
  }

  async registerBrandUser(dto: RegisterBrandDto): Promise<string> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const brandDto = this.registerBrandDtoToCreateDto(dto);
    const logoKey = brandDto.logoKey?.trim();
    const pronunciationAudioKey = brandDto.brandPronunciationAudioKey?.trim();
    if (logoKey) {
      if (!this.storage.isTempBrandLogoKeyForSignup(email, logoKey)) {
        throw new BadRequestException('Invalid logoKey');
      }
    }
    if (pronunciationAudioKey) {
      if (!this.storage.isTempBrandPronunciationAudioKeyForSignup(
        email,
        pronunciationAudioKey,
      )) {
        throw new BadRequestException('Invalid brandPronunciationAudioKey');
      }
    }

    const userName =
      dto.contactFullName?.trim() || dto.brandName?.trim() || null;

    const { userId, brandProfileId } = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: userName,
            passwordHash,
            primaryRoleId: null,
          },
        });
        const id =
          await this.brandProfileService.runCreateOwnedBrandProfileInTransaction(
            tx,
            user.id,
            brandDto,
            { signupEmail: email, forcePrimaryBrandRole: true },
          );
        return { userId: user.id, brandProfileId: id };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    await this.brandProfileService.finalizeOwnedBrandProfileAssets({
      brandProfileId,
      actorUserId: userId,
      logoKey,
      pronunciationAudioKey,
    });

    return userId;
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
