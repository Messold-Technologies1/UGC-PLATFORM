import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BrandCategory, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBrandProfileDto } from './dto/create-brand-profile.dto';
import { UpdateBrandProfileDto } from './dto/update-brand-profile.dto';
import {
  PresignBrandLogoUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-brand-logo-upload.dto';
import {
  PresignBrandPronunciationUploadDto,
} from './dto/presign-brand-pronunciation-upload.dto';
import { BrandsListResponseDto } from './dto/brands-list-response.dto';
import { BrandProfileResponseDto } from './dto/brand-profile-response.dto';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import { RemoveBrandRoleDto } from './dto/remove-brand-role.dto';
import { BrandCategoryOptionsResponseDto } from './dto/brand-category-options-response.dto';
import { BRAND_CATEGORY_OPTIONS } from './brand-category-options';

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

  private assertTempBrandPronunciationAudioKeyOwner(
    userId: string,
    key: string,
  ): void {
    if (!this.storage.isTempBrandPronunciationAudioKeyForUser(userId, key)) {
      throw new BadRequestException('Invalid brandPronunciationAudioKey');
    }
  }

  // Keep this mapping loosely typed because Prisma client types can lag behind
  // generation in some monorepo/dev setups.
  private mapBrandProfile(profile: any): BrandProfileResponseDto {
    const categories: BrandCategory[] =
      profile.brandCategories?.map((b: { category: BrandCategory }) => b.category) ?? [];

    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.user?.email ?? profile.email,
      contactFullName: profile.contactFullName ?? null,
      contactEmail: profile.contactEmail ?? null,
      contactPhone: profile.contactPhone ?? null,
      brandName: profile.brandName,
      brandPronunciationAudioKey: profile.brandPronunciationAudioKey ?? null,
      brandPronunciationAudioUrl: profile.brandPronunciationAudioUrl ?? null,
      logoKey: profile.logoKey ?? null,
      logoUrl: profile.logoUrl ?? null,
      website: profile.website ?? null,
      instagramUrl: profile.instagramUrl ?? null,
      productType: profile.productType ?? null,
      categories,
      otherCategoryLabel: profile.otherCategoryLabel ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  getBrandCategoryOptions(): BrandCategoryOptionsResponseDto {
    return { items: [...BRAND_CATEGORY_OPTIONS] };
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

  async presignBrandPronunciationUpload(
    userId: string,
    dto: PresignBrandPronunciationUploadDto,
  ): Promise<PresignUploadResponseDto> {
    const key = this.storage.buildObjectKey({
      kind: 'brand_pronunciation_audio',
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        brandAccessRevokedAt: true,
      } as any,
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if ((user as any).brandAccessRevokedAt) {
      throw new ForbiddenException(
        'Brand profile creation has been disabled for this account',
      );
    }

    const logoKey = dto.logoKey?.trim();
    if (logoKey) {
      this.assertTempBrandLogoKeyOwner(userId, logoKey);
    }

    const pronunciationAudioKey = dto.brandPronunciationAudioKey?.trim();
    if (pronunciationAudioKey) {
      this.assertTempBrandPronunciationAudioKeyOwner(
        userId,
        pronunciationAudioKey,
      );
    }

    const selectedCategories = [...new Set(dto.categories ?? [])];
    const includesOther = selectedCategories.includes(BrandCategory.OTHER);
    const otherCategoryLabel = includesOther
      ? (dto.otherCategoryLabel ?? '').trim()
      : '';
    if (includesOther && !otherCategoryLabel) {
      throw new BadRequestException('otherCategoryLabel is required for OTHER category');
    }

    const brandProfileId = await this.prisma.$transaction(async (tx) => {
      const brandRole = await tx.role.findUnique({
        where: { name: RoleName.BRAND },
        select: { id: true },
      });
      if (!brandRole) {
        throw new NotFoundException('BRAND role not configured');
      }

      const currentUser: any = await tx.user.findUnique({
        where: { id: userId },
        select: {
          primaryRoleId: true,
          creatorProfile: { select: { id: true } },
        } as any,
      });
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }

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
          brandName: dto.brandName.trim(),
          contactFullName: dto.contactFullName.trim(),
          contactEmail: dto.contactEmail.trim(),
          contactPhone: dto.contactPhone.trim(),
          website: dto.website?.trim() || null,
          instagramUrl: dto.instagramUrl?.trim() || null,
          productType: dto.productType ?? null,
          otherCategoryLabel: includesOther ? otherCategoryLabel : null,
        } as any,
        select: { id: true },
      });

      if (selectedCategories.length) {
        await tx.brandProfileBrandCategory.createMany({
          data: selectedCategories.map((category) => ({
            brandProfileId: created.id,
            category,
          })),
          skipDuplicates: true,
        });
      }

      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: brandRole.id } },
        create: { userId, roleId: brandRole.id },
        update: {},
      });

      if (!currentUser.primaryRoleId && !currentUser.creatorProfile) {
        await tx.user.update({
          where: { id: userId },
          data: { primaryRoleId: brandRole.id } as any,
        });
      }

      return created.id;
    });

    const assetData: Record<string, string> = {};
    if (logoKey) {
      const finalLogoKey = await this.storage.finalizeBrandLogoKey({
        tempKey: logoKey,
        brandProfileId,
        deleteTemp: true,
      });
      assetData.logoKey = finalLogoKey;
      assetData.logoUrl = this.storage.buildCdnUrl(finalLogoKey);
    }
    if (pronunciationAudioKey) {
      const finalPKey = await this.storage.finalizeBrandPronunciationAudioKey({
        tempKey: pronunciationAudioKey,
        brandProfileId,
        deleteTemp: true,
      });
      assetData.brandPronunciationAudioKey = finalPKey;
      assetData.brandPronunciationAudioUrl =
        this.storage.buildCdnUrl(finalPKey);
    }
    if (Object.keys(assetData).length) {
      await this.prisma.brandProfile.update({
        where: { id: brandProfileId },
        data: assetData as any,
      });
    }

    const profile = await this.prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
      select: {
        id: true,
        userId: true,
        contactFullName: true,
        contactEmail: true,
        contactPhone: true,
        brandName: true,
        brandPronunciationAudioKey: true,
        brandPronunciationAudioUrl: true,
        logoKey: true,
        logoUrl: true,
        website: true,
        instagramUrl: true,
        productType: true,
        otherCategoryLabel: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true } },
        brandCategories: { select: { category: true } },
      } as any,
    });

    if (!profile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.mapBrandProfile(profile);
  }

  async listBrands(query: ListBrandsQueryDto): Promise<BrandsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      brandAccessRevokedAt: null,
      brandProfile: {
        isNot: null,
      },
      OR: [
        { primaryRole: { name: RoleName.BRAND } },
        { userRoles: { some: { role: { name: RoleName.BRAND } } } },
      ],
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where } as any),
      this.prisma.user.findMany({
        where: where as any,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          brandProfile: true,
        } as any,
      }),
    ]);

    return {
      items: users.map((user: any) => ({
        userId: user.id,
        brandProfileId: user.brandProfile?.id ?? null,
        email: user.email,
        name: user.name ?? null,
        brandName: user.brandProfile?.brandName ?? null,
        contactFullName: user.brandProfile?.contactFullName ?? null,
        contactPhone: user.brandProfile?.contactPhone ?? null,
        categories: user.brandProfile?.brandCategories?.map((bc: { category: BrandCategory }) => bc.category) ?? [],
        logoUrl: user.brandProfile?.logoUrl ?? null,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async removeBrandAccessFromUser(
    adminUserId: string,
    userId: string,
    dto?: RemoveBrandRoleDto,
  ): Promise<void> {
    let logoKeyToDelete: string | null = null;
    let pronunciationAudioKeyToDelete: string | null = null;

    await this.prisma.$transaction(
      async (tx) => {
        const brandRole = await tx.role.findUnique({
          where: { name: RoleName.BRAND },
          select: { id: true },
        });

        const creatorRole = await tx.role.findUnique({
          where: { name: RoleName.CREATOR },
          select: { id: true },
        });

        if (!brandRole) {
          throw new NotFoundException('BRAND role not configured');
        }

        const user: any = await tx.user.findUnique({
          where: { id: userId },
          include: {
            brandProfile: true,
            userRoles: true,
          } as any,
        });

        if (!user || user.deletedAt) {
          throw new NotFoundException('User not found');
        }

        const hasBrandPrimaryRole = user.primaryRoleId === brandRole.id;
        const hasBrandUserRole = user.userRoles.some(
          (ur: any) => ur.roleId === brandRole.id,
        );
        const hasBrandProfile = !!user.brandProfile;

        if (!hasBrandPrimaryRole && !hasBrandUserRole && !hasBrandProfile) {
          throw new BadRequestException(
            'User does not currently have brand access',
          );
        }

        const hasCreatorRole =
          !!creatorRole &&
          user.userRoles.some((ur: any) => ur.roleId === creatorRole.id);

        const fallbackRoleId =
          hasCreatorRole && creatorRole ? creatorRole.id : null;

        await tx.userRole.deleteMany({
          where: {
            userId,
            roleId: brandRole.id,
          },
        });

        if (hasBrandPrimaryRole) {
          await tx.user.update({
            where: { id: userId },
            data: {
              primaryRoleId: fallbackRoleId,
            } as any,
          });
        }

        if (user.brandProfile) {
          logoKeyToDelete = user.brandProfile.logoKey ?? null;
          pronunciationAudioKeyToDelete =
            user.brandProfile.brandPronunciationAudioKey ?? null;

          await tx.brandProfile.delete({
            where: { userId },
          });
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            brandAccessRevokedAt: new Date(),
            brandAccessRevokedById: adminUserId,
            brandAccessRevocationReason: dto?.reason?.trim() || null,
          } as any,
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    if (logoKeyToDelete) {
      try {
        await this.storage.deleteObjectIfExists(logoKeyToDelete);
      } catch {
        // Keep removal durable even if storage cleanup fails.
      }
    }
    if (pronunciationAudioKeyToDelete) {
      try {
        await this.storage.deleteObjectIfExists(pronunciationAudioKeyToDelete);
      } catch {
        // same
      }
    }
  }

  async getBrandProfileForCurrentUser(
    userId: string,
  ): Promise<BrandProfileResponseDto> {
    const profile = await this.prisma.brandProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        contactFullName: true,
        contactEmail: true,
        contactPhone: true,
        brandName: true,
        brandPronunciationAudioKey: true,
        brandPronunciationAudioUrl: true,
        logoKey: true,
        logoUrl: true,
        website: true,
        instagramUrl: true,
        productType: true,
        otherCategoryLabel: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true } },
        brandCategories: { select: { category: true } },
      } as any,
    });

    if (!profile) {
      throw new NotFoundException('Brand profile not found');
    }

    return this.mapBrandProfile(profile);
  }

  async updateBrandProfileForCurrentUser(
    userId: string,
    dto: UpdateBrandProfileDto,
  ): Promise<BrandProfileResponseDto> {
    const existing: any = await this.prisma.brandProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        logoKey: true,
        brandPronunciationAudioKey: true,
        otherCategoryLabel: true,
      },
    } as any);
    if (!existing) {
      throw new NotFoundException('Brand profile not found');
    }

    const trimmedName =
      dto.brandName === undefined ? undefined : dto.brandName.trim();
    if (trimmedName !== undefined && !trimmedName) {
      throw new BadRequestException('brandName cannot be empty');
    }

    let website: string | null | undefined;
    if (dto.website === undefined) {
      website = undefined;
    } else if (dto.website === null) {
      website = null;
    } else {
      website = dto.website.trim() || null;
    }

    let instagramUrl: string | null | undefined;
    if (dto.instagramUrl === undefined) {
      instagramUrl = undefined;
    } else if (dto.instagramUrl === null) {
      instagramUrl = null;
    } else {
      instagramUrl = dto.instagramUrl.trim() || null;
    }

    const data: Record<string, unknown> = {};
    if (trimmedName !== undefined) {
      data.brandName = trimmedName;
    }
    if (website !== undefined) {
      data.website = website;
    }
    if (instagramUrl !== undefined) {
      data.instagramUrl = instagramUrl;
    }

    if (dto.contactFullName !== undefined) {
      const v = dto.contactFullName.trim();
      if (!v) {
        throw new BadRequestException('contactFullName cannot be empty');
      }
      data.contactFullName = v;
    }
    if (dto.contactEmail !== undefined) {
      const v = dto.contactEmail.trim();
      if (!v) {
        throw new BadRequestException('contactEmail cannot be empty');
      }
      data.contactEmail = v;
    }
    if (dto.contactPhone !== undefined) {
      const v = dto.contactPhone.trim();
      if (v.length < 7) {
        throw new BadRequestException('contactPhone is too short');
      }
      data.contactPhone = v;
    }

    if (dto.productType !== undefined) {
      data.productType = dto.productType;
    }

    const logoKeyRaw = dto.logoKey;
    if (logoKeyRaw !== undefined) {
      if (logoKeyRaw === null || logoKeyRaw === '') {
        data.logoKey = null;
        data.logoUrl = null;
      } else {
        const logoKey = logoKeyRaw.trim();
        if (this.storage.isTempBrandLogoKeyForUser(userId, logoKey)) {
          this.assertTempBrandLogoKeyOwner(userId, logoKey);
          const finalLogoKey = await this.storage.finalizeBrandLogoKey({
            tempKey: logoKey,
            brandProfileId: existing.id,
            deleteTemp: true,
          });
          data.logoKey = finalLogoKey;
          data.logoUrl = this.storage.buildCdnUrl(finalLogoKey);
        } else if (logoKey === (existing.logoKey ?? '')) {
          // Unchanged final key from the client; leave logo as-is.
        } else {
          throw new BadRequestException('Invalid logoKey');
        }
      }
    }

    let pronunciationAudioToDelete: string | null = null;
    const pronunciationKeyRaw = dto.brandPronunciationAudioKey;
    if (pronunciationKeyRaw !== undefined) {
      if (pronunciationKeyRaw === null || pronunciationKeyRaw === '') {
        data.brandPronunciationAudioKey = null;
        data.brandPronunciationAudioUrl = null;
        if (existing.brandPronunciationAudioKey) {
          pronunciationAudioToDelete = existing.brandPronunciationAudioKey;
        }
      } else {
        const pKey = pronunciationKeyRaw.trim();
        if (this.storage.isTempBrandPronunciationAudioKeyForUser(userId, pKey)) {
          this.assertTempBrandPronunciationAudioKeyOwner(userId, pKey);
          if (
            existing.brandPronunciationAudioKey &&
            existing.brandPronunciationAudioKey !== pKey
          ) {
            pronunciationAudioToDelete = existing.brandPronunciationAudioKey;
          }
          const finalPKey =
            await this.storage.finalizeBrandPronunciationAudioKey({
              tempKey: pKey,
              brandProfileId: existing.id,
              deleteTemp: true,
            });
          data.brandPronunciationAudioKey = finalPKey;
          data.brandPronunciationAudioUrl =
            this.storage.buildCdnUrl(finalPKey);
        } else if (
          pKey === (existing.brandPronunciationAudioKey ?? '')
        ) {
          // unchanged final key
        } else {
          throw new BadRequestException('Invalid brandPronunciationAudioKey');
        }
      }
    }

    const hasScalarUpdates = Object.keys(data).length > 0;
    const hasCategoryUpdates = dto.categories !== undefined;

    if (!hasScalarUpdates && !hasCategoryUpdates) {
      return this.getBrandProfileForCurrentUser(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      if (hasScalarUpdates) {
        await tx.brandProfile.update({
          where: { userId },
          data: data as any,
        });
      }
      if (hasCategoryUpdates) {
        const uniqueCategories = [...new Set(dto.categories ?? [])];
        const includesOther = uniqueCategories.includes(BrandCategory.OTHER);
        const existingOther = existing.otherCategoryLabel ?? null;
        const requestedOther =
          dto.otherCategoryLabel === undefined ? undefined : dto.otherCategoryLabel;

        if (includesOther) {
          const label =
            requestedOther === undefined
              ? (existingOther ?? '')
              : (requestedOther ?? '');
          const trimmed = String(label).trim();
          if (!trimmed) {
            throw new BadRequestException(
              'otherCategoryLabel is required for OTHER category',
            );
          }
          await tx.brandProfile.update({
            where: { userId },
            data: { otherCategoryLabel: trimmed } as any,
          });
        } else {
          // If OTHER is not selected, clear any stored custom label.
          await tx.brandProfile.update({
            where: { userId },
            data: { otherCategoryLabel: null } as any,
          });
        }

        await tx.brandProfileBrandCategory.deleteMany({
          where: { brandProfileId: existing.id },
        });
        if (uniqueCategories.length) {
          await tx.brandProfileBrandCategory.createMany({
            data: uniqueCategories.map((category) => ({
              brandProfileId: existing.id,
              category,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    if (pronunciationAudioToDelete) {
      try {
        await this.storage.deleteObjectIfExists(pronunciationAudioToDelete);
      } catch {
        // non-fatal
      }
    }

    return this.getBrandProfileForCurrentUser(userId);
  }
}
