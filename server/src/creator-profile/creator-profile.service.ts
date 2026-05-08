import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  CreatorFacetDimension,
  CreatorLanguageFluency,
  PortfolioVisibilityStatus,
  Prisma,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { StorageService } from '../storage/storage.service';
import { PresignProfileImageUploadDto } from './dto/presign-profile-image-upload.dto';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import { CreatorsListResponseDto } from './dto/creators-list-response.dto';
import type { CreatorsPublicListResponseDto } from './dto/creators-public-list-response.dto';
import type {
  CreatorPublicListItemDto,
  CreatorPublicListPortfolioVideoDto,
} from './dto/creator-public-list-item.dto';
import { CreatorSuggestionItemDto } from './dto/creator-suggestion-item.dto';
import { AddCreatorAddOnsDto } from './dto/add-creator-addons.dto';
import {
  buildCreatorListRelationsInclude,
  buildListCreatorsWhere,
} from './creator-list-filters.util';
import { computeAgeGroup, computeAgeYears } from './creator-age.util';
import { CreatorFacetOptionsResponseDto } from './dto/creator-facet-options-response.dto';
import { CreatorAddOnOptionsResponseDto } from './dto/creator-addon-options-response.dto';

const creatorProfileWithRelationsInclude = {
  user: { select: { phone: true, phoneVerified: true } },
  facetSelections: { include: { option: true } },
  profileLanguages: { include: { option: true } },
  categories: true,
  personaTags: true,
  restrictions: true,
  packages: true,
  addOns: true,
  creatorApproval: true,
  portfolioVideos: {
    where: { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
      industryLabel: true,
      tags: { select: { tag: true } },
      createdAt: true,
    },
  },
} as const;

/**
 * NOTE: We intentionally keep this payload type loose because the workspace
 * TypeScript server can lag behind Prisma client generation in monorepos.
 * Runtime shape is guaranteed by `creatorProfileWithRelationsInclude`.
 */
type CreatorProfileWithRelations = any;

type CreatorProfileMapped = any;

