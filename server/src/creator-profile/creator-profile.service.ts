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
  OrderStatus,
  PortfolioVisibilityStatus,
  Prisma,
  PrismaClient,
  RoleName,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCreatorProfileAtSignupInput } from './dto/create-creator-profile-at-signup.input';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { StorageService } from '../storage/storage.service';
import { PresignProfileIntroVideoUploadDto } from './dto/presign-profile-intro-video-upload.dto';
import { PresignProfileImageUploadDto } from './dto/presign-profile-image-upload.dto';
import { CreatorProfileMailNotifier } from '../mail/creator-profile-mail.notifier';
import { MetaCapiService, splitFullName } from '../meta-capi/meta-capi.service';
import { CreatorReviewsService } from '../creator-reviews/creator-reviews.service';
import {
  buildCreatorsContactCsv,
  buildCreatorsContactXlsx,
  buildCreatorsOutreachCsv,
  buildCreatorsOutreachXlsx,
  yesNo,
} from './listed-creators-export.util';
import type { ExportListedCreatorsQueryDto } from './dto/export-listed-creators-query.dto';

import type { CreatorTopReviewDto } from '../creator-reviews/dto/creator-top-review.dto';
import { mapUnavailabilityToPublicAvailability } from './creator-unavailability.util';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import {
  allocateUniqueCreatorPublicSlug,
  normalizeCreatorPublicProfileSlug,
} from './creator-public-slug.util';
import { CreatorsListResponseDto } from './dto/creators-list-response.dto';
import { PendingCreatorApprovalListItemDto } from './dto/pending-creator-approval-list-item.dto';
import { PendingCreatorsListResponseDto } from './dto/pending-creators-list-response.dto';
import { RejectedCreatorApprovalListItemDto } from './dto/rejected-creator-approval-list-item.dto';
import { RejectedCreatorsListResponseDto } from './dto/rejected-creators-list-response.dto';
import { PendingApprovalsQueryDto } from './dto/admin-creator-approval.dto';
import {
  AdminFeatureCreatorDto,
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
  AdminCreatorsListQueryDto,
  AdminCreatorsListResponseDto,
  AdminCreatorSegmentCountsDto,
} from './dto/admin-creator-list.dto';
import type { CreatorsPublicListResponseDto } from './dto/creators-public-list-response.dto';
import type {
  CreatorPublicListItemDto,
  CreatorPublicListPortfolioVideoDto,
} from './dto/creator-public-list-item.dto';
import { CreatorSuggestionItemDto } from './dto/creator-suggestion-item.dto';
import { AddCreatorAddOnsDto } from './dto/add-creator-addons.dto';
import {
  buildAdminCreatorApprovalSearchWhere,
  buildAdminCreatorsListWhere,
  buildCreatorListRelationsInclude,
  buildListCreatorsWhere,
} from './creator-list-filters.util';
import {
  getCreatorOnboardingMode,
  isProfileFirstOnboardingMode,
} from '../config/creator-onboarding-mode';
import { computeAgeGroup, computeAgeYears } from './creator-age.util';
import {
  GO_LIVE_REQUIREMENTS,
  evaluateProfileCompleteness,
  isIdentitySectionComplete,
} from './creator-profile-completeness.util';
import { AdminBuildingProfileAnalyticsDto } from './dto/admin-building-profile-analytics.dto';
import { CreatorFacetOptionsResponseDto } from './dto/creator-facet-options-response.dto';
import { CreatorLanguageOptionsResponseDto } from './dto/creator-language-options-response.dto';
import { CreatorAddOnOptionsResponseDto } from './dto/creator-addon-options-response.dto';
import { recomputeCreatorListingState } from './creator-listing-state.util';
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';
import { creatorPayoutPaiseFromOrderTotal } from '../orders/order-pricing-ledger.util';
import { FacetOtherResolverService } from './facet-other-resolver.service';
import type {
  SuggestedCreatorListItemDto,
  SuggestedCreatorsResponseDto,
} from './dto/suggested-creators-response.dto';

/**
 * Orders counted as successfully completed for creator stats. Paid Out
 * (`CREATOR_PAYMENT_DONE`) is the post-payout successor of `ACCEPTED`, so both
 * must count — otherwise a paid-out order looks like it was never completed.
 */
const CREATOR_COMPLETED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.CREATOR_PAYMENT_DONE,
];

type CreatorOrderCounts = {
  totalOrders: number;
  completedOrders: number;
  /** Sum of creator payouts (paise) on CREATOR_PAYMENT_DONE orders. */
  totalEarningsPaise: number;
};

/**
 * Scalar CreatorProfile columns actually read by mapCreatorPublicListItemDto.
 * Used with `select` (merged with buildCreatorListRelationsInclude's relation
 * keys) instead of `include` in listCreators, so the public browse/search
 * query doesn't pull every CreatorProfile column (payout/meta-attribution
 * fields, etc.) it never uses.
 */
const CREATOR_LIST_BASE_SELECT = {
  id: true,
  displayName: true,
  publicSlug: true,
  introVideoUrl: true,
  profileImageUrl: true,
  city: true,
  countryName: true,
  stateName: true,
  bio: true,
  gender: true,
  dateOfBirth: true,
  contentVolume: true,
  collaborationCount: true,
  onLocationAvailable: true,
} as const;

