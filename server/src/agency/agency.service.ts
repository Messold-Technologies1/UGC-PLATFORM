import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PhoneVerificationService } from '../auth/phone-verification.service';
import { BrandProfileService } from '../brand-profile/brand-profile.service';
import {
  PresignUploadResponseDto,
} from '../brand-profile/dto/presign-brand-logo-upload.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreateBrandProfileDto } from '../brand-profile/dto/create-brand-profile.dto';
import type { BrandProfileResponseDto } from '../brand-profile/dto/brand-profile-response.dto';
import type { CreateAgencyProfileDto } from './dto/create-agency-profile.dto';
import type { AgencyProfileResponseDto } from './dto/agency-profile-response.dto';
import type { AgencyBrandSummaryDto } from './dto/agency-brand-summary.dto';
import type { SwitchAgencyBrandResponseDto } from './dto/switch-agency-brand-response.dto';
import type { PresignAgencyLogoUploadDto } from './dto/presign-agency-logo-upload.dto';

type AgencyRow = {
  id: string;
  ownerUserId: string;
  name: string;
  logoKey: string | null;
  logoUrl: string | null;
  website: string | null;
  contactFullName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactPhoneVerified: boolean;
  lastActiveBrandProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  brands: AgencyBrandSummaryDto[];
};

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandProfileService: BrandProfileService,
    private readonly storage: StorageService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}

  private mapAgency(agency: AgencyRow): AgencyProfileResponseDto {
    return {
      id: agency.id,
      ownerUserId: agency.ownerUserId,
      name: agency.name,
      logoKey: agency.logoKey,
      logoUrl: agency.logoUrl,
      website: agency.website,
      contactFullName: agency.contactFullName,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone,
      contactPhoneVerified: agency.contactPhoneVerified,
      activeBrandProfileId: agency.lastActiveBrandProfileId,
      brands: agency.brands,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    };
  }

  private assertTempAgencyLogoKeyOwner(userId: string, key: string): void {
    if (!this.storage.isTempAgencyLogoKeyForUser(userId, key)) {
      throw new BadRequestException('Invalid logoKey');
    }
  }

  async assertContactPhoneAvailable(
    phone: string,
    excludeAgencyId?: string,
  ): Promise<void> {
    const existing = await this.prisma.agency.findFirst({
      where: {
        contactPhone: phone,
        contactPhoneVerified: true,
        ...(excludeAgencyId ? { NOT: { id: excludeAgencyId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('This phone number is already in use.');
    }
  }

  async sendContactPhoneOtp(ownerUserId: string, phone: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { ownedAgency: { select: { id: true } } },
    });
    if (user?.ownedAgency) {
      throw new ConflictException('Agency profile already exists');
    }

    await this.assertContactPhoneAvailable(phone);
    await this.phoneVerification.sendVerificationCode(phone);
  }

  private async verifyContactPhoneOtp(
    phone: string,
    code: string,
  ): Promise<void> {
    const status = await this.phoneVerification.verifyCode(phone, code);
    if (status === 'approved') return;

    if (status === 'max_attempts_reached') {
      throw new HttpException(
        {
          status,
          contactPhoneVerified: false,
          message: 'Too many attempts. Please resend OTP.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new BadRequestException('Invalid or expired verification code.');
  }

  async presignAgencyLogoUpload(
    userId: string,
    dto: PresignAgencyLogoUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildObjectKey({
      kind: 'agency_logo',
      userId,
      contentType: dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  async createAgencyProfile(
    ownerUserId: string,
    dto: CreateAgencyProfileDto,
  ): Promise<AgencyProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { deletedAt: true, ownedAgency: { select: { id: true } } },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    if (user.ownedAgency) {
      throw new ConflictException('Agency profile already exists');
    }

    const contactFullName = dto.contactFullName.trim();
    const contactEmail = dto.contactEmail.trim().toLowerCase();
    const contactPhone = dto.contactPhone?.trim() || null;
    const website = dto.website?.trim() || null;
    const logoKey = dto.logoKey?.trim();

    if (logoKey) {
      this.assertTempAgencyLogoKeyOwner(ownerUserId, logoKey);
    }

    let contactPhoneVerified = false;
    if (contactPhone) {
      const otpCode = dto.contactPhoneOtpCode?.trim();
      if (!otpCode) {
        throw new BadRequestException(
          'contactPhoneOtpCode is required when contactPhone is provided',
        );
      }
      await this.assertContactPhoneAvailable(contactPhone);
      await this.verifyContactPhoneOtp(contactPhone, otpCode);
      contactPhoneVerified = true;
    }

    const agency = await this.prisma.$transaction(async (tx) => {
      const agencyRole = await tx.role.findUnique({
        where: { name: RoleName.AGENCY },
        select: { id: true },
      });
      if (!agencyRole) {
        throw new NotFoundException('AGENCY role not configured');
      }

      const created = await tx.agency.create({
        data: {
          ownerUserId,
          name: dto.name.trim(),
          contactFullName,
          contactEmail,
          contactPhone,
          contactPhoneVerified,
          website,
        },
        select: {
          id: true,
          ownerUserId: true,
          name: true,
          logoKey: true,
          logoUrl: true,
          website: true,
          contactFullName: true,
          contactEmail: true,
          contactPhone: true,
          contactPhoneVerified: true,
          lastActiveBrandProfileId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.userRole.upsert({
        where: {
          userId_roleId: { userId: ownerUserId, roleId: agencyRole.id },
        },
        create: { userId: ownerUserId, roleId: agencyRole.id },
        update: {},
      });

      const currentUser = await tx.user.findUnique({
        where: { id: ownerUserId },
        select: { primaryRoleId: true },
      });
      if (!currentUser?.primaryRoleId) {
        await tx.user.update({
          where: { id: ownerUserId },
          data: { primaryRoleId: agencyRole.id },
        });
      }

      return created;
    });

    if (logoKey) {
      const finalLogoKey = await this.storage.finalizeAgencyLogoKey({
        tempKey: logoKey,
        agencyId: agency.id,
        deleteTemp: true,
      });
      const updated = await this.prisma.agency.update({
        where: { id: agency.id },
        data: {
          logoKey: finalLogoKey,
          logoUrl: this.storage.buildCdnUrl(finalLogoKey),
        },
        select: {
          id: true,
          ownerUserId: true,
          name: true,
          logoKey: true,
          logoUrl: true,
          website: true,
          contactFullName: true,
          contactEmail: true,
          contactPhone: true,
          contactPhoneVerified: true,
          lastActiveBrandProfileId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return this.mapAgency({ ...updated, brands: [] });
    }

    return this.mapAgency({ ...agency, brands: [] });
  }

  async getAgencyProfileForOwner(
    ownerUserId: string,
  ): Promise<AgencyProfileResponseDto> {
    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId },
      include: {
        brands: {
          select: { id: true, brandName: true, logoUrl: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!agency) {
      throw new NotFoundException('Agency profile not found');
    }
    return this.mapAgency(agency as AgencyRow);
  }

  async createBrandUnderAgency(params: {
    ownerUserId: string;
    dto: CreateBrandProfileDto;
  }): Promise<BrandProfileResponseDto> {
    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: params.ownerUserId },
      select: { id: true },
    });
    if (!agency) {
      throw new NotFoundException('Agency profile not found');
    }

    const profile = await this.brandProfileService.createBrandProfileForAgency({
      agencyId: agency.id,
      actorUserId: params.ownerUserId,
      dto: params.dto,
    });

    await this.prisma.agency.update({
      where: { id: agency.id },
      data: { lastActiveBrandProfileId: profile.id },
    });

    return profile;
  }

  async listBrandsForAgency(
    ownerUserId: string,
  ): Promise<AgencyBrandSummaryDto[]> {
    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId },
      select: {
        brands: {
          select: { id: true, brandName: true, logoUrl: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!agency) {
      throw new NotFoundException('Agency profile not found');
    }
    return agency.brands;
  }

  async switchActiveBrand(params: {
    ownerUserId: string;
    brandProfileId: string;
  }): Promise<SwitchAgencyBrandResponseDto> {
    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: params.ownerUserId },
      select: { id: true },
    });
    if (!agency) {
      throw new NotFoundException('Agency profile not found');
    }

    const brand = await this.prisma.brandProfile.findFirst({
      where: {
        id: params.brandProfileId,
        agencyId: agency.id,
      },
      select: { id: true, brandName: true, logoUrl: true },
    });
    if (!brand) {
      throw new ForbiddenException('Brand does not belong to this agency');
    }

    await this.prisma.agency.update({
      where: { id: agency.id },
      data: { lastActiveBrandProfileId: brand.id },
    });

    return {
      activeBrandProfileId: brand.id,
      brandName: brand.brandName,
      logoUrl: brand.logoUrl,
    };
  }
}
