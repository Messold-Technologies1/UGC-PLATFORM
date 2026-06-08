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
  OrderStatus,
  PortfolioVisibilityStatus,
  Prisma,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCreatorProfileAtSignupInput } from './dto/create-creator-profile-at-signup.input';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { StorageService } from '../storage/storage.service';
import { PresignProfileIntroVideoUploadDto } from './dto/presign-profile-intro-video-upload.dto';
import { CreatorProfileMailNotifier } from '../mail/creator-profile-mail.notifier';
import { CreatorReviewsService } from '../creator-reviews/creator-reviews.service';
import type { CreatorTopReviewDto } from '../creator-reviews/dto/creator-top-review.dto';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import { CreatorsListResponseDto } from './dto/creators-list-response.dto';
import { PendingCreatorApprovalListItemDto } from './dto/pending-creator-approval-list-item.dto';
import { PendingCreatorsListResponseDto } from './dto/pending-creators-list-response.dto';
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
import { CreatorLanguageOptionsResponseDto } from './dto/creator-language-options-response.dto';
import { CreatorAddOnOptionsResponseDto } from './dto/creator-addon-options-response.dto';
import type {
  SuggestedCreatorListItemDto,
  SuggestedCreatorsResponseDto,
} from './dto/suggested-creators-response.dto';

/** Orders counted as successfully completed for creator stats. */
const CREATOR_COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED
];

const creatorProfileWithRelationsInclude = {
  user: { select: { phone: true, phoneVerified: true } },
  facetSelections: { include: { option: true } },
  profileLanguages: { include: { option: true } },
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
  stats: { select: { avgRating: true, reviewCount: true } },
} as const;

