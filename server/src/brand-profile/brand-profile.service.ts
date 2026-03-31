import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBrandProfileDto } from './dto/create-brand-profile.dto';
import {
  PresignBrandLogoUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-brand-logo-upload.dto';
import { BrandProfileResponseDto } from './dto/brand-profile-response.dto';

@Injectable()
export class BrandProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private assertTempBrandLogoKeyOwner(userId: string, key: string): void {
    if (!this.storage.isTempBrandLogoKeyForUser(userId, key)) {
      throw new BadRequestException('Invalid logoKey');
    }
  }

  // Keep this mapping loosely typed because Prisma client types can lag behind
  // generation in some monorepo/dev setups.
  private mapBrandProfile(profile: any): BrandProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.user?.email ?? profile.email,
      companyName: profile.companyName,
      logoKey: profile.logoKey ?? null,
      logoUrl: profile.logoUrl ?? null,
      website: profile.website ?? null,
      industry: profile.industry ?? null,
      contactPerson: profile.contactPerson ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async presignBrandLogoUpload(
    userId: string,
    dto: PresignBrandLogoUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildObjectKey({
      kind: 'brand_logo',
      userId,
      contentType: dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  async createBrandProfile(
    userId: string,
    dto: CreateBrandProfileDto,
  ): Promise<BrandProfileResponseDto> {
    const logoKey = dto.logoKey?.trim();
    if (logoKey) {
      this.assertTempBrandLogoKeyOwner(userId, logoKey);
    }

    const brandProfileId = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.brandProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Brand profile already exists');
      }

      const created = await tx.brandProfile.create({
        data: {
          userId,
          companyName: dto.companyName,
          website: dto.website ?? null,
          industry: dto.industry ?? null,
          contactPerson: dto.contactPerson ?? null,
        },
        select: { id: true },
      });

      return created.id;
    });

    if (logoKey) {
      const finalLogoKey = await this.storage.finalizeBrandLogoKey({
        tempKey: logoKey,
        brandProfileId,
        deleteTemp: true,
      });

      await this.prisma.brandProfile.update({
        where: { id: brandProfileId },
        data: {
          logoKey: finalLogoKey,
          logoUrl: this.storage.buildCdnUrl(finalLogoKey),
        } as any,
      });
    }

    const profile = await this.prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
      select: {
        id: true,
        userId: true,
        companyName: true,
        logoKey: true,
        logoUrl: true,
        website: true,
        industry: true,
        contactPerson: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true } },
      } as any,
    });

    if (!profile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.mapBrandProfile(profile);
  }
}

