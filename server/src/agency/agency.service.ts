import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  PresignUploadResponseDto,
} from '../brand-profile/dto/presign-brand-logo-upload.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { CreateAgencyAtSignupInput } from './dto/create-agency-at-signup.input';
import type { CreateAgencyProfileDto } from './dto/create-agency-profile.dto';
import type { UpdateAgencyProfileDto } from './dto/update-agency-profile.dto';
import type { AgencyProfileResponseDto } from './dto/agency-profile-response.dto';
import type { PresignAgencyLogoUploadDto } from './dto/presign-agency-logo-upload.dto';
import type { AgenciesListResponseDto } from './dto/agencies-list-response.dto';
import type { ListAgenciesQueryDto } from './dto/list-agencies-query.dto';
import type { AdminAgencyDetailDto } from './dto/admin-agency-detail.dto';
import { AdminBrandWishlistsResponseDto } from '../brand-profile/dto/admin-brand-wishlists.dto';
import {
  AgencyBrandNameConstraintError,
  appendAgencyBrandName,
  MAX_AGENCY_BRAND_NAME_LENGTH,
} from './agency-brand-names.util';

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
  brandNames: string[];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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
      brandNames: agency.brandNames,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    };
  }

  /**
   * Creates agency row + AGENCY role inside an existing transaction (signup only).
   */
  async runCreateAgencyInTransaction(
    tx: any,
    ownerUserId: string,
    input: CreateAgencyAtSignupInput,
  ): Promise<AgencyRow> {
    const existing = await tx.agency.findUnique({
      where: { ownerUserId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Agency profile already exists');
    }

    const contactFullName = input.contactFullName.trim();
    const contactEmail = input.contactEmail.trim().toLowerCase();
    const contactPhone = input.contactPhone?.trim() || null;
    const website = input.website?.trim() || null;

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
        name: input.name.trim(),
        contactFullName,
        contactEmail,
        contactPhone,
        contactPhoneVerified: input.contactPhoneVerified,
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
        brandNames: true,
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

    await tx.user.update({
      where: { id: ownerUserId },
      data: { primaryRoleId: agencyRole.id },
    });

    return created;
  }

  async recordBrandNameFromBrief(
    agencyId: string,
    brandName: string,
    tx?: Pick<PrismaService, 'agency'>,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const agency = await client.agency.findUnique({
      where: { id: agencyId },
      select: { brandNames: true },
    });
    if (!agency) return;

    let next: string[];
    try {
      next = appendAgencyBrandName(agency.brandNames, brandName);
    } catch (error) {
      if (error instanceof AgencyBrandNameConstraintError) {
        throw new BadRequestException(
          `Brand name must be ${MAX_AGENCY_BRAND_NAME_LENGTH} characters or fewer.`,
        );
      }
      throw error;
    }
    if (next.length === agency.brandNames.length) return;

    await client.agency.update({
      where: { id: agencyId },
      data: { brandNames: next },
    });
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

  async createOwnedAgencyProfile(
    ownerUserId: string,
    dto: CreateAgencyProfileDto,
  ): Promise<AgencyProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const contactPhone = dto.contactPhone?.trim() || user.phone || null;
    if (contactPhone) {
      await this.assertContactPhoneAvailable(contactPhone);
    }

    const profile = await this.prisma.$transaction(
      async (tx) => {
        const created = await this.runCreateAgencyInTransaction(
          tx,
          ownerUserId,
          {
            name: dto.name,
            contactFullName:
              user.name?.trim() || user.email.split('@')[0] || 'Agency Owner',
            contactEmail: user.email,
            contactPhone,
            contactPhoneVerified:
              Boolean(user.phoneVerified) && contactPhone === user.phone,
            website: dto.website?.trim() || null,
          },
        );

        const logoKey = dto.logoKey?.trim();
        if (logoKey) {
          if (!this.storage.isTempAgencyLogoKeyForUser(ownerUserId, logoKey)) {
            throw new BadRequestException('Invalid logoKey');
          }
          const finalLogoKey = await this.storage.finalizeAgencyLogoKey({
            tempKey: logoKey,
            agencyId: created.id,
            deleteTemp: true,
          });
          const logoUrl = this.storage.buildCdnUrl(finalLogoKey);
          return tx.agency.update({
            where: { id: created.id },
            data: {
              logoKey: finalLogoKey,
              logoUrl,
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
              brandNames: true,
              createdAt: true,
              updatedAt: true,
            },
          });
        }

        return created;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    return this.mapAgency(profile as AgencyRow);
  }

  async getAgencyProfileForOwner(
    ownerUserId: string,
  ): Promise<AgencyProfileResponseDto> {
    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId },
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
        brandNames: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!agency) {
      throw new NotFoundException('Agency profile not found');
    }
    return this.mapAgency(agency);
  }

  async updateAgencyProfileForOwner(
    ownerUserId: string,
    dto: UpdateAgencyProfileDto,
  ): Promise<AgencyProfileResponseDto> {
    const existing = await this.prisma.agency.findUnique({
      where: { ownerUserId },
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
        brandNames: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Agency profile not found');
    }

    const data: {
      name?: string;
      contactFullName?: string;
      contactPhone?: string | null;
      contactPhoneVerified?: boolean;
      website?: string | null;
      logoKey?: string | null;
      logoUrl?: string | null;
    } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }

    if (dto.contactFullName !== undefined) {
      const contactFullName = dto.contactFullName.trim();
      if (!contactFullName) {
        throw new BadRequestException('contactFullName cannot be empty');
      }
      data.contactFullName = contactFullName;
    }

    if (dto.website !== undefined) {
      const website = dto.website?.trim() || null;
      data.website = website;
    }

    if (dto.contactPhone !== undefined) {
      const contactPhone = dto.contactPhone?.trim() || null;
      if (contactPhone) {
        await this.assertContactPhoneAvailable(contactPhone, existing.id);
      }

      const owner = await this.prisma.user.findUnique({
        where: { id: ownerUserId },
        select: { phone: true, phoneVerified: true },
      });

      data.contactPhone = contactPhone;
      if (!contactPhone) {
        data.contactPhoneVerified = false;
      } else if (contactPhone === existing.contactPhone) {
        data.contactPhoneVerified = existing.contactPhoneVerified;
      } else {
        // Phone OTP updates User.phone first; only accept a changed number when
        // it matches the owner's currently verified account phone.
        const ownerPhone = owner?.phone?.trim() || null;
        const ownerVerified = Boolean(owner?.phoneVerified);
        if (!ownerVerified || ownerPhone !== contactPhone) {
          throw new BadRequestException(
            'Verify your new mobile number with OTP before saving.',
          );
        }
        data.contactPhoneVerified = true;
      }
    }

    if (dto.logoKey !== undefined) {
      if (dto.logoKey === null || dto.logoKey === '') {
        data.logoKey = null;
        data.logoUrl = null;
      } else {
        const logoKey = dto.logoKey.trim();
        if (this.storage.isTempAgencyLogoKeyForUser(ownerUserId, logoKey)) {
          const finalLogoKey = await this.storage.finalizeAgencyLogoKey({
            tempKey: logoKey,
            agencyId: existing.id,
            deleteTemp: true,
          });
          data.logoKey = finalLogoKey;
          data.logoUrl = this.storage.buildCdnUrl(finalLogoKey);
        } else if (logoKey === (existing.logoKey ?? '')) {
          // unchanged
        } else {
          throw new BadRequestException('Invalid logoKey');
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return this.mapAgency(existing);
    }

    const updated = await this.prisma.agency.update({
      where: { id: existing.id },
      data,
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
        brandNames: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapAgency(updated);
  }

  async listAgencies(
    query: ListAgenciesQueryDto,
  ): Promise<AgenciesListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const search = query.search?.trim() || '';
    const like = search
      ? ({ contains: search, mode: 'insensitive' as const })
      : null;

    const where = like
      ? {
          OR: [
            { name: like },
            { contactFullName: like },
            { contactPhone: like },
            { contactEmail: like },
            { brandNames: { has: search } },
            { owner: { is: { email: like } } },
            { owner: { is: { name: like } } },
          ],
        }
      : {};

    const [total, agencies] = await this.prisma.$transaction([
      this.prisma.agency.count({ where }),
      this.prisma.agency.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ownerUserId: true,
          name: true,
          contactFullName: true,
          contactPhone: true,
          logoUrl: true,
          brandNames: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items: agencies.map((agency) => ({
        agencyId: agency.id,
        ownerUserId: agency.ownerUserId,
        email: agency.owner.email,
        ownerName: agency.owner.name ?? null,
        agencyName: agency.name,
        contactFullName: agency.contactFullName,
        contactPhone: agency.contactPhone ?? null,
        logoUrl: agency.logoUrl ?? null,
        status: agency.owner.status,
        brandNames: agency.brandNames,
        brandCount: agency.brandNames.length,
        createdAt: agency.createdAt,
        updatedAt: agency.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getAgencyForAdmin(agencyId: string): Promise<AdminAgencyDetailDto> {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        ownerUserId: true,
        name: true,
        contactFullName: true,
        contactEmail: true,
        contactPhone: true,
        website: true,
        logoUrl: true,
        brandNames: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            email: true,
            name: true,
            status: true,
            statusChangedAt: true,
            statusChangedBy: { select: { email: true, name: true } },
          },
        },
      },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    return {
      agencyId: agency.id,
      ownerUserId: agency.ownerUserId,
      email: agency.owner.email,
      ownerName: agency.owner.name ?? null,
      agencyName: agency.name,
      contactFullName: agency.contactFullName,
      contactEmail: agency.contactEmail,
      contactPhone: agency.contactPhone ?? null,
      website: agency.website ?? null,
      logoUrl: agency.logoUrl ?? null,
      status: agency.owner.status,
      statusChangedAt: agency.owner.statusChangedAt ?? null,
      statusChangedByName: agency.owner.statusChangedBy?.name ?? null,
      statusChangedByEmail: agency.owner.statusChangedBy?.email ?? null,
      brandNames: agency.brandNames,
      brandCount: agency.brandNames.length,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    };
  }

  async listAgencyWishlistsForAdmin(
    agencyId: string,
  ): Promise<AdminBrandWishlistsResponseDto> {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true },
    });
    if (!agency) throw new NotFoundException('Agency not found');

    const rows = await this.prisma.brandWishlist.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { creators: true } },
        creators: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            creator: {
              select: {
                id: true,
                displayName: true,
                profileImageUrl: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return {
      items: rows.map((w) => ({
        id: w.id,
        name: w.name,
        creatorCount: w._count.creators,
        shareEnabled: w.shareEnabled,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        creators: w.creators.map((wc) => ({
          id: wc.creator.id,
          displayName: wc.creator.displayName ?? null,
          profileImageUrl: wc.creator.profileImageUrl ?? null,
          city: wc.creator.city ?? null,
        })),
      })),
    };
  }
}
