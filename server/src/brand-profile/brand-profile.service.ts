import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBrandProfileDto } from './dto/create-brand-profile.dto';
import {
  PresignBrandLogoUploadDto,
  PresignUploadResponseDto,
} from './dto/presign-brand-logo-upload.dto';
import { BrandsListResponseDto } from './dto/brands-list-response.dto';
import { BrandProfileResponseDto } from './dto/brand-profile-response.dto';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import { RemoveBrandRoleDto } from './dto/remove-brand-role.dto';

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
          companyName: dto.companyName,
          website: dto.website ?? null,
          industry: dto.industry ?? null,
          contactPerson: dto.contactPerson ?? null,
        },
        select: { id: true },
      });

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
        companyName: user.brandProfile?.companyName ?? null,
        industry: user.brandProfile?.industry ?? null,
        contactPerson: user.brandProfile?.contactPerson ?? null,
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

        const fallbackRoleId = hasCreatorRole ? creatorRole!.id : null;

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
  }

  async getBrandProfileForCurrentUser(
    userId: string,
  ): Promise<BrandProfileResponseDto> {
    const profile = await this.prisma.brandProfile.findUnique({
      where: { userId },
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