/** Lighter include for admin pending-approval queue (signup fields only). */
const pendingCreatorApprovalInclude = {
  user: { select: { phone: true, phoneVerified: true } },
  facetSelections: { include: { option: true } },
  creatorApproval: true,
  portfolioVideos: {
    where: { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
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
    private readonly creatorProfileMail: CreatorProfileMailNotifier,
    private readonly creatorReviews: CreatorReviewsService,
  ) {}

  async presignProfileIntroVideoUpload(
    actingUserId: string,
    dto: PresignProfileIntroVideoUploadDto,
  ) {
    const explicitId = dto.creatorProfileId?.trim();

    let creatorProfileId: string;

    if (explicitId) {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { id: explicitId },
        select: { userId: true },
      });
      if (!profile) {
        throw new NotFoundException('Creator profile not found');
      }
      const ownsProfile = profile.userId === actingUserId;
      const isAdmin = await this.isAdminUser(actingUserId);
      if (!ownsProfile && !isAdmin) {
        throw new ForbiddenException(
          'Not allowed to upload an intro video for this creator profile.',
        );
      }
      creatorProfileId = explicitId;
    } else {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { userId: actingUserId },
        select: { id: true },
      });
      if (!profile?.id) {
        throw new BadRequestException(
          'Creator profile not found. Pass creatorProfileId when uploading on behalf of another creator (e.g. as admin), or finish profile setup first.',
        );
      }
      creatorProfileId = profile.id;
    }

    const key = this.storage.buildObjectKey({
      kind: 'creator_intro_video',
      userId: actingUserId,
      creatorProfileId,
      contentType: dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  private assertIntroVideoKeyOwner(creatorProfileId: string, key: string): void {
    const prefix = `creator-profile/${creatorProfileId}/intro/`;
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('Invalid introVideoKey');
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
    orderCounts?: { totalOrders: number; completedOrders: number },
    topReviews: CreatorTopReviewDto[] = [],
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
      introVideoUrl: mapped.introVideoUrl ?? null,
      countryName: mapped.countryName ?? null,
      stateName: mapped.stateName ?? null,
      city: mapped.city ?? null,
      bio: mapped.bio ?? null,
      gender: mapped.gender ?? null,
      dateOfBirth: dobStr,
      age,
      ageGroup,
      shippingAddress: mapped.shippingAddress ?? null,
      contactEmail: mapped.contactEmail ?? null,
      instagramUrl: mapped.instagramUrl ?? null,
      youtubeUrl: mapped.youtubeUrl ?? null,
      tiktokUrl: mapped.tiktokUrl ?? null,
      snapchatUrl: mapped.snapchatUrl ?? null,
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
        maxRevisions: p.maxRevisions ?? 2,
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
      avgRating: mapped.stats?.avgRating?.toString() ?? null,
      reviewCount: mapped.stats?.reviewCount ?? 0,
      totalOrders: orderCounts?.totalOrders ?? 0,
      completedOrders: orderCounts?.completedOrders ?? 0,
      topReviews,
    };
  }

  private async countCreatorOrders(creatorProfileId: string): Promise<{
    totalOrders: number;
    completedOrders: number;
  }> {
    const counts = await this.countCreatorOrdersBatch([creatorProfileId]);
    return (
      counts.get(creatorProfileId) ?? { totalOrders: 0, completedOrders: 0 }
    );
  }

  private async countCreatorOrdersBatch(
    creatorProfileIds: string[],
  ): Promise<
    Map<string, { totalOrders: number; completedOrders: number }>
  > {
    const uniqueIds = [...new Set(creatorProfileIds.filter(Boolean))];
    const counts = new Map<
      string,
      { totalOrders: number; completedOrders: number }
    >();
    for (const id of uniqueIds) {
      counts.set(id, { totalOrders: 0, completedOrders: 0 });
    }
    if (uniqueIds.length === 0) {
      return counts;
    }

    const [totalRows, completedRows] = await this.prisma.$transaction([
      this.prisma.order.groupBy({
        by: ['creatorId'],
        where: { creatorId: { in: uniqueIds } },
        _count: { _all: true },
        orderBy: { creatorId: 'asc' },
      }),
      this.prisma.order.groupBy({
        by: ['creatorId'],
        where: {
          creatorId: { in: uniqueIds },
          status: { in: CREATOR_COMPLETED_ORDER_STATUSES },
        },
        _count: { _all: true },
        orderBy: { creatorId: 'asc' },
      }),
    ]);

    for (const row of totalRows) {
      const existing = counts.get(row.creatorId);
      if (existing) {
        existing.totalOrders =
          typeof row._count === 'object' ? (row._count._all ?? 0) : 0;
      }
    }
    for (const row of completedRows) {
      const existing = counts.get(row.creatorId);
      if (existing) {
        existing.completedOrders =
          typeof row._count === 'object' ? (row._count._all ?? 0) : 0;
      }
    }

    return counts;
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
      contactEmail: _contactEmail,
      instagramUrl: _instagramUrl,
      youtubeUrl: _youtubeUrl,
      tiktokUrl: _tiktokUrl,
      snapchatUrl: _snapchatUrl,
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

  // OTP gate temporarily disabled — re-enable before profile edits require verified phone.
  // private async assertPhoneVerifiedForCreator(userId: string): Promise<void> {
  //   const u = await this.prisma.user.findUnique({
  //     where: { id: userId },
  //     select: { phoneVerified: true, phone: true },
  //   });
  //   if (!u?.phoneVerified || !u?.phone?.trim()) {
  //     throw new BadRequestException(
  //       'Verify your mobile number before managing a creator profile.',
  //     );
  //   }
  // }

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

  async listCreatorLanguageOptions(): Promise<CreatorLanguageOptionsResponseDto> {
    const options = await this.prisma.creatorFacetOption.findMany({
      where: { dimension: CreatorFacetDimension.LANGUAGE },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, label: true, sortOrder: true },
    });
    return {
      languages: options.map((o) => ({
        slug: o.slug,
        label: o.label,
        sortOrder: o.sortOrder,
      })),
    };
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

  /**
   * Creates creator profile + CREATOR role inside an existing transaction (signup only).
   * Other profile fields are filled later via updateCreatorProfile.
   */
  async createCreatorProfileInTransaction(
    tx: PrismaTransactionClient,
    userId: string,
    input: CreateCreatorProfileAtSignupInput,
  ): Promise<string> {
    const creatorRole = await tx.role.findUnique({
      where: { name: RoleName.CREATOR },
      select: { id: true },
    });
    if (!creatorRole) {
      throw new NotFoundException('CREATOR role not configured');
    }

    const existing = await tx.creatorProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Creator profile already exists');
    }

    await this.syncUserDisplayName(tx, userId, input.displayName);

    const dateOfBirth = new Date(input.dateOfBirth);
    const facetInputs = input.categorySlugs.map((slug) => ({
      dimension: CreatorFacetDimension.CONTENT_CATEGORY,
      slug,
    }));
    const facetIds = await this.resolveFacetOptionIds(tx, facetInputs);

    const creatorProfile = await tx.creatorProfile.create({
      data: {
        userId,
        displayName: input.displayName.trim(),
        city: input.city.trim(),
        countryName: input.countryName.trim(),
        stateName: input.stateName.trim(),
        bio: input.bio?.trim() || null,
        gender: input.gender,
        dateOfBirth:
          !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
        contactEmail: input.contactEmail.trim(),
        instagramUrl: input.instagramUrl?.trim() || null,
        driveLink: input.driveLink?.trim() || null,
        creatorApproval: {
          create: {},
        },
      },
    });

    await this.replaceFacetSelections(tx, creatorProfile.id, facetIds);

    await tx.userRole.upsert({
      where: { userId_roleId: { userId, roleId: creatorRole.id } },
      create: { userId, roleId: creatorRole.id },
      update: {},
    });

    await tx.user.update({
      where: { id: userId },
      data: { primaryRoleId: creatorRole.id } as any,
    });

    return creatorProfile.id;
  }

  async listCreators(
    query: ListCreatorsQueryDto,
  ): Promise<CreatorsPublicListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 4;
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

    const orderCountsByCreatorId = await this.countCreatorOrdersBatch(
      items.map((profile) => profile.id),
    );

    return {
      items: items.map((p) =>
        this.mapCreatorPublicListItemDto(
          p,
          orderCountsByCreatorId.get(p.id),
        ),
      ),
      total,
      page,
      limit,
    };
  }

  async listSuggestedCreators(
    anchorCreatorId: string,
  ): Promise<SuggestedCreatorsResponseDto> {
    const anchor = await this.prisma.creatorProfile.findUnique({
      where: { id: anchorCreatorId },
      include: {
        creatorApproval: { select: { status: true } },
        facetSelections: {
          where: {
            option: { dimension: CreatorFacetDimension.CONTENT_CATEGORY },
          },
          include: {
            option: { select: { slug: true } },
          },
        },
      },
    });

    if (!anchor) {
      throw new NotFoundException('Creator not found');
    }

    const approvalStatus = anchor.creatorApproval?.status;
    if (approvalStatus !== ApprovalStatus.APPROVED) {
      throw new NotFoundException('Creator not found');
    }

    const categorySlugs = (anchor.facetSelections ?? [])
      .map((row: { option?: { slug?: string } | null }) => row.option?.slug)
      .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0);

    if (categorySlugs.length === 0) {
      return { items: [] };
    }

    const rows = await this.prisma.creatorProfile.findMany({
      where: {
        AND: [
          { id: { not: anchorCreatorId } },
          { creatorApproval: { status: ApprovalStatus.APPROVED } },
          {
            facetSelections: {
              some: {
                option: {
                  dimension: CreatorFacetDimension.CONTENT_CATEGORY,
                  slug: { in: categorySlugs },
                },
              },
            },
          },
        ],
      },
      take: 5,
      orderBy: [{ collaborationCount: 'desc' }, { updatedAt: 'desc' }],
      include: {
        packages: {
          select: { priceAmount: true },
          take: 1,
        },
        facetSelections: {
          where: {
            option: { dimension: CreatorFacetDimension.CONTENT_CATEGORY },
          },
          include: {
            option: { select: { slug: true, label: true } },
          },
        },
        portfolioVideos: {
          where: { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            creatorId: true,
            videoUrl: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    return {
      items: rows.map((p) => this.mapSuggestedCreatorListItemDto(p)),
    };
  }

  private mapSuggestedCreatorListItemDto(profile: any): SuggestedCreatorListItemDto {
    const pkg = Array.isArray(profile.packages) ? profile.packages[0] : null;
    const rawPrice = pkg?.priceAmount;
    let priceAmount: string | null = null;
    if (rawPrice !== undefined && rawPrice !== null) {
      priceAmount =
        typeof rawPrice?.toString === 'function'
          ? rawPrice.toString()
          : String(rawPrice);
    }

    const contentCategories = Array.isArray(profile.facetSelections)
      ? profile.facetSelections
          .map((row: any) => ({
            slug: String(row?.option?.slug ?? ''),
            label: String(row?.option?.label ?? ''),
          }))
          .filter((x: { slug: string }) => x.slug)
      : [];

    const v = Array.isArray(profile.portfolioVideos)
      ? profile.portfolioVideos[0]
      : null;
    const firstPortfolioVideo = v
      ? {
          id: v.id,
          creatorId: v.creatorId,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl ?? null,
        }
      : null;

    return {
      id: profile.id,
      creatorName: String(profile.displayName ?? ''),
      contentCategories,
      priceAmount,
      city: profile.city ?? null,
      firstPortfolioVideo,
    };
  }

  private mapCreatorPublicListItemDto(
    profile: any,
    orderCounts?: { totalOrders: number; completedOrders: number },
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
      introVideoUrl: profile.introVideoUrl ?? null,
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
      restrictions: Array.isArray(profile.restrictions)
        ? profile.restrictions
            .map((r: any) => r?.restriction)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      packages: Array.isArray(profile.packages)
        ? profile.packages.map((pkg: any) => {
          const deliverables = Array.isArray(pkg?.deliverables)
            ? pkg.deliverables
            : [];
          const basicEditing = deliverables.some(
            (d: unknown) => d === 'Basic editing',
          );
            return {
              name: String(pkg?.name ?? ''),
              priceAmount:
                pkg?.priceAmount?.toString?.() ??
                (typeof pkg?.priceAmount === 'string' ? pkg.priceAmount : ''),
              deliveryDays:
                typeof pkg?.deliveryDays === 'number' ? pkg.deliveryDays : 0,
              basicEditing: basicEditing,
            };
          })
        : [],
      portfolioVideos,
      avgRating: profile.stats?.avgRating?.toString() ?? null,
      reviewCount: profile.stats?.reviewCount ?? 0,
      totalOrders: orderCounts?.totalOrders ?? 0,
      completedOrders: orderCounts?.completedOrders ?? 0,
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

    const [orderCounts, topReviews] = await Promise.all([
      this.countCreatorOrders(profile.id),
      this.creatorReviews.listTopForCreator({ creatorId: profile.id }),
    ]);
    const dto = this.mapCreatorProfileResponseDto(
      profile,
      orderCounts,
      topReviews,
    );
    if (isOwner || admin) {
      return dto;
    }
    return this.redactCreatorContactForViewer(dto);
  }

  private mapPendingCreatorApprovalListItem(
    profile: CreatorProfileWithRelations,
  ): PendingCreatorApprovalListItemDto {
    const dob: Date | null = profile.dateOfBirth
      ? new Date(profile.dateOfBirth)
      : null;
    const age =
      dob && !Number.isNaN(dob.getTime()) ? computeAgeYears(dob) : null;

    const contentCategories = (profile.facetSelections ?? [])
      .filter(
        (row: { option?: { dimension?: CreatorFacetDimension } }) =>
          row.option?.dimension === CreatorFacetDimension.CONTENT_CATEGORY,
      )
      .map((row: { option?: { slug?: string; label?: string } }) => ({
        slug: row.option?.slug ?? '',
        label: row.option?.label ?? '',
      }))
      .filter((c: { slug: string }) => c.slug.length > 0);

    const portfolioVideos = (profile.portfolioVideos ?? []).map(
      (v: {
        id: string;
        creatorId: string;
        videoUrl: string;
        thumbnailUrl?: string | null;
        tags?: { tag: string }[];
        createdAt: Date;
      }) => ({
        id: v.id,
        creatorId: v.creatorId,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl ?? null,
        tags: (v.tags ?? []).map((t) => t.tag).filter(Boolean),
        createdAt: v.createdAt,
      }),
    );

    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      phone: profile.user?.phone ?? null,
      phoneVerified: profile.user?.phoneVerified ?? false,
      contactEmail: profile.contactEmail ?? null,
      city: profile.city ?? null,
      stateName: profile.stateName ?? null,
      countryName: profile.countryName ?? null,
      bio: profile.bio ?? null,
      gender: profile.gender ?? null,
      age,
      instagramUrl: profile.instagramUrl ?? null,
      driveLink: profile.driveLink ?? null,
      contentCategories,
      portfolioVideos,
      approvalStatus:
        profile.creatorApproval?.status ?? ApprovalStatus.PENDING,
      submittedAt: profile.createdAt,
    };
  }

  async listPendingCreatorApprovals(query: {
    page?: number;
    limit?: number;
  }): Promise<PendingCreatorsListResponseDto> {
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
        include: pendingCreatorApprovalInclude as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapPendingCreatorApprovalListItem(p)),
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

    this.creatorProfileMail.notifyApproved(creatorProfileId);

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

    this.creatorProfileMail.notifyRejected(creatorProfileId, rejectionReason);

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

    const [orderCounts, topReviews] = await Promise.all([
      this.countCreatorOrders(profile.id),
      this.creatorReviews.listTopForCreator({ creatorId: profile.id }),
    ]);
    return this.mapCreatorProfileResponseDto(profile, orderCounts, topReviews);
  }

  async updateCreatorProfile(
    actingUserId: string,
    creatorProfileId: string,
    dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfileResponseDto> {
    // OTP gate temporarily disabled for creator profile edits — uncomment when re-enabling.
    // const profileForGate = await this.prisma.creatorProfile.findUnique({
    //   where: { id: creatorProfileId },
    //   select: { userId: true },
    // });
    // if (profileForGate?.userId === actingUserId) {
    //   await this.assertPhoneVerifiedForCreator(actingUserId);
    // }

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

        let nextIntroVideoKey: string | null | undefined = undefined;
        let nextIntroVideoUrl: string | null | undefined = undefined;
        if (dto.introVideoKey !== undefined) {
          const trimmed = dto.introVideoKey?.trim();
          if (trimmed) {
            // Profile already exists for this update flow; require a finalized key.
            // The presign endpoint returns a finalized key when profile exists.
            this.assertIntroVideoKeyOwner(creatorProfileId, trimmed);
            nextIntroVideoKey = trimmed;
            nextIntroVideoUrl = this.storage.buildCdnUrl(trimmed);
          } else {
            nextIntroVideoKey = null;
            nextIntroVideoUrl = null;
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
        if (dto.contactEmail !== undefined) {
          const v = dto.contactEmail.trim();
          if (!v) {
            throw new BadRequestException('contactEmail cannot be empty');
          }
          data.contactEmail = v;
        }
        if (dto.instagramUrl !== undefined) {
          data.instagramUrl = dto.instagramUrl?.trim() || null;
        }
        if (dto.youtubeUrl !== undefined) {
          data.youtubeUrl = dto.youtubeUrl?.trim() || null;
        }
        if (dto.tiktokUrl !== undefined) {
          data.tiktokUrl = dto.tiktokUrl?.trim() || null;
        }
        if (dto.snapchatUrl !== undefined) {
          data.snapchatUrl = dto.snapchatUrl?.trim() || null;
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
        if (nextIntroVideoKey !== undefined) {
          data.introVideoKey = nextIntroVideoKey;
          data.introVideoUrl = nextIntroVideoUrl;
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
        // Slug-based update replaces all current add-ons in one go to avoid
        // name-matching issues and keep logic simple.
        await (tx as any).creatorAddOn.deleteMany({
          where: { creatorId: creatorProfileId },
        });

        if (payload.length > 0) {
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
    const rows = await this.prisma.creatorFacetOption.findMany({
      where: { dimension: CreatorFacetDimension.CONTENT_CATEGORY },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, label: true , slug: true},
    });
    return rows.map((r) => ({ id: r.id, name: r.label, slug: r.slug }));
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