function mapJsonDeliverables(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Client passed to interactive `$transaction` callbacks */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class CreatorProfileService {
  private readonly logger = new Logger(CreatorProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorPackageService: CreatorPackageService,
    private readonly storage: StorageService,
  ) {}

  async presignProfileImageUpload(
    userId: string,
    dto: PresignProfileImageUploadDto,
  ) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const key = this.storage.buildObjectKey({
      kind: 'creator_profile_image',
      userId,
      creatorProfileId: profile?.id,
      contentType: dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  private assertProfileImageKeyOwner(
    creatorProfileId: string,
    key: string,
  ): void {
    const prefix = `creator-profile/${creatorProfileId}/`;
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('Invalid profileImageKey');
    }
  }

  private assertTempProfileImageKeyOwner(userId: string, key: string): void {
    if (!this.storage.isTempCreatorProfileImageKeyForUser(userId, key)) {
      throw new BadRequestException('Invalid profileImageKey');
    }
  }

  private mapCreatorProfile(
    profile: CreatorProfileWithRelations,
  ): CreatorProfileMapped {
    const packages = profile.packages ?? [];
    return {
      ...profile,
      packages: packages.map(
        ({
          deliverables,
          priceAmount,
          ...rest
        }): CreatorProfileMapped['packages'][number] => ({
          ...rest,
          deliverables: mapJsonDeliverables(deliverables),
          priceAmount:
            typeof priceAmount?.toString === 'function'
              ? priceAmount.toString()
              : String(priceAmount),
        }),
      ),
    };
  }

  private mapCreatorProfileResponseDto(
    profile: CreatorProfileWithRelations,
  ): CreatorProfileResponseDto {
    const mapped = this.mapCreatorProfile(profile);
    const first = (mapped.portfolioVideos ?? [])[0] ?? null;
    const firstPortfolioVideo = first
      ? {
          ...first,
          tags: (first.tags ?? []).map((t: any) => t.tag).filter(Boolean),
        }
      : null;

    const dob: Date | null = mapped.dateOfBirth
      ? new Date(mapped.dateOfBirth)
      : null;
    const age =
      dob && !Number.isNaN(dob.getTime()) ? computeAgeYears(dob) : null;
    const ageGroup =
      dob && !Number.isNaN(dob.getTime()) ? computeAgeGroup(dob) : null;
    const dobStr =
      dob && !Number.isNaN(dob.getTime())
        ? dob.toISOString().slice(0, 10)
        : null;

    return {
      id: mapped.id,
      userId: mapped.userId,
      displayName: mapped.displayName,
      phone: mapped.user?.phone ?? null,
      phoneVerified: mapped.user?.phoneVerified ?? false,
      profileImageUrl: mapped.profileImageUrl ?? null,
      countryName: mapped.countryName ?? null,
      stateName: mapped.stateName ?? null,
      city: mapped.city ?? null,
      bio: mapped.bio ?? null,
      gender: mapped.gender ?? null,
      dateOfBirth: dobStr,
      age,
      ageGroup,
      shippingAddress: mapped.shippingAddress ?? null,
      instagramUrl: mapped.instagramUrl ?? null,
      contentVolume: mapped.contentVolume ?? null,
      collaborationCount: mapped.collaborationCount ?? 0,
      travelRadius: mapped.travelRadius ?? null,
      onLocationAvailable: mapped.onLocationAvailable,
      approvalStatus: mapped.creatorApproval?.status,
      rejectionReason: mapped.creatorApproval?.rejectionReason ?? null,
      profileLanguages: (mapped.profileLanguages ?? []).map((row: any) => ({
        id: row.id,
        slug: row.option?.slug ?? '',
        label: row.option?.label ?? '',
        fluency: row.fluency,
      })),
      facetSelections: (mapped.facetSelections ?? []).map((row: any) => ({
        id: row.id,
        dimension: row.option?.dimension,
        slug: row.option?.slug ?? '',
        label: row.option?.label ?? '',
      })),
      categories: (mapped.categories ?? []).map((c) => ({
        id: c.id,
        category: c.category,
      })),
      personaTags: (mapped.personaTags ?? []).map((t) => ({
        id: t.id,
        tag: t.tag,
      })),
      restrictions: (mapped.restrictions ?? []).map((r) => ({
        id: r.id,
        restriction: r.restriction,
      })),
      packages: (mapped.packages ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        deliverables: p.deliverables,
        videoLengthSeconds: (p as any).videoLengthSeconds ?? 60,
        priceAmount: p.priceAmount,
        deliveryDays: p.deliveryDays,
        maxRevisions: p.maxRevisions ?? 1,
      })),
      addOns: (mapped.addOns ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        priceAmount:
          a.priceAmount && typeof a.priceAmount.toString === 'function'
            ? a.priceAmount.toString()
            : a.priceAmount
              ? String(a.priceAmount)
              : '0',
        description: a.description ?? null,
      })),
      firstPortfolioVideo,
    };
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    return this.isAdmin(
      userId,
      this.prisma as unknown as PrismaTransactionClient,
    );
  }

  /** Strip direct contact fields from brands and other non-admin viewers (keys omitted from JSON). */
  private redactCreatorContactForViewer(
    dto: CreatorProfileResponseDto,
  ): CreatorProfileResponseDto {
    const {
      phone: _phone,
      phoneVerified: _phoneVerified,
      instagramUrl: _instagramUrl,
      ...rest
    } = dto;
    return rest as CreatorProfileResponseDto;
  }

  private async normalizeCreatorAddOns(
    tx: PrismaTransactionClient,
    addOns: { slug: string; priceAmount: string; description?: string }[],
  ): Promise<
    { name: string; priceAmount: Prisma.Decimal; description: string | null }[]
  > {
    const options = (await (tx as any).creatorAddOnOption.findMany({
      select: {
        slug: true,
        name: true,
        fixedPrice: true,
        minPrice: true,
        stepPrice: true,
      },
    })) as Array<{
      slug: string;
      name: string;
      fixedPrice: number | null;
      minPrice: number | null;
      stepPrice: number | null;
    }>;
    const bySlug = new Map<string, (typeof options)[number]>(
      options.map((o) => [o.slug, o]),
    );

    return addOns.map((a) => {
      const slug = String(a.slug ?? '').trim();
      const rule = bySlug.get(slug);
      if (rule == null) {
        throw new BadRequestException('Invalid add-on.');
      }

      const n = Number(a.priceAmount);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        throw new BadRequestException('Add-on priceAmount must be a whole number.');
      }

      if (rule.fixedPrice != null) {
        if (n !== rule.fixedPrice) {
          throw new BadRequestException(
            `"${rule.name}" price must be exactly ${rule.fixedPrice}.`,
          );
        }
      } else {
        const min = rule.minPrice ?? 0;
        const step = rule.stepPrice ?? 1;
        if (n < min || n % step !== 0) {
          throw new BadRequestException(
            `"${rule.name}" price must be >= ${min} and in steps of ${step}.`,
          );
        }
      }

      return {
        name: rule.name,
        priceAmount: new Prisma.Decimal(String(n)),
        description: a.description ?? null,
      };
    });
  }

  private async isAdmin(
    userId: string,
    tx: PrismaTransactionClient,
  ): Promise<boolean> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return (
      user.userRoles?.some((ur) => ur.role?.name === RoleName.ADMIN) ?? false
    );
  }

  private normalizeUniqueStrings(values: string[] | undefined): string[] {
    if (!values?.length) return [];
    return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  }

  private async assertPhoneVerifiedForCreator(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneVerified: true, phone: true },
    });
    if (!u?.phoneVerified || !u?.phone?.trim()) {
      throw new BadRequestException(
        'Verify your mobile number before managing a creator profile.',
      );
    }
  }

  private async syncUserDisplayName(
    tx: PrismaTransactionClient,
    userId: string,
    displayName: string,
  ): Promise<void> {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    await tx.user.update({
      where: { id: userId },
      data: { name: trimmed },
    });
  }

  /**
   * Persists phone on User. If the E.164 value differs from the stored number,
   * clears verification and OTP attempt metadata so the new number must be verified.
   */
  private async syncUserPhoneIfChanged(
    tx: PrismaTransactionClient,
    userId: string,
    phone: string,
  ): Promise<void> {
    const trimmed = phone.trim();
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const prev = current?.phone?.trim() ?? '';
    if (prev === trimmed) {
      return;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        phone: trimmed,
        phoneVerified: false,
        phoneOtpFailedAttempts: 0,
        phoneOtpLastAttemptAt: null,
        phoneOtpLastStatus: null,
        phoneOtpLastPhone: null,
      },
    });
  }

  private async resolveFacetOptionIds(
    tx: PrismaTransactionClient,
    selections: { dimension: CreatorFacetDimension; slug: string }[],
  ): Promise<string[]> {
    if (!selections.length) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const s of selections) {
      if (s.dimension === CreatorFacetDimension.LANGUAGE) {
        throw new BadRequestException(
          'Use profileLanguages for LANGUAGE options, not facetSelections.',
        );
      }
      const key = `${s.dimension}:${s.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const opt = await tx.creatorFacetOption.findUnique({
        where: {
          dimension_slug: { dimension: s.dimension, slug: s.slug },
        },
      });
      if (!opt) {
        throw new BadRequestException(
          `Unknown facet option ${s.dimension} / ${s.slug}`,
        );
      }
      ids.push(opt.id);
    }
    return ids;
  }

  private async resolveLanguageRows(
    tx: PrismaTransactionClient,
    inputs: { slug: string; fluency: CreatorLanguageFluency }[],
  ): Promise<{ optionId: string; fluency: CreatorLanguageFluency }[]> {
    const out: { optionId: string; fluency: CreatorLanguageFluency }[] = [];
    const seen = new Set<string>();
    for (const row of inputs) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      const opt = await tx.creatorFacetOption.findUnique({
        where: {
          dimension_slug: {
            dimension: CreatorFacetDimension.LANGUAGE,
            slug: row.slug,
          },
        },
      });
      if (!opt) {
        throw new BadRequestException(`Unknown language slug: ${row.slug}`);
      }
      out.push({ optionId: opt.id, fluency: row.fluency });
    }
    return out;
  }

  private async replaceFacetSelections(
    tx: PrismaTransactionClient,
    creatorProfileId: string,
    optionIds: string[],
  ): Promise<void> {
    await tx.creatorProfileFacetSelection.deleteMany({
      where: { creatorProfileId },
    });
    if (optionIds.length === 0) return;
    await tx.creatorProfileFacetSelection.createMany({
      data: optionIds.map((optionId) => ({
        creatorProfileId,
        optionId,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceProfileLanguages(
    tx: PrismaTransactionClient,
    creatorProfileId: string,
    rows: { optionId: string; fluency: CreatorLanguageFluency }[],
  ): Promise<void> {
    await tx.creatorProfileLanguage.deleteMany({
      where: { creatorProfileId },
    });
    if (rows.length === 0) return;
    await tx.creatorProfileLanguage.createMany({
      data: rows.map((r) => ({
        creatorProfileId,
        optionId: r.optionId,
        fluency: r.fluency,
      })),
      skipDuplicates: true,
    });
  }

  async listFacetOptions(): Promise<CreatorFacetOptionsResponseDto> {
    const options = await this.prisma.creatorFacetOption.findMany({
      orderBy: [{ dimension: 'asc' }, { sortOrder: 'asc' }],
    });
    const optionsByDimension = options.reduce(
      (acc, o) => {
        (acc[o.dimension] ??= []).push({
          slug: o.slug,
          label: o.label,
          sortOrder: o.sortOrder,
        });
        return acc;
      },
      {} as CreatorFacetOptionsResponseDto['optionsByDimension'],
    );

    return { optionsByDimension };
  }

  async listAddOnOptions(): Promise<CreatorAddOnOptionsResponseDto> {
    const options = await (this.prisma as any).creatorAddOnOption.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        slug: true,
        name: true,
        sortOrder: true,
        fixedPrice: true,
        minPrice: true,
        stepPrice: true,
      },
    });
    return { options };
  }

  async createCreatorProfile(
    userId: string,
    dto: CreateCreatorProfileDto,
  ): Promise<CreatorProfileResponseDto> {
    await this.assertPhoneVerifiedForCreator(userId);

    const profileImageKey = dto.profileImageKey?.trim();
    if (profileImageKey) {
      this.assertTempProfileImageKeyOwner(userId, profileImageKey);
    }

    const facetInputs = dto.facetSelections ?? [];
    const langInputs = dto.profileLanguages ?? [];

    const creatorProfileId = await this.prisma.$transaction(
      async (tx) => {
        const creatorRole = await tx.role.findUnique({
          where: { name: RoleName.CREATOR },
          select: { id: true },
        });
        if (!creatorRole) {
          throw new NotFoundException('CREATOR role not configured');
        }

        const currentUser: any = await tx.user.findUnique({
          where: { id: userId },
          select: {
            primaryRoleId: true,
          } as any,
        });
        if (!currentUser) {
          throw new NotFoundException('User not found');
        }

        const existing = await tx.creatorProfile.findUnique({
          where: { userId },
        });
        if (existing) {
          throw new ConflictException('Creator profile already exists');
        }

        await this.syncUserDisplayName(tx, userId, dto.displayName);

        const dateOfBirth = dto.dateOfBirth
          ? new Date(dto.dateOfBirth)
          : undefined;
        const facetIds = await this.resolveFacetOptionIds(tx, facetInputs);
        const langRows = await this.resolveLanguageRows(tx, langInputs);

        const creatorProfile = await tx.creatorProfile.create({
          data: {
            userId,
            displayName: dto.displayName.trim(),
            city: dto.city?.trim() || null,
            countryName: dto.countryName?.trim() || null,
            stateName: dto.stateName?.trim() || null,
            bio: dto.bio?.trim() || null,
            gender: dto.gender ?? null,
            dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
              ? dateOfBirth
              : null,
            shippingAddress: dto.shippingAddress?.trim() || null,
            instagramUrl: dto.instagramUrl?.trim() || null,
            contentVolume: dto.contentVolume ?? null,
            collaborationCount: dto.collaborationCount ?? 0,
            travelRadius: dto.travelRadius ?? null,
            onLocationAvailable: dto.onLocationAvailable ?? false,
            creatorApproval: {
              create: {},
            },
          },
        });

        await this.replaceFacetSelections(tx, creatorProfile.id, facetIds);
        await this.replaceProfileLanguages(tx, creatorProfile.id, langRows);

        const ops: Array<Promise<unknown>> = [];

        ops.push(
          tx.userRole.upsert({
            where: { userId_roleId: { userId, roleId: creatorRole.id } },
            create: { userId, roleId: creatorRole.id },
            update: {},
          }),
        );

        if (!currentUser.primaryRoleId) {
          ops.push(
            tx.user.update({
              where: { id: userId },
              data: { primaryRoleId: creatorRole.id } as any,
            }),
          );
        }

        if (dto.packages?.length) {
          ops.push(
            this.creatorPackageService.createPackages(
              tx,
              creatorProfile.id,
              dto.packages,
            ),
          );
        }

        if (dto.addOns?.length) {
          ops.push(
            (async () => {
              const normalizedAddOns = await this.normalizeCreatorAddOns(
                tx,
                dto.addOns as any,
              );
              await tx.creatorAddOn.createMany({
                data: normalizedAddOns.map((addOn) => ({
                  creatorId: creatorProfile.id,
                  name: addOn.name,
                  priceAmount: addOn.priceAmount,
                  description: addOn.description,
                })),
              });
            })(),
          );
        }

        await Promise.all(ops);

        return creatorProfile.id;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    if (profileImageKey) {
      const finalProfileImageKey =
        await this.storage.finalizeCreatorProfileImageKey({
          tempKey: profileImageKey,
          creatorProfileId,
          deleteTemp: true,
        });
      await this.prisma.creatorProfile.update({
        where: { id: creatorProfileId },
        data: {
          profileImageKey: finalProfileImageKey,
          profileImageUrl: this.storage.buildCdnUrl(finalProfileImageKey),
        },
      });
    }

    // Fetch after commit to keep the transaction fast and avoid interactive tx timeouts.
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });

    if (!profile) {
      throw new Error('Creator profile creation failed');
    }

    return this.mapCreatorProfileResponseDto(profile);
  }

  async listCreators(
    query: ListCreatorsQueryDto,
  ): Promise<CreatorsPublicListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = buildListCreatorsWhere(query, { requireApproved: true });
    const include = buildCreatorListRelationsInclude(query);

    if (process.env.DEBUG_CREATORS_LIST === '1') {
      this.logger.debug(
        `listCreators query=${JSON.stringify(query)} where=${JSON.stringify(where)}`,
      );
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: include as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapCreatorPublicListItemDto(p)),
      total,
      page,
      limit,
    };
  }

  private mapCreatorPublicListItemDto(
    profile: any,
  ): CreatorPublicListItemDto {
    const portfolioVideos: CreatorPublicListPortfolioVideoDto[] = Array.isArray(
      profile.portfolioVideos,
    )
      ? profile.portfolioVideos.map((v: any) => ({
          id: v.id,
          creatorId: v.creatorId,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl ?? null,
          industryLabel: v.industryLabel ?? null,
          tags: Array.isArray(v.tags)
            ? v.tags
                .map((t: any) => t?.tag)
                .filter((x: unknown): x is string => typeof x === 'string')
            : [],
          createdAt: v.createdAt,
        }))
      : [];

    const dob: Date | null = profile.dateOfBirth
      ? new Date(profile.dateOfBirth)
      : null;
    const age =
      dob && !Number.isNaN(dob.getTime()) ? computeAgeYears(dob) : null;

    const profileLanguages = Array.isArray(profile.profileLanguages)
      ? profile.profileLanguages
          .map((row: any) => ({
            slug: String(row?.option?.slug ?? ''),
            label: String(row?.option?.label ?? ''),
            fluency: row.fluency,
          }))
          .filter((x: any) => x.slug)
      : [];

    const facetSelections = Array.isArray(profile.facetSelections)
      ? profile.facetSelections
          .map((row: any) => ({
            dimension: row?.option?.dimension,
            slug: String(row?.option?.slug ?? ''),
            label: String(row?.option?.label ?? ''),
          }))
          .filter((x: any) => x.slug && x.dimension)
      : [];

    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.displayName,
      profileImageUrl: profile.profileImageUrl ?? null,
      city: profile.city ?? null,
      countryName: profile.countryName ?? null,
      stateName: profile.stateName ?? null,
      bio: profile.bio ?? null,
      gender: profile.gender ?? null,
      age,
      contentVolume: profile.contentVolume ?? null,
      collaborationCount: profile.collaborationCount ?? 0,
      onLocationAvailable: !!profile.onLocationAvailable,
      languages: profileLanguages.map((l) => l.label),
      profileLanguages,
      facetSelections,
      categories: Array.isArray(profile.categories)
        ? profile.categories
            .map((c: any) => c?.category)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      personaTags: Array.isArray(profile.personaTags)
        ? profile.personaTags
            .map((t: any) => t?.tag)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      restrictions: Array.isArray(profile.restrictions)
        ? profile.restrictions
            .map((r: any) => r?.restriction)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      packages: Array.isArray(profile.packages)
        ? profile.packages.map((pkg: any) => ({
            name: String(pkg?.name ?? ''),
            priceAmount:
              pkg?.priceAmount?.toString?.() ??
              (typeof pkg?.priceAmount === 'string' ? pkg.priceAmount : ''),
          }))
        : [],
      portfolioVideos,
    };
  }

  async getCreatorById(
    viewerUserId: string,
    id: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id },
      include: creatorProfileWithRelationsInclude as any,
    });

    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    const approval = (
      profile as typeof profile & {
        creatorApproval?: { status: ApprovalStatus } | null;
      }
    ).creatorApproval;
    const status = approval?.status;
    const isApproved = status === ApprovalStatus.APPROVED;
    const isOwner = profile.userId === viewerUserId;
    const admin = await this.isAdminUser(viewerUserId);

    if (!isApproved && !isOwner && !admin) {
      throw new NotFoundException('Creator not found');
    }

    const dto = this.mapCreatorProfileResponseDto(profile);
    if (isOwner || admin) {
      return dto;
    }
    return this.redactCreatorContactForViewer(dto);
  }

  async listPendingCreatorApprovals(query: {
    page?: number;
    limit?: number;
  }): Promise<CreatorsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.CreatorProfileWhereInput = {
      creatorApproval: { status: ApprovalStatus.PENDING },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'asc' },
        include: creatorProfileWithRelationsInclude as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapCreatorProfileResponseDto(p)),
      total,
      page,
      limit,
    };
  }

  async approveCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    await this.prisma.creatorApproval.upsert({
      where: { creatorId: creatorProfileId },
      create: {
        creatorId: creatorProfileId,
        status: ApprovalStatus.APPROVED,
        approvedById: adminUserId,
        approvedAt: new Date(),
      },
      update: {
        status: ApprovalStatus.APPROVED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }
    return this.mapCreatorProfileResponseDto(updated);
  }

  async rejectCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
    rejectionReason?: string | null,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    await this.prisma.creatorApproval.upsert({
      where: { creatorId: creatorProfileId },
      create: {
        creatorId: creatorProfileId,
        status: ApprovalStatus.REJECTED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
      update: {
        status: ApprovalStatus.REJECTED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }
    return this.mapCreatorProfileResponseDto(updated);
  }

  async getCreatorProfileForCurrentUser(
    userId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      include: creatorProfileWithRelationsInclude as any,
    });

    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    return this.mapCreatorProfileResponseDto(profile);
  }

  async updateCreatorProfile(
    actingUserId: string,
    creatorProfileId: string,
    dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfileResponseDto> {
    const profileForGate = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { userId: true },
    });
    if (profileForGate?.userId === actingUserId) {
      await this.assertPhoneVerifiedForCreator(actingUserId);
    }

    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });

        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to update this creator profile',
          );
        }

        if (dto.displayName !== undefined) {
          await this.syncUserDisplayName(tx, profile.userId, dto.displayName);
        }

        if (dto.phone !== undefined) {
          await this.syncUserPhoneIfChanged(tx, profile.userId, dto.phone);
        }

        let nextProfileImageKey: string | null | undefined = undefined;
        let nextProfileImageUrl: string | null | undefined = undefined;
        if (dto.profileImageKey !== undefined) {
          const trimmed = dto.profileImageKey?.trim();
          if (trimmed) {
            this.assertProfileImageKeyOwner(creatorProfileId, trimmed);
            nextProfileImageKey = trimmed;
            nextProfileImageUrl = this.storage.buildCdnUrl(trimmed);
          } else {
            nextProfileImageKey = null;
            nextProfileImageUrl = null;
          }
        }

        const data: Prisma.CreatorProfileUpdateInput = {};
        if (dto.displayName !== undefined) {
          data.displayName = dto.displayName.trim();
        }
        if (dto.city !== undefined) {
          data.city = dto.city?.trim() || null;
        }
        if (dto.countryName !== undefined) {
          data.countryName = dto.countryName?.trim() || null;
        }
        if (dto.stateName !== undefined) {
          data.stateName = dto.stateName?.trim() || null;
        }
        if (dto.bio !== undefined) {
          data.bio = dto.bio?.trim() || null;
        }
        if (dto.gender !== undefined) {
          data.gender = dto.gender;
        }
        if (dto.dateOfBirth !== undefined) {
          if (!dto.dateOfBirth) {
            data.dateOfBirth = null;
          } else {
            const d = new Date(dto.dateOfBirth);
            data.dateOfBirth = Number.isNaN(d.getTime()) ? null : d;
          }
        }
        if (dto.shippingAddress !== undefined) {
          data.shippingAddress = dto.shippingAddress?.trim() || null;
        }
        if (dto.instagramUrl !== undefined) {
          data.instagramUrl = dto.instagramUrl?.trim() || null;
        }
        if (dto.contentVolume !== undefined) {
          data.contentVolume = dto.contentVolume;
        }
        if (dto.collaborationCount !== undefined) {
          data.collaborationCount = dto.collaborationCount;
        }
        if (dto.travelRadius !== undefined) {
          data.travelRadius = dto.travelRadius;
        }
        if (dto.onLocationAvailable !== undefined) {
          data.onLocationAvailable = dto.onLocationAvailable;
        }
        if (nextProfileImageKey !== undefined) {
          data.profileImageKey = nextProfileImageKey;
          data.profileImageUrl = nextProfileImageUrl;
        }

        if (Object.keys(data).length > 0) {
          await tx.creatorProfile.update({
            where: { id: creatorProfileId },
            data,
          });
        }

        if (dto.facetSelections !== undefined) {
          const facetIds = await this.resolveFacetOptionIds(
            tx,
            dto.facetSelections,
          );
          await this.replaceFacetSelections(
            tx,
            creatorProfileId,
            facetIds,
          );
        }

        if (dto.profileLanguages !== undefined) {
          const langRows = await this.resolveLanguageRows(
            tx,
            dto.profileLanguages,
          );
          await this.replaceProfileLanguages(
            tx,
            creatorProfileId,
            langRows,
          );
        }

        if (dto.categories) {
          const normalized = this.normalizeUniqueStrings(dto.categories);
          await (tx as any).creatorCategory.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await (tx as any).creatorCategory.createMany({
              data: normalized.map((category) => ({
                creatorId: creatorProfileId,
                category,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.personaTags) {
          const normalized = this.normalizeUniqueStrings(dto.personaTags);
          await (tx as any).creatorPersonaTag.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await (tx as any).creatorPersonaTag.createMany({
              data: normalized.map((tag) => ({
                creatorId: creatorProfileId,
                tag,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.restrictions) {
          const normalized = this.normalizeUniqueStrings(dto.restrictions);
          await (tx as any).creatorRestriction.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await (tx as any).creatorRestriction.createMany({
              data: normalized.map((restriction) => ({
                creatorId: creatorProfileId,
                restriction,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.packages) {
          await tx.creatorPackage.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          await this.creatorPackageService.createPackages(
            tx,
            creatorProfileId,
            dto.packages,
          );
        }

        if (dto.addOns !== undefined) {
          await tx.creatorAddOn.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (dto.addOns.length > 0) {
            const normalizedAddOns = await this.normalizeCreatorAddOns(
              tx,
              dto.addOns as any,
            );
            await tx.creatorAddOn.createMany({
              data: normalizedAddOns.map((addOn) => ({
                creatorId: creatorProfileId,
                name: addOn.name,
                priceAmount: addOn.priceAmount,
                description: addOn.description,
              })),
            });
          }
        }

        const updated = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: creatorProfileWithRelationsInclude as any,
        });

        if (!updated) {
          throw new Error('Creator profile update failed');
        }

        return this.mapCreatorProfileResponseDto(updated);
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async addOrUpdateAddOns(
    actingUserId: string,
    creatorProfileId: string,
    dto: AddCreatorAddOnsDto,
  ): Promise<CreatorProfileResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });

        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to update this creator profile',
          );
        }

        const payload = dto.addOns ?? [];
        if (payload.length > 0) {
          const slugs = Array.from(
            new Set(
              payload
                .map((a: any) => String(a.slug ?? '').trim())
                .filter((slug) => slug.length > 0),
            ),
          );

          if (slugs.length > 0) {
            // For slug-based update we replace all current add-ons in one go to avoid
            // name-matching issues and keep logic simple.
            await (tx as any).creatorAddOn.deleteMany({
              where: { creatorId: creatorProfileId },
            });

            const normalizedAddOns = await this.normalizeCreatorAddOns(
              tx,
              payload as any,
            );
            await (tx as any).creatorAddOn.createMany({
              data: normalizedAddOns.map((addOn) => ({
                creatorId: creatorProfileId,
                name: addOn.name,
                priceAmount: addOn.priceAmount,
                description: addOn.description,
              })),
            });
          }
        }

        const updated = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: creatorProfileWithRelationsInclude as any,
        });

        if (!updated) {
          throw new Error('Creator profile update failed');
        }

        return this.mapCreatorProfileResponseDto(updated);
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async deleteCreatorProfile(actingUserId: string, creatorProfileId: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });
        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to delete this creator profile',
          );
        }

        await tx.creatorProfile.delete({ where: { id: creatorProfileId } });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async listCategorySuggestions(): Promise<CreatorSuggestionItemDto[]> {
    const suggestions = (await (
      this.prisma as any
    ).creatorCategorySuggestion.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })) as CreatorSuggestionItemDto[];

    return suggestions;
  }

  async listPersonaTagSuggestions(): Promise<CreatorSuggestionItemDto[]> {
    const suggestions = (await (
      this.prisma as any
    ).creatorPersonaTagSuggestion.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })) as CreatorSuggestionItemDto[];

    return suggestions;
  }

  async listRestrictionSuggestions(): Promise<CreatorSuggestionItemDto[]> {
    const suggestions = (await (
      this.prisma as any
    ).creatorRestrictionSuggestion.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })) as CreatorSuggestionItemDto[];

    return suggestions;
  }
}