const creatorProfileWithRelationsInclude = {
  user: { select: { phone: true, phoneVerified: true } },
  facetSelections: { include: { option: true } },
  profileLanguages: { include: { option: true } },
  restrictions: true,
  packages: true,
  addOns: true,
  creatorApproval: true,
  unavailability: { select: { startsOn: true, endsOn: true } },
  portfolioVideos: {
    where: {
      visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      ...playableAssetWhere(),
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  },
  stats: { select: { avgRating: true, reviewCount: true } },
} as const;

function buildActiveFeaturedCreatorWhere(
  baseWhere: Prisma.CreatorProfileWhereInput,
  now: Date,
): Prisma.CreatorProfileWhereInput {
  return {
    AND: [
      baseWhere,
      {
        feature: {
          is: {
            OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
          },
        },
      },
    ],
  };
}

function buildNonFeaturedCreatorWhere(
  baseWhere: Prisma.CreatorProfileWhereInput,
  now: Date,
): Prisma.CreatorProfileWhereInput {
  return {
    AND: [
      baseWhere,
      {
        OR: [
          { feature: { is: null } },
          { feature: { is: { featuredUntil: { lte: now } } } },
        ],
      },
    ],
  };
}

/** Lighter include for admin pending-approval queue (signup fields only). */
const pendingCreatorApprovalInclude = {
  user: { select: { phone: true, phoneVerified: true } },
  facetSelections: { include: { option: true } },
  creatorApproval: true,
  portfolioVideos: {
    where: {
      visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      ...playableAssetWhere(),
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  },
} as const;

/** Include for admin unified creator list (all segments). */
const adminCreatorListInclude = {
  user: { select: { phone: true, phoneVerified: true } },
  facetSelections: { include: { option: true } },
  creatorApproval: true,
  feature: { select: { rank: true, featuredUntil: true } },
  packages: {
    orderBy: { priceAmount: 'asc' as const },
    take: 1,
    select: { priceAmount: true },
  },
  portfolioVideos: {
    where: {
      visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      ...playableAssetWhere(),
    },
    orderBy: { createdAt: 'asc' as const },
    take: 20,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  },
  stats: { select: { avgRating: true, reviewCount: true } },
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
    private readonly metaCapi: MetaCapiService,
    private readonly facetOtherResolver: FacetOtherResolverService,
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

  async presignProfileImageUpload(
    actingUserId: string,
    dto: PresignProfileImageUploadDto,
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
          'Not allowed to upload a profile image for this creator profile.',
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
      kind: 'creator_profile_image',
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

  private assertIntroVideoKeyOwner(
    creatorProfileId: string,
    key: string,
  ): void {
    const prefix = `creator-profile/${creatorProfileId}/intro/`;
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('Invalid introVideoKey');
    }
  }

  private assertProfileImageKeyOwner(
    creatorProfileId: string,
    key: string,
  ): void {
    const prefix = `creator-profile/${creatorProfileId}/profile-image/`;
    if (!key.startsWith(prefix)) {
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
    orderCounts?: CreatorOrderCounts,
    topReviews: CreatorTopReviewDto[] = [],
  ): CreatorProfileResponseDto {
    const mapped = this.mapCreatorProfile(profile);

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
      publicSlug: mapped.publicSlug,
      phone: mapped.user?.phone ?? null,
      phoneVerified: mapped.user?.phoneVerified ?? false,
      introVideoUrl: mapped.introVideoUrl ?? null,
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
      contactEmail: mapped.contactEmail ?? null,
      instagramUrl: mapped.instagramUrl ?? null,
      youtubeUrl: mapped.youtubeUrl ?? null,
      snapchatUrl: mapped.snapchatUrl ?? null,
      contentVolume: mapped.contentVolume ?? null,
      collaborationCount: mapped.collaborationCount ?? 0,
      travelRadius: mapped.travelRadius ?? null,
      onLocationAvailable: mapped.onLocationAvailable,
      approvalStatus: mapped.creatorApproval?.status,
      completeProfile: mapped.completeProfile ?? false,
      isListed: mapped.isListed ?? false,
      rejectionReason: mapped.creatorApproval?.rejectionReason ?? null,
      profileLanguages: (mapped.profileLanguages ?? []).map((row: any) => ({
        id: row.id,
        slug: row.option?.slug ?? '',
        label: row.option?.label ?? '',
      })),
      facetSelections: (mapped.facetSelections ?? []).map((row: any) => ({
        id: row.id,
        dimension: row.option?.dimension,
        slug: row.option?.slug ?? '',
        label: row.option?.label ?? '',
        rank: row.rank ?? 0,
        customLabel: row.customLabel ?? null,
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
      avgRating: mapped.stats?.avgRating?.toString() ?? null,
      reviewCount: mapped.stats?.reviewCount ?? 0,
      totalOrders: orderCounts?.totalOrders ?? 0,
      completedOrders: orderCounts?.completedOrders ?? 0,
      totalEarningsPaise: orderCounts?.totalEarningsPaise ?? 0,
      topReviews,
    };
  }

  private async countCreatorOrders(
    creatorProfileId: string,
  ): Promise<CreatorOrderCounts> {
    const counts = await this.countCreatorOrdersBatch([creatorProfileId]);
    const existing = counts.get(creatorProfileId) ?? {
      totalOrders: 0,
      completedOrders: 0,
      totalEarningsPaise: 0,
    };

    const paidOutRows = await this.prisma.order.findMany({
      where: {
        creatorId: creatorProfileId,
        status: OrderStatus.CREATOR_PAYMENT_DONE,
      },
      select: { expectedAmountPaise: true },
    });
    existing.totalEarningsPaise = paidOutRows.reduce(
      (sum, row) =>
        sum + creatorPayoutPaiseFromOrderTotal(row.expectedAmountPaise),
      0,
    );
    return existing;
  }

  private async countCreatorOrdersBatch(
    creatorProfileIds: string[],
  ): Promise<Map<string, CreatorOrderCounts>> {
    const uniqueIds = [...new Set(creatorProfileIds.filter(Boolean))];
    const counts = new Map<string, CreatorOrderCounts>();
    for (const id of uniqueIds) {
      counts.set(id, {
        totalOrders: 0,
        completedOrders: 0,
        totalEarningsPaise: 0,
      });
    }
    if (uniqueIds.length === 0) {
      return counts;
    }

    // Match the creator orders inbox: unpaid checkout drafts are hidden from
    // the creator, so they must not inflate Total Orders either.
    const visibleOrderWhere = {
      creatorId: { in: uniqueIds },
      status: { not: OrderStatus.PENDING_PAYMENT },
    } as const;

    const [totalRows, completedRows] = await this.prisma.$transaction([
      this.prisma.order.groupBy({
        by: ['creatorId'],
        where: visibleOrderWhere,
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
      snapchatUrl: _snapchatUrl,
      totalEarningsPaise: _totalEarningsPaise,
      ...rest
    } = dto;
    // Brands/public never see the creator's real name — expose the opaque
    // public slug as the identifier instead.
    return {
      ...rest,
      displayName: rest.publicSlug,
    } as CreatorProfileResponseDto;
  }

  private async normalizeCreatorAddOns(
    tx: PrismaTransactionClient,
    addOns: {
      slug: string;
      priceAmount: string;
      description?: string;
    }[],
  ): Promise<
    {
      name: string;
      priceAmount: Prisma.Decimal;
      description: string | null;
    }[]
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
        throw new BadRequestException(
          'Add-on priceAmount must be a whole number.',
        );
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

  /**
   * Sync the profile's contact email to the account login email (User.email).
   * Login looks the account up by lowercased email, so the value is normalized
   * to lowercase. Rejects a value already used by another account (email is
   * unique) and clears emailVerified on change, mirroring the phone sync.
   */
  private async syncUserEmailIfChanged(
    tx: PrismaTransactionClient,
    userId: string,
    email: string,
  ): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if ((current?.email?.trim().toLowerCase() ?? '') === normalized) {
      return;
    }

    const existing = await tx.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'That email is already in use by another account',
      );
    }

    await tx.user.update({
      where: { id: userId },
      data: { email: normalized, emailVerified: false },
    });
  }

  private async resolveFacetSelectionRows(
    tx: PrismaTransactionClient,
    selections: {
      dimension: CreatorFacetDimension;
      slug: string;
      rank?: number;
      customLabel?: string;
    }[],
  ): Promise<{ optionId: string; rank: number; customLabel: string | null }[]> {
    if (!selections.length) return [];

    // Single-select dimensions accept at most one selection.
    const singleSelect = new Set<CreatorFacetDimension>([
      CreatorFacetDimension.CREATOR_TYPE,
      CreatorFacetDimension.OCCUPATION,
      CreatorFacetDimension.APPEARANCE,
    ]);
    const perDimension = new Map<CreatorFacetDimension, number>();
    let nichePrimary = 0;
    let nicheSecondary = 0;

    const seen = new Set<string>();
    const rows: {
      optionId: string;
      rank: number;
      customLabel: string | null;
    }[] = [];

    for (const s of selections) {
      if (s.dimension === CreatorFacetDimension.LANGUAGE) {
        throw new BadRequestException(
          'Use profileLanguages for LANGUAGE options, not facetSelections.',
        );
      }
      const key = `${s.dimension}:${s.slug}`;
      if (seen.has(key)) continue;

      // "Other" carries a free-text label; everything else must not. A blank
      // "Other" (creator picked it but hasn't typed yet on a draft save) is
      // dropped rather than rejected — go-live completeness still catches the
      // resulting missing selection.
      let customLabel: string | null = null;
      if (s.slug === 'other') {
        const trimmed = (s.customLabel ?? '').trim();
        if (!trimmed) continue;
        customLabel = trimmed.slice(0, 40);
      }

      seen.add(key);

      const opt = await tx.creatorFacetOption.findUnique({
        where: { dimension_slug: { dimension: s.dimension, slug: s.slug } },
      });
      if (!opt) {
        throw new BadRequestException(
          `Unknown facet option ${s.dimension} / ${s.slug}`,
        );
      }

      // Rank is only meaningful for the niche dimension; force 0 elsewhere.
      let rank = 0;
      if (s.dimension === CreatorFacetDimension.CONTENT_CATEGORY) {
        rank = s.rank ?? 0;
        if (rank === 0) nichePrimary += 1;
        else nicheSecondary += 1;
      }

      if (singleSelect.has(s.dimension)) {
        const count = (perDimension.get(s.dimension) ?? 0) + 1;
        perDimension.set(s.dimension, count);
        if (count > 1) {
          throw new BadRequestException(
            `Only one ${s.dimension} selection is allowed.`,
          );
        }
      }

      rows.push({ optionId: opt.id, rank, customLabel });
    }

    if (nichePrimary > 1) {
      throw new BadRequestException('Only one primary niche is allowed.');
    }
    if (nicheSecondary > 2) {
      throw new BadRequestException(
        'At most two secondary niches are allowed.',
      );
    }

    return rows;
  }

  private async resolveLanguageRows(
    tx: PrismaTransactionClient,
    inputs: { slug: string }[],
  ): Promise<{ optionId: string }[]> {
    const out: { optionId: string }[] = [];
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
      out.push({ optionId: opt.id });
    }
    return out;
  }

  private async replaceFacetSelections(
    tx: PrismaTransactionClient,
    creatorProfileId: string,
    rows: { optionId: string; rank: number; customLabel: string | null }[],
  ): Promise<void> {
    await tx.creatorProfileFacetSelection.deleteMany({
      where: { creatorProfileId },
    });
    if (rows.length === 0) return;
    await tx.creatorProfileFacetSelection.createMany({
      data: rows.map((r) => ({
        creatorProfileId,
        optionId: r.optionId,
        rank: r.rank,
        customLabel: r.customLabel,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceProfileLanguages(
    tx: PrismaTransactionClient,
    creatorProfileId: string,
    rows: { optionId: string }[],
  ): Promise<void> {
    await tx.creatorProfileLanguage.deleteMany({
      where: { creatorProfileId },
    });
    if (rows.length === 0) return;
    await tx.creatorProfileLanguage.createMany({
      data: rows.map((r) => ({
        creatorProfileId,
        optionId: r.optionId,
      })),
      skipDuplicates: true,
    });
  }

  async listFacetOptions(): Promise<CreatorFacetOptionsResponseDto> {
    const options = await this.prisma.creatorFacetOption.findMany({
      where: { status: 'active' },
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
        mandatory: true,
        fixedPrice: true,
        minPrice: true,
        stepPrice: true,
      },
    });
    return { options };
  }

  /**
   * Creates creator profile + CREATOR role inside an existing transaction (signup only).
   * Profile details (DOB, gender, location, bio, categories, portfolio) are filled
   * later via updateCreatorProfile / Edit Profile.
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

    const account = await tx.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        brandProfile: { select: { id: true } },
      },
    });
    if (
      account?.brandProfile ||
      account?.primaryRole?.name === RoleName.BRAND ||
      account?.primaryRole?.name === RoleName.AGENCY ||
      account?.primaryRole?.name === RoleName.ADMIN
    ) {
      throw new ConflictException(
        'This email is already registered with another account type. Use a different email for a creator account.',
      );
    }

    await this.syncUserDisplayName(tx, userId, input.displayName);

    const publicSlug = await allocateUniqueCreatorPublicSlug(tx);

    const creatorProfile = await tx.creatorProfile.create({
      data: {
        userId,
        displayName: input.displayName.trim(),
        publicSlug,
        contactEmail: input.contactEmail.trim(),
        metaFbp: input.metaFbp?.trim() || null,
        metaFbc: input.metaFbc?.trim() || null,
        metaSignupIp: input.metaSignupIp?.trim() || null,
        metaSignupUserAgent: input.metaSignupUserAgent?.trim() || null,
        emailNotificationsEnabled: true,
        whatsappNotificationsEnabled: true,
        creatorApproval: {
          create: {},
        },
      },
    });

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
    const now = new Date();

    const where = buildListCreatorsWhere(query, { requireApproved: true });
    const include = buildCreatorListRelationsInclude(query);
    const activeFeaturedWhere = buildActiveFeaturedCreatorWhere(where, now);
    const nonFeaturedWhere = buildNonFeaturedCreatorWhere(where, now);

    if (process.env.DEBUG_CREATORS_LIST === '1') {
      this.logger.debug(
        `listCreators query=${JSON.stringify(query)} where=${JSON.stringify(where)}`,
      );
    }

    const [total, featuredTotal] = (await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.count({ where: activeFeaturedWhere }),
    ])) as [number, number];

    const featuredSkip = Math.min(skip, featuredTotal);
    const featuredTake = Math.max(
      0,
      Math.min(limit, featuredTotal - featuredSkip),
    );
    const regularSkip = Math.max(0, skip - featuredTotal);
    const regularTake = Math.max(0, limit - featuredTake);

    const featuredRowsPromise =
      featuredTake > 0
        ? this.prisma.creatorFeature.findMany({
            where: {
              creator: where,
              OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
            },
            take: featuredTake,
            skip: featuredSkip,
            orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
            select: {
              creator: {
                select: { ...CREATOR_LIST_BASE_SELECT, ...include } as any,
              },
            },
          })
        : Promise.resolve([] as Array<{ creator: any | null }>);

    const regularItemsPromise =
      regularTake > 0
        ? this.prisma.creatorProfile.findMany({
            where: nonFeaturedWhere,
            take: regularTake,
            skip: regularSkip,
            orderBy: { createdAt: 'desc' },
            select: { ...CREATOR_LIST_BASE_SELECT, ...include } as any,
          })
        : Promise.resolve([] as any[]);

    const [featuredRows, regularItems] = await Promise.all([
      featuredRowsPromise,
      regularItemsPromise,
    ]);

    const items = [
      ...featuredRows
        .map((row) => row.creator)
        .filter((profile): profile is NonNullable<typeof profile> => !!profile),
      ...regularItems,
    ];

    const orderCountsByCreatorId = await this.countCreatorOrdersBatch(
      items.map((profile) => profile.id),
    );

    const response: CreatorsPublicListResponseDto = {
      items: items.map((p) =>
        this.mapCreatorPublicListItemDto(p, orderCountsByCreatorId.get(p.id)),
      ),
      total,
      page,
      limit,
    };

    return response;
  }

  /** Approved creators only; preserves caller order and skips missing/unapproved ids. */
  async getApprovedPublicListItemsByIds(
    orderedCreatorIds: string[],
  ): Promise<CreatorPublicListItemDto[]> {
    const uniqueIds = [...new Set(orderedCreatorIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const profiles = await this.prisma.creatorProfile.findMany({
      where: {
        id: { in: uniqueIds },
        isListed: true,
      },
      include: creatorProfileWithRelationsInclude as any,
    });

    const byId = new Map(profiles.map((profile) => [profile.id, profile]));
    const orderedProfiles = orderedCreatorIds
      .map((id) => byId.get(id))
      .filter((profile): profile is (typeof profiles)[number] => !!profile);

    const orderCountsByCreatorId = await this.countCreatorOrdersBatch(
      orderedProfiles.map((profile) => profile.id),
    );

    return orderedProfiles.map((profile) =>
      this.mapCreatorPublicListItemDto(
        profile,
        orderCountsByCreatorId.get(profile.id),
      ),
    );
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
      .filter(
        (s: unknown): s is string => typeof s === 'string' && s.length > 0,
      );

    if (categorySlugs.length === 0) {
      return { items: [] };
    }

    const rows = await this.prisma.creatorProfile.findMany({
      where: {
        AND: [
          { id: { not: anchorCreatorId } },
          { isListed: true },
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
          where: {
      visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      ...playableAssetWhere(),
    },
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

  private mapSuggestedCreatorListItemDto(
    profile: any,
  ): SuggestedCreatorListItemDto {
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
      // Opaque handle only — never the creator's real name.
      creatorName: String(profile.publicSlug ?? ''),
      contentCategories,
      priceAmount,
      city: profile.city ?? null,
      firstPortfolioVideo,
    };
  }

  private mapCreatorPublicListItemDto(
    profile: any,
    orderCounts?: CreatorOrderCounts,
  ): CreatorPublicListItemDto {
    const portfolioVideos: CreatorPublicListPortfolioVideoDto[] = Array.isArray(
      profile.portfolioVideos,
    )
      ? profile.portfolioVideos.map((v: any) => ({
          id: v.id,
          creatorId: v.creatorId,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl ?? null,
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

    const availability = mapUnavailabilityToPublicAvailability(
      profile.unavailability ?? null,
    );

    return {
      id: profile.id,
      // Brands see the opaque public slug, never the creator's real name.
      name: profile.publicSlug,
      introVideoUrl: profile.introVideoUrl ?? null,
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
      available: availability.available,
      unavailableFrom: availability.startsOn,
      unavailableTo: availability.endsOn,
    };
  }

  async getCreatorById(
    viewerUserId: string | null,
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
    const isOwner = viewerUserId !== null && profile.userId === viewerUserId;
    const admin =
      viewerUserId !== null && (await this.isAdminUser(viewerUserId));

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

  async getCreatorByPublicSlug(
    viewerUserId: string | null,
    slug: string,
  ): Promise<CreatorProfileResponseDto> {
    const normalized = normalizeCreatorPublicProfileSlug(slug);
    if (!normalized) {
      throw new NotFoundException('Creator not found');
    }

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { publicSlug: normalized },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    return this.getCreatorById(viewerUserId, profile.id);
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
        createdAt: Date;
      }) => ({
        id: v.id,
        creatorId: v.creatorId,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl ?? null,
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
      approvalStatus: profile.creatorApproval?.status ?? ApprovalStatus.PENDING,
      submittedAt: profile.createdAt,
    };
  }

  private mapAdminCreatorListItem(
    profile: CreatorProfileWithRelations,
  ): AdminCreatorListItemDto {
    const base = this.mapPendingCreatorApprovalListItem(profile);
    const startingPkg = profile.packages?.[0];
    const now = new Date();
    const isFeatured =
      !!profile.feature &&
      (!profile.feature.featuredUntil ||
        new Date(profile.feature.featuredUntil).getTime() > now.getTime());

    return {
      ...base,
      profileImageUrl: profile.profileImageUrl ?? null,
      completeProfile: profile.completeProfile ?? false,
      isListed: profile.isListed ?? false,
      isFeatured,
      featureRank: profile.feature?.rank ?? null,
      featuredUntil: profile.feature?.featuredUntil ?? null,
      rejectionReason: profile.creatorApproval?.rejectionReason ?? null,
      rejectedAt:
        base.approvalStatus === ApprovalStatus.REJECTED
          ? (profile.creatorApproval?.approvedAt ?? null)
          : null,
      approvedAt: this.mapAdminListApprovedAt(
        base.approvalStatus,
        profile.creatorApproval,
      ),
      avgRating: profile.stats?.avgRating?.toString() ?? null,
      reviewCount: profile.stats?.reviewCount ?? 0,
      startingPrice: startingPkg?.priceAmount?.toString?.() ?? null,
      onLocationAvailable: !!profile.onLocationAvailable,
    };
  }

  /**
   * Date shown in the admin list. Self-completed rows often have a null
   * approvedAt (we only started stamping it on the completion flip later),
   * so fall back to when the approval row last changed — that's when they
   * actually landed in this segment.
   */
  private mapAdminListApprovedAt(
    status: ApprovalStatus,
    approval: { approvedAt?: Date | null; updatedAt?: Date | null } | null,
  ): Date | null {
    if (
      status === ApprovalStatus.APPROVED ||
      status === ApprovalStatus.SHORTLISTED
    ) {
      return approval?.approvedAt ?? null;
    }
    if (status === ApprovalStatus.SELF_COMPLETED) {
      return approval?.approvedAt ?? approval?.updatedAt ?? null;
    }
    return null;
  }

  private async getAdminCreatorListItemById(
    creatorProfileId: string,
  ): Promise<AdminCreatorListItemDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: adminCreatorListInclude as any,
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }
    return this.mapAdminCreatorListItem(profile);
  }

  async listAdminCreators(
    query: AdminCreatorsListQueryDto,
  ): Promise<AdminCreatorsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    if (query.segment === AdminCreatorListSegment.FEATURED) {
      return this.listFeaturedCreators({
        page,
        limit,
        skip,
        search: query.search,
      });
    }

    const where = buildAdminCreatorsListWhere(query.segment, query.search);

    const orderBy: Prisma.CreatorProfileOrderByWithRelationInput[] =
      query.segment === AdminCreatorListSegment.PENDING
        ? [{ createdAt: 'asc' }]
        : query.segment === AdminCreatorListSegment.NON_APPROVED
          ? [{ creatorApproval: { approvedAt: 'desc' } }]
          : query.segment === AdminCreatorListSegment.SHORTLISTED
            ? [
                {
                  creatorApproval: {
                    approvedAt: { sort: 'desc', nulls: 'last' },
                  },
                },
                { createdAt: 'desc' },
              ]
            : query.segment === AdminCreatorListSegment.SELF_COMPLETED
              ? // Sort by when they actually completed (approval row updates on
                // the PENDING -> SELF_COMPLETED flip). approvedAt is often null
                // for older self-completes, so using it left Aug signups under
                // Jul rows that happened to have a leftover approvedAt.
                [
                  { creatorApproval: { updatedAt: 'desc' } },
                  { createdAt: 'desc' },
                ]
              : query.segment === AdminCreatorListSegment.LISTED
                ? // Newly listed creators must surface first. Sorting by
                  // profile createdAt buried older signups after List.
                  [
                    {
                      creatorApproval: {
                        approvedAt: { sort: 'desc', nulls: 'last' },
                      },
                    },
                    { updatedAt: 'desc' },
                  ]
                : [{ createdAt: 'desc' }];

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy,
        include: adminCreatorListInclude as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapAdminCreatorListItem(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * Export all listed creators (isListed = true) as Excel (.xlsx) or CSV.
   * Columns: Name, Phone, Instagram. No pagination — full listed set.
   */
  async exportListedCreatorsContacts(
    query: ExportListedCreatorsQueryDto,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    const format = query.format ?? 'xlsx';
    const where = buildAdminCreatorsListWhere(
      AdminCreatorListSegment.LISTED,
      query.search,
    );

    const rows = await this.prisma.creatorProfile.findMany({
      where,
      orderBy: { displayName: 'asc' },
      select: {
        displayName: true,
        instagramUrl: true,
        user: { select: { phone: true } },
      },
    });

    const contacts = rows.map((row) => ({
      name: row.displayName,
      phone: row.user?.phone ?? null,
      instagram: row.instagramUrl ?? null,
    }));

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csv = buildCreatorsContactCsv(contacts);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        filename: `listed-creators-${stamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    // `xls` is accepted as an alias for real xlsx (legacy clients).
    const buffer = await buildCreatorsContactXlsx(contacts);
    return {
      buffer,
      filename: `listed-creators-${stamp}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Listed creators missing Instagram, Identity, or both.
   * Columns: Name, Email, Phone, instagramConnected, identityComplete (yes/no).
   */
  async exportListedCreatorsMissingInstagramAndIdentity(
    query: ExportListedCreatorsQueryDto,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    const format = query.format ?? 'xlsx';
    const rows = await this.prisma.creatorProfile.findMany({
      where: { isListed: true },
      orderBy: { displayName: 'asc' },
      select: {
        displayName: true,
        contactEmail: true,
        user: { select: { name: true, email: true, phone: true } },
        socialConnections: {
          where: {
            platform: SocialPlatform.INSTAGRAM,
            status: SocialConnectionStatus.ACTIVE,
          },
          select: { id: true },
        },
        facetSelections: {
          select: {
            rank: true,
            option: { select: { dimension: true } },
          },
        },
      },
    });

    const contacts = rows.flatMap((row) => {
      const instagramConnected = row.socialConnections.length > 0;
      const identityComplete = isIdentitySectionComplete({
        selectedFacetDimensions: row.facetSelections.map(
          (selection) => selection.option.dimension,
        ),
        nichePrimaryCount: row.facetSelections.filter(
          (s) =>
            s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
            s.rank === 0,
        ).length,
        nicheSecondaryCount: row.facetSelections.filter(
          (s) =>
            s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
            s.rank > 0,
        ).length,
      });
      if (instagramConnected && identityComplete) return [];
      return [
        {
          name: row.displayName || row.user?.name || '',
          email: row.contactEmail?.trim() || row.user?.email || null,
          phone: row.user?.phone ?? null,
          instagramConnected: yesNo(instagramConnected),
          identityComplete: yesNo(identityComplete),
        },
      ];
    });

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csv = buildCreatorsOutreachCsv(contacts);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        filename: `listed-missing-instagram-identity-${stamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    const buffer = await buildCreatorsOutreachXlsx(contacts);
    return {
      buffer,
      filename: `listed-missing-instagram-identity-${stamp}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async featureCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
    dto: AdminFeatureCreatorDto,
  ): Promise<AdminCreatorListItemDto> {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, isListed: true },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    if (!creator.isListed) {
      throw new BadRequestException('Only listed creators can be featured');
    }

    const featuredUntil = dto.featuredUntil
      ? new Date(dto.featuredUntil)
      : null;
    if (featuredUntil && Number.isNaN(featuredUntil.getTime())) {
      throw new BadRequestException('featuredUntil must be a valid ISO date');
    }

    await this.prisma.creatorFeature.upsert({
      where: { creatorId: creatorProfileId },
      create: {
        creatorId: creatorProfileId,
        rank: dto.rank ?? 0,
        featuredUntil,
        featuredById: adminUserId,
      },
      update: {
        rank: dto.rank ?? 0,
        featuredUntil,
        featuredById: adminUserId,
      },
    });

    return this.getAdminCreatorListItemById(creatorProfileId);
  }

  async unfeatureCreatorProfile(creatorProfileId: string): Promise<void> {
    await this.prisma.creatorFeature.deleteMany({
      where: { creatorId: creatorProfileId },
    });
  }

  private async listFeaturedCreators(query: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
  }): Promise<AdminCreatorsListResponseDto> {
    const { page, limit, skip } = query;
    const now = new Date();

    const searchClause = query.search?.trim()
      ? {
          displayName: {
            contains: query.search.trim(),
            mode: 'insensitive' as const,
          },
        }
      : {};

    const where = {
      creator: {
        isListed: true,
        ...searchClause,
      },
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.creatorFeature.count({ where }),
      this.prisma.creatorFeature.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
        select: {
          creator: { include: adminCreatorListInclude as any },
        },
      }),
    ]);

    const items = rows
      .map((row) => row.creator)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((p) => this.mapAdminCreatorListItem(p));

    return { items, total, page, limit };
  }

  async getAdminCreatorSegmentCounts(): Promise<AdminCreatorSegmentCountsDto> {
    const segments = [
      AdminCreatorListSegment.PENDING,
      AdminCreatorListSegment.APPROVED,
      AdminCreatorListSegment.NON_APPROVED,
      AdminCreatorListSegment.INCOMPLETE,
      AdminCreatorListSegment.SHORTLISTED,
      AdminCreatorListSegment.SELF_COMPLETED,
      AdminCreatorListSegment.LISTED,
    ] as const;

    const now = new Date();

    const [counts, featuredCount] = await Promise.all([
      this.prisma.$transaction(
        segments.map((segment) =>
          this.prisma.creatorProfile.count({
            where: buildAdminCreatorsListWhere(segment),
          }),
        ),
      ),
      this.prisma.creatorFeature.count({
        where: {
          creator: { isListed: true },
          OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }],
        },
      }),
    ]);

    return {
      pending: counts[0],
      approved: counts[1],
      nonApproved: counts[2],
      incomplete: counts[3],
      shortlisted: counts[4],
      selfCompleted: counts[5],
      listed: counts[6],
      featured: featuredCount,
    };
  }

  /**
   * Analytics for the admin "Building profile" segment: for every profile that
   * has not yet gone live (completeProfile = false, matching the INCOMPLETE
   * segment), tally how many are still missing each Go-Live requirement.
   *
   * Reuses `evaluateProfileCompleteness` — the single source of truth for what
   * "complete" means — so the counts never drift from the go-live checklist.
   */
  async getBuildingProfileAnalytics(): Promise<AdminBuildingProfileAnalyticsDto> {
    const where = buildAdminCreatorsListWhere(
      AdminCreatorListSegment.INCOMPLETE,
    );

    const profiles = await this.prisma.creatorProfile.findMany({
      where,
      select: {
        profileImageUrl: true,
        introVideoUrl: true,
        displayName: true,
        contactEmail: true,
        bio: true,
        countryName: true,
        stateName: true,
        city: true,
        gender: true,
        dateOfBirth: true,
        shippingAddress: true,
        facetSelections: {
          select: { rank: true, option: { select: { dimension: true } } },
        },
        restrictions: { select: { id: true } },
        profileLanguages: { select: { id: true } },
        packages: { select: { id: true } },
        addOns: { select: { name: true } },
        portfolioVideos: {
          where: {
      visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      ...playableAssetWhere(),
    },
          select: { id: true },
        },
        socialConnections: {
          where: {
            platform: SocialPlatform.INSTAGRAM,
            status: SocialConnectionStatus.ACTIVE,
          },
          select: { id: true },
        },
      },
    });

    const mandatoryOptions = await (
      this.prisma as any
    ).creatorAddOnOption.findMany({
      where: { mandatory: true },
      select: { name: true },
    });
    const mandatoryAddOnNames: string[] = mandatoryOptions.map(
      (o: { name: string }) => o.name,
    );

    const totalProfiles = profiles.length;
    const missingByLabel = new Map<string, number>();

    for (const profile of profiles) {
      const { missing } = evaluateProfileCompleteness({
        profileImageUrl: profile.profileImageUrl,
        introVideoUrl: profile.introVideoUrl,
        displayName: profile.displayName,
        contactEmail: profile.contactEmail,
        bio: profile.bio,
        countryName: profile.countryName,
        stateName: profile.stateName,
        city: profile.city,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth,
        shippingAddress: profile.shippingAddress,
        selectedFacetDimensions: profile.facetSelections.map(
          (selection) => selection.option.dimension,
        ),
        nichePrimaryCount: profile.facetSelections.filter(
          (s) =>
            s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
            s.rank === 0,
        ).length,
        nicheSecondaryCount: profile.facetSelections.filter(
          (s) =>
            s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
            s.rank > 0,
        ).length,
        restrictionCount: profile.restrictions.length,
        languageCount: profile.profileLanguages.length,
        packageCount: profile.packages.length,
        publicVideoCount: profile.portfolioVideos.length,
        mandatoryAddOnsPriced: mandatoryAddOnNames.every((name) =>
          profile.addOns.some((addOn) => addOn.name === name),
        ),
        instagramConnected: profile.socialConnections.length > 0,
      });

      for (const label of missing) {
        missingByLabel.set(label, (missingByLabel.get(label) ?? 0) + 1);
      }
    }

    const fields = GO_LIVE_REQUIREMENTS.map((requirement) => {
      const incompleteCount = missingByLabel.get(requirement.label) ?? 0;
      return {
        key: requirement.key,
        label: requirement.label,
        incompleteCount,
        percentage:
          totalProfiles === 0
            ? 0
            : Math.round((incompleteCount / totalProfiles) * 100),
      };
    }).sort((a, b) => b.incompleteCount - a.incompleteCount);

    return { totalProfiles, fields };
  }

  async listPendingCreatorApprovals(
    query: PendingApprovalsQueryDto,
  ): Promise<PendingCreatorsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const searchClause = buildAdminCreatorApprovalSearchWhere(query.search);
    const where: Prisma.CreatorProfileWhereInput = {
      AND: [
        { creatorApproval: { status: ApprovalStatus.PENDING } },
        ...(searchClause ? [searchClause] : []),
      ],
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

  private mapRejectedCreatorApprovalListItem(
    profile: CreatorProfileWithRelations,
  ): RejectedCreatorApprovalListItemDto {
    const base = this.mapPendingCreatorApprovalListItem(profile);
    return {
      ...base,
      approvalStatus: ApprovalStatus.REJECTED,
      rejectionReason: profile.creatorApproval?.rejectionReason ?? null,
      rejectedAt: profile.creatorApproval?.approvedAt ?? null,
    };
  }

  async listRejectedCreatorApprovals(
    query: PendingApprovalsQueryDto,
  ): Promise<RejectedCreatorsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const searchClause = buildAdminCreatorApprovalSearchWhere(query.search);
    const where: Prisma.CreatorProfileWhereInput = {
      AND: [
        { creatorApproval: { status: ApprovalStatus.REJECTED } },
        ...(searchClause ? [searchClause] : []),
      ],
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          creatorApproval: { approvedAt: 'desc' },
        },
        include: pendingCreatorApprovalInclude as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapRejectedCreatorApprovalListItem(p)),
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
      select: {
        id: true,
        completeProfile: true,
        creatorApproval: { select: { status: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    if (profile.creatorApproval?.status === ApprovalStatus.SHORTLISTED) {
      throw new BadRequestException(
        'Shortlisted creators cannot be approved until they complete their profile and enter awaiting review',
      );
    }

    if (profile.creatorApproval?.status === ApprovalStatus.SELF_COMPLETED) {
      throw new BadRequestException(
        'Self completed profiles must be sent for review before they can be listed',
      );
    }

    const alreadyApproved =
      profile.creatorApproval?.status === ApprovalStatus.APPROVED &&
      profile.completeProfile;

    if (
      !alreadyApproved &&
      isProfileFirstOnboardingMode(process.env.CREATOR_ONBOARDING_MODE)
    ) {
      const status = profile.creatorApproval?.status;
      const canListFromReview =
        (status === ApprovalStatus.PENDING || status == null) &&
        profile.completeProfile;
      const canListFromRejected =
        status === ApprovalStatus.REJECTED && profile.completeProfile;
      if (!canListFromReview && !canListFromRejected) {
        throw new BadRequestException(
          'Only profiles in Awaiting review can be listed',
        );
      }
    }

    const listingState = await this.prisma.$transaction(async (tx) => {
      await tx.creatorApproval.upsert({
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

      // Approval can flip isListed true (if the profile is already complete).
      return recomputeCreatorListingState(tx, creatorProfileId);
    });

    // Fire the Meta "listed" conversion only on the isListed false -> true
    // transition, so re-approving an already-listed creator doesn't re-count.
    if (listingState?.becameListed) {
      void this.fireCreatorListedMetaEvent(creatorProfileId);
    }

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }

    this.logger.log(
      `[admin-action] APPROVE creator=${creatorProfileId} by admin=${adminUserId} ` +
        `from=${profile.creatorApproval?.status ?? 'none'} to=${ApprovalStatus.APPROVED} ` +
        `isListed=${listingState?.isListed ?? false} becameListed=${listingState?.becameListed ?? false}`,
    );

    this.creatorProfileMail.notifyApproved(creatorProfileId);

    return this.mapCreatorProfileResponseDto(updated);
  }

  async shortlistCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        id: true,
        completeProfile: true,
        creatorApproval: { select: { status: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }
    if (profile.completeProfile) {
      throw new BadRequestException(
        'Only incomplete (building) profiles can be shortlisted',
      );
    }

    const status = profile.creatorApproval?.status ?? ApprovalStatus.PENDING;
    if (status === ApprovalStatus.REJECTED) {
      throw new BadRequestException(
        'Rejected creators cannot be shortlisted — shortlist only from Building profile',
      );
    }
    if (status === ApprovalStatus.SHORTLISTED) {
      throw new BadRequestException('Creator is already shortlisted');
    }
    if (
      status !== ApprovalStatus.PENDING &&
      status !== ApprovalStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only building-profile creators can be shortlisted',
      );
    }

    await this.prisma.creatorApproval.upsert({
      where: { creatorId: creatorProfileId },
      create: {
        creatorId: creatorProfileId,
        status: ApprovalStatus.SHORTLISTED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        wasShortlisted: true,
      },
      update: {
        status: ApprovalStatus.SHORTLISTED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
        wasShortlisted: true,
      },
    });

    await recomputeCreatorListingState(this.prisma, creatorProfileId);

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }

    this.logger.log(
      `[admin-action] SHORTLIST creator=${creatorProfileId} by admin=${adminUserId} ` +
        `from=${status} to=${ApprovalStatus.SHORTLISTED}`,
    );

    return this.mapCreatorProfileResponseDto(updated);
  }

  async unshortlistCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        id: true,
        creatorApproval: { select: { status: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }
    if (profile.creatorApproval?.status !== ApprovalStatus.SHORTLISTED) {
      throw new BadRequestException('Creator is not shortlisted');
    }

    // profile_first Building = PENDING incomplete; approval_first Incomplete = APPROVED incomplete
    const unshortlistedStatus =
      getCreatorOnboardingMode(process.env.CREATOR_ONBOARDING_MODE) ===
      'profile_first'
        ? ApprovalStatus.PENDING
        : ApprovalStatus.APPROVED;

    await this.prisma.creatorApproval.update({
      where: { creatorId: creatorProfileId },
      data: {
        status: unshortlistedStatus,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
        wasShortlisted: false,
      },
    });

    await recomputeCreatorListingState(this.prisma, creatorProfileId);

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }

    this.logger.log(
      `[admin-action] UNSHORTLIST creator=${creatorProfileId} by admin=${adminUserId} ` +
        `from=${ApprovalStatus.SHORTLISTED} to=${unshortlistedStatus} ` +
        `(back to Building profile)`,
    );

    return this.mapCreatorProfileResponseDto(updated);
  }

  /**
   * Move a self completed profile into the review queue (SELF_COMPLETED ->
   * PENDING), the admin's explicit "Send for review" action.
   *
   * This is the only way out of Self complete other than a rejection: approval
   * is blocked while the status is SELF_COMPLETED, so every self-completing
   * creator is looked at once before they can be listed. No email is sent.
   */
  async sendCreatorProfileForReview(
    adminUserId: string,
    creatorProfileId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        id: true,
        creatorApproval: { select: { status: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }
    if (profile.creatorApproval?.status !== ApprovalStatus.SELF_COMPLETED) {
      throw new BadRequestException(
        'Only self completed profiles can be sent for review',
      );
    }

    await this.prisma.creatorApproval.update({
      where: { creatorId: creatorProfileId },
      data: {
        status: ApprovalStatus.PENDING,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    // PENDING is not a listing status, so this cannot flip isListed — recompute
    // anyway so the denormalized flags can never drift from the approval row.
    await recomputeCreatorListingState(this.prisma, creatorProfileId);

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }

    this.logger.log(
      `[admin-action] SEND_FOR_REVIEW creator=${creatorProfileId} by admin=${adminUserId} ` +
        `from=${ApprovalStatus.SELF_COMPLETED} to=${ApprovalStatus.PENDING} (moved into Awaiting review)`,
    );

    return this.mapCreatorProfileResponseDto(updated);
  }

  /**
   * Send the Meta "CreatorProfileListed" conversion via the Conversions API,
   * replaying the creator's own signup attribution (fbp/fbc/ip/ua) plus hashed
   * email/phone. Best-effort and fire-and-forget: never blocks or fails the
   * approval. No-op when Meta CAPI is not configured.
   */
  private async fireCreatorListedMetaEvent(
    creatorProfileId: string,
  ): Promise<void> {
    if (!this.metaCapi.enabled) return;
    try {
      const creator = await this.prisma.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        select: {
          contactEmail: true,
          displayName: true,
          city: true,
          stateName: true,
          countryName: true,
          publicSlug: true,
          metaFbp: true,
          metaFbc: true,
          metaSignupIp: true,
          metaSignupUserAgent: true,
          user: { select: { email: true, phone: true } },
        },
      });
      if (!creator) return;

      await this.metaCapi.sendEvent({
        eventName: 'CreatorProfileListed',
        eventId: `creator-listed-${creatorProfileId}`,
        userData: {
          email: creator.contactEmail ?? creator.user?.email ?? null,
          phone: creator.user?.phone ?? null,
          ...splitFullName(creator.displayName),
          city: creator.city,
          state: creator.stateName,
          country: creator.countryName,
          fbp: creator.metaFbp,
          fbc: creator.metaFbc,
          clientIpAddress: creator.metaSignupIp,
          clientUserAgent: creator.metaSignupUserAgent,
        },
        customData: { content_name: 'creator_profile_listed' },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send CreatorProfileListed Meta event for ${creatorProfileId}: ${(error as Error).message}`,
      );
    }
  }

  async rejectCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
    rejectionReason?: string | null,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, creatorApproval: { select: { status: true } } },
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

    // Rejection must clear isListed so the creator drops out of discovery.
    await recomputeCreatorListingState(this.prisma, creatorProfileId);

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }

    this.logger.log(
      `[admin-action] REJECT creator=${creatorProfileId} by admin=${adminUserId} ` +
        `from=${profile.creatorApproval?.status ?? 'none'} to=${ApprovalStatus.REJECTED} ` +
        `hasReason=${Boolean(rejectionReason?.trim())}`,
    );

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

    // Resolve any free-text "Other" facet selections to canonical options BEFORE
    // the transaction (it makes network/LLM calls): "Other" becomes a real slug
    // (matched or newly created), a kept generic "other", or is dropped. This is
    // the only place a creator's typed value is written to the shared catalog —
    // and only when they actually save.
    const resolvedFacetSelections =
      dto.facetSelections !== undefined
        ? await this.facetOtherResolver.resolveSelectionsForPersist(
            creatorProfileId,
            dto.facetSelections,
          )
        : undefined;

    const { response, becameListed } = await this.prisma.$transaction(
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

        if (dto.contactEmail !== undefined) {
          await this.syncUserEmailIfChanged(tx, profile.userId, dto.contactEmail);
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

        if (resolvedFacetSelections !== undefined) {
          const facetRows = await this.resolveFacetSelectionRows(
            tx,
            resolvedFacetSelections,
          );
          await this.replaceFacetSelections(tx, creatorProfileId, facetRows);
        }

        if (dto.profileLanguages !== undefined) {
          const langRows = await this.resolveLanguageRows(
            tx,
            dto.profileLanguages,
          );
          await this.replaceProfileLanguages(tx, creatorProfileId, langRows);
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

        // Latch completeProfile / recompute isListed after all writes land.
        // Only an explicit Go Live (dto.goLive) may flip completeProfile to
        // true; a draft save persists data without publishing.
        const listingState = await recomputeCreatorListingState(
          tx,
          creatorProfileId,
          dto.goLive === true,
        );

        const updated = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: creatorProfileWithRelationsInclude as any,
        });

        if (!updated) {
          throw new Error('Creator profile update failed');
        }

        return {
          response: this.mapCreatorProfileResponseDto(updated),
          becameListed: listingState?.becameListed === true,
        };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    // Fire the Meta "listed" conversion after the transaction commits, only on
    // the isListed false -> true transition (e.g. a creator completing their
    // profile after an earlier admin approval). Best-effort / fire-and-forget.
    if (becameListed) {
      void this.fireCreatorListedMetaEvent(creatorProfileId);
    }

    return response;
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
      select: { id: true, label: true, slug: true },
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
